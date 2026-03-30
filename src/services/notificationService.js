import db from '../utils/db.js';
import logger from '../utils/logger.js';
import { publishNotificationEvent } from './kafka/kafkaService.js';

export const NOTIFICATION_TYPES = {
  ALERT_CREATED: 'alert_created',
  INCIDENT_CREATED: 'incident_created',
  INCIDENT_STATUS_CHANGED: 'incident_status_changed',
  INCIDENT_ASSIGNED: 'incident_assigned'
};

const NOTIFICATION_TYPE_TO_SETTING_FIELD = {
  [NOTIFICATION_TYPES.ALERT_CREATED]: 'alert_created_enabled',
  [NOTIFICATION_TYPES.INCIDENT_CREATED]: 'incident_created_enabled',
  [NOTIFICATION_TYPES.INCIDENT_STATUS_CHANGED]: 'incident_status_changed_enabled',
  [NOTIFICATION_TYPES.INCIDENT_ASSIGNED]: 'incident_assigned_enabled'
};

const ALLOWED_NOTIFICATION_TYPES = new Set(Object.values(NOTIFICATION_TYPES));
const ALLOWED_ENTITY_TYPES = new Set(['alert', 'incident']);


const NOTIFICATION_TYPE_TO_EVENT_TYPE = {
  [NOTIFICATION_TYPES.ALERT_CREATED]: 'notification.alert_created',
  [NOTIFICATION_TYPES.INCIDENT_CREATED]: 'notification.incident_created',
  [NOTIFICATION_TYPES.INCIDENT_STATUS_CHANGED]: 'notification.incident_status_changed',
  [NOTIFICATION_TYPES.INCIDENT_ASSIGNED]: 'notification.incident_assigned'
};


const run = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function onRun(err) {
    if (err) {
      reject(err);
      return;
    }

    resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const get = (query, params = []) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(row ?? null);
  });
});

const all = (query, params = []) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(rows);
  });
});

const nowIso = () => new Date().toISOString();

const normalizeBoolean = (value) => Number(value) === 1;

const normalizeNotification = (row) => ({
  id: Number(row.id),
  user_id: Number(row.user_id),
  type: row.type,
  title: row.title,
  message: row.message,
  entity_type: row.entity_type ?? null,
  entity_id: row.entity_id === null ? null : Number(row.entity_id),
  is_read: normalizeBoolean(row.is_read),
  created_at: row.created_at,
  read_at: row.read_at ?? null
});

const normalizeSettings = (row, userId) => ({
  user_id: Number(userId),
  in_app_enabled: normalizeBoolean(row.in_app_enabled),
  alert_created_enabled: normalizeBoolean(row.alert_created_enabled),
  incident_created_enabled: normalizeBoolean(row.incident_created_enabled),
  incident_status_changed_enabled: normalizeBoolean(row.incident_status_changed_enabled),
  incident_assigned_enabled: normalizeBoolean(row.incident_assigned_enabled),
  created_at: row.created_at,
  updated_at: row.updated_at
});

const createDefaultSettingsForUser = async (userId) => {
  const timestamp = nowIso();
  await run(
    `INSERT OR IGNORE INTO notification_settings (
      user_id,
      in_app_enabled,
      alert_created_enabled,
      incident_created_enabled,
      incident_status_changed_enabled,
      incident_assigned_enabled,
      created_at,
      updated_at
    ) VALUES (?, 1, 1, 1, 1, 1, ?, ?)`,
    [userId, timestamp, timestamp]
  );
};

const getSettingsRow = async (userId) => get(
  `SELECT user_id, in_app_enabled, alert_created_enabled, incident_created_enabled, incident_status_changed_enabled, incident_assigned_enabled, created_at, updated_at
   FROM notification_settings
   WHERE user_id = ?`,
  [userId]
);

const ensureSettings = async (userId) => {
  await createDefaultSettingsForUser(userId);
  const row = await getSettingsRow(userId);
  return normalizeSettings(row, userId);
};

const isEnabledForType = (settings, type) => {
  const settingField = NOTIFICATION_TYPE_TO_SETTING_FIELD[type];
  if (!settingField) {
    return false;
  }

  return Boolean(settings.in_app_enabled && settings[settingField]);
};

export const createNotification = async ({ user_id, type, title, message, entity_type = null, entity_id = null }) => {
  if (!Number.isInteger(Number(user_id)) || Number(user_id) <= 0) {
    throw new Error('Некорректный user_id для уведомления');
  }

  if (!ALLOWED_NOTIFICATION_TYPES.has(type)) {
    throw new Error('Некорректный type уведомления');
  }

  if (!title || !String(title).trim()) {
    throw new Error('title обязателен');
  }

  if (!message || !String(message).trim()) {
    throw new Error('message обязателен');
  }

  if (entity_type !== null && !ALLOWED_ENTITY_TYPES.has(entity_type)) {
    throw new Error('entity_type должен быть alert или incident');
  }

  if (entity_id !== null && (!Number.isInteger(Number(entity_id)) || Number(entity_id) <= 0)) {
    throw new Error('entity_id должен быть целым числом > 0');
  }

  const settings = await ensureSettings(Number(user_id));
  if (!isEnabledForType(settings, type)) {
    return null;
  }

  const createdAt = nowIso();
  const result = await run(
    `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, is_read, created_at, read_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL)`,
    [Number(user_id), type, String(title).trim(), String(message).trim(), entity_type, entity_id, createdAt]
  );

  const row = await get(
    `SELECT id, user_id, type, title, message, entity_type, entity_id, is_read, created_at, read_at
     FROM notifications
     WHERE id = ? AND user_id = ?`,
    [result.lastID, Number(user_id)]
  );

  const notification = normalizeNotification(row);
  const eventType = NOTIFICATION_TYPE_TO_EVENT_TYPE[notification.type] ?? `notification.${notification.type}`;

  await publishNotificationEvent({
    event_type: eventType,
    notification_id: notification.id,
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    entity_type: notification.entity_type,
    entity_id: notification.entity_id,
    created_at: notification.created_at
  }).catch((error) => {
    logger.error(`Failed to publish notification ${notification.id} event: ${error.message}`);
  });

  return notification;
};

export const listNotifications = async (userId, filters = {}) => {
  const clauses = ['user_id = ?'];
  const params = [Number(userId)];

  if (filters.is_read !== undefined) {
    clauses.push('is_read = ?');
    params.push(filters.is_read ? 1 : 0);
  }

  if (filters.type !== undefined) {
    clauses.push('type = ?');
    params.push(filters.type);
  }

  let limitClause = '';
  if (filters.limit !== undefined) {
    limitClause = ' LIMIT ?';
    params.push(Number(filters.limit));
  }

  const rows = await all(
    `SELECT id, user_id, type, title, message, entity_type, entity_id, is_read, created_at, read_at
     FROM notifications
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC${limitClause}`,
    params
  );

  return rows.map(normalizeNotification);
};

export const markNotificationAsRead = async (notificationId, userId) => {
  const existing = await get(
    `SELECT id, is_read
     FROM notifications
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );

  if (!existing) {
    return null;
  }

  if (Number(existing.is_read) === 1) {
    const alreadyRead = await get(
      `SELECT id, user_id, type, title, message, entity_type, entity_id, is_read, created_at, read_at
       FROM notifications
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
    return normalizeNotification(alreadyRead);
  }

  const readAt = nowIso();
  await run(
    `UPDATE notifications
     SET is_read = 1, read_at = ?
     WHERE id = ? AND user_id = ?`,
    [readAt, notificationId, userId]
  );

  const updated = await get(
    `SELECT id, user_id, type, title, message, entity_type, entity_id, is_read, created_at, read_at
     FROM notifications
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );

  return normalizeNotification(updated);
};

export const markAllNotificationsAsRead = async (userId) => {
  const readAt = nowIso();

  const result = await run(
    `UPDATE notifications
     SET is_read = 1, read_at = COALESCE(read_at, ?)
     WHERE user_id = ? AND is_read = 0`,
    [readAt, userId]
  );

  return { updated: Number(result.changes) };
};

export const getUnreadNotificationsCount = async (userId) => {
  const row = await get(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE user_id = ? AND is_read = 0`,
    [userId]
  );

  return Number(row?.count ?? 0);
};

export const getNotificationSettings = async (userId) => ensureSettings(Number(userId));

export const updateNotificationSettings = async (userId, payload = {}) => {
  const allowedFields = [
    'in_app_enabled',
    'alert_created_enabled',
    'incident_created_enabled',
    'incident_status_changed_enabled',
    'incident_assigned_enabled'
  ];

  const updates = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates[field] = payload[field] ? 1 : 0;
    }
  }

  await ensureSettings(Number(userId));

  if (Object.keys(updates).length === 0) {
    return getNotificationSettings(Number(userId));
  }

  const assignments = Object.keys(updates).map((field) => `${field} = ?`);
  const values = Object.keys(updates).map((field) => updates[field]);

  await run(
    `UPDATE notification_settings
     SET ${assignments.join(', ')}, updated_at = ?
     WHERE user_id = ?`,
    [...values, nowIso(), Number(userId)]
  );

  return getNotificationSettings(Number(userId));
};

export const notifyAlertCreated = async (alert, userId) => createNotification({
  user_id: Number(userId),
  type: NOTIFICATION_TYPES.ALERT_CREATED,
  title: 'Создан новый алерт',
  message: `Алерт: "${alert.title}". Severity: ${alert.severity}. Источник: ${alert.source_type} #${alert.source_id}.`,
  entity_type: 'alert',
  entity_id: Number(alert.id)
});

export const notifyIncidentCreated = async (incident, userId) => createNotification({
  user_id: Number(userId),
  type: NOTIFICATION_TYPES.INCIDENT_CREATED,
  title: 'Создан инцидент',
  message: `Инцидент: "${incident.title}". Связанный alert_id: ${incident.alert_id ?? '—'}.`,
  entity_type: 'incident',
  entity_id: Number(incident.id)
});

export const notifyIncidentStatusChanged = async (incident, oldStatus, newStatus, userId) => {
  if (oldStatus === newStatus) {
    return null;
  }

  return createNotification({
    user_id: Number(userId),
    type: NOTIFICATION_TYPES.INCIDENT_STATUS_CHANGED,
    title: 'Изменён статус инцидента',
    message: `Инцидент: "${incident.title}". Статус: ${oldStatus} → ${newStatus}.`,
    entity_type: 'incident',
    entity_id: Number(incident.id)
  });
};

export const notifyIncidentAssigned = async (incident, assigneeUserId) => {
  const normalizedAssignee = assigneeUserId === null ? null : Number(assigneeUserId);
  if (!normalizedAssignee || !Number.isInteger(normalizedAssignee) || normalizedAssignee <= 0) {
    return null;
  }

  if (normalizedAssignee === Number(incident.owner_user_id)) {
    return null;
  }

  return createNotification({
    user_id: normalizedAssignee,
    type: NOTIFICATION_TYPES.INCIDENT_ASSIGNED,
    title: 'Вам назначен инцидент',
    message: `Инцидент: "${incident.title}". Priority: ${incident.priority}. Текущий статус: ${incident.status}.`,
    entity_type: 'incident',
    entity_id: Number(incident.id)
  });
};
