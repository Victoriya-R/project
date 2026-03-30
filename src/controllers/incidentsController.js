import db from '../utils/db.js';
import logger from '../utils/logger.js';
import { notifyIncidentAssigned, notifyIncidentCreated, notifyIncidentStatusChanged } from '../services/notificationService.js';

const INCIDENT_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
const INCIDENT_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);

const getOwnerUserId = (req) => Number(req.user?.userId);

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

const normalizeIncident = (row) => ({
  id: Number(row.id),
  title: row.title,
  description: row.description ?? null,
  priority: row.priority,
  status: row.status,
  alert_id: row.alert_id === null ? null : Number(row.alert_id),
  assignee_user_id: row.assignee_user_id === null ? null : Number(row.assignee_user_id),
  owner_user_id: Number(row.owner_user_id),
  resolution_comment: row.resolution_comment ?? null,
  created_at: row.created_at,
  updated_at: row.updated_at,
  resolved_at: row.resolved_at ?? null
});

const buildValidationError = (message) => ({ error: message });

const normalizeOptionalInteger = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return { error: true };
  }

  return normalized;
};

const validateCreatePayload = (payload = {}) => {
  const title = String(payload.title ?? '').trim();
  const description = payload.description === undefined || payload.description === null
    ? null
    : String(payload.description).trim();
  const priority = String(payload.priority ?? '').trim();
  const status = payload.status === undefined ? 'open' : String(payload.status).trim();
  const resolutionComment = payload.resolution_comment === undefined || payload.resolution_comment === null
    ? null
    : String(payload.resolution_comment).trim();
  const alertId = normalizeOptionalInteger(payload.alert_id);
  const assigneeUserId = normalizeOptionalInteger(payload.assignee_user_id);

  if (!title) {
    return { error: buildValidationError('title обязателен и должен быть непустой строкой') };
  }

  if (!INCIDENT_PRIORITIES.has(priority)) {
    return { error: buildValidationError('priority должен быть одним из: low, medium, high, critical') };
  }

  if (!INCIDENT_STATUSES.has(status)) {
    return { error: buildValidationError('status должен быть одним из: open, in_progress, resolved, closed') };
  }

  if (alertId?.error) {
    return { error: buildValidationError('alert_id должен быть целым числом больше 0') };
  }

  if (assigneeUserId?.error) {
    return { error: buildValidationError('assignee_user_id должен быть целым числом больше 0') };
  }

  return {
    data: {
      title,
      description,
      priority,
      status,
      alert_id: alertId,
      assignee_user_id: assigneeUserId,
      resolution_comment: resolutionComment
    }
  };
};

const validateUpdatePayload = (payload = {}) => {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    const title = String(payload.title ?? '').trim();
    if (!title) {
      return { error: buildValidationError('title должен быть непустой строкой') };
    }
    updates.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
    updates.description = payload.description === null ? null : String(payload.description ?? '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'priority')) {
    const priority = String(payload.priority ?? '').trim();
    if (!INCIDENT_PRIORITIES.has(priority)) {
      return { error: buildValidationError('priority должен быть одним из: low, medium, high, critical') };
    }
    updates.priority = priority;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    const status = String(payload.status ?? '').trim();
    if (!INCIDENT_STATUSES.has(status)) {
      return { error: buildValidationError('status должен быть одним из: open, in_progress, resolved, closed') };
    }
    updates.status = status;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'assignee_user_id')) {
    const assigneeUserId = normalizeOptionalInteger(payload.assignee_user_id);
    if (assigneeUserId?.error) {
      return { error: buildValidationError('assignee_user_id должен быть целым числом больше 0') };
    }
    updates.assignee_user_id = assigneeUserId;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'alert_id')) {
    const alertId = normalizeOptionalInteger(payload.alert_id);
    if (alertId?.error) {
      return { error: buildValidationError('alert_id должен быть целым числом больше 0') };
    }
    updates.alert_id = alertId;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'resolution_comment')) {
    updates.resolution_comment = payload.resolution_comment === null
      ? null
      : String(payload.resolution_comment ?? '').trim();
  }

  if (Object.keys(updates).length === 0) {
    return { error: buildValidationError('Не передано ни одного поля для обновления') };
  }

  return { data: updates };
};

const validateStatus = (status) => {
  const normalized = String(status ?? '').trim();

  if (!INCIDENT_STATUSES.has(normalized)) {
    return { error: buildValidationError('status должен быть одним из: open, in_progress, resolved, closed') };
  }

  return { data: normalized };
};

const validateAlertOwnership = async (alertId, ownerUserId) => {
  if (alertId === null || alertId === undefined) {
    return true;
  }

  const alert = await get('SELECT id FROM alerts WHERE id = ? AND owner_user_id = ?', [alertId, ownerUserId]);
  return Boolean(alert);
};

export const createIncident = async (data) => {
  const timestamp = nowIso();
  const resolvedAt = data.status === 'resolved' ? timestamp : null;

  const result = await run(
    `INSERT INTO incidents (title, description, priority, status, alert_id, assignee_user_id, owner_user_id, resolution_comment, created_at, updated_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description,
      data.priority,
      data.status,
      data.alert_id,
      data.assignee_user_id,
      data.owner_user_id,
      data.resolution_comment,
      timestamp,
      timestamp,
      resolvedAt
    ]
  );

  return getIncidentById(result.lastID, data.owner_user_id);
};

export const getIncidentById = async (id, ownerUserId) => get(
  `SELECT id, title, description, priority, status, alert_id, assignee_user_id, owner_user_id, resolution_comment, created_at, updated_at, resolved_at
   FROM incidents
   WHERE id = ? AND owner_user_id = ?`,
  [id, ownerUserId]
);

export const listIncidents = async (filters = {}, ownerUserId) => {
  const clauses = ['owner_user_id = ?'];
  const params = [ownerUserId];

  if (filters.priority) {
    clauses.push('priority = ?');
    params.push(filters.priority);
  }

  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }

  if (filters.assignee_user_id !== undefined) {
    clauses.push('assignee_user_id = ?');
    params.push(filters.assignee_user_id);
  }

  if (filters.alert_id !== undefined) {
    clauses.push('alert_id = ?');
    params.push(filters.alert_id);
  }

  return all(
    `SELECT id, title, description, priority, status, alert_id, assignee_user_id, owner_user_id, resolution_comment, created_at, updated_at, resolved_at
     FROM incidents
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC`,
    params
  );
};

export const updateIncident = async (id, data, ownerUserId) => {
  const existing = await getIncidentById(id, ownerUserId);
  if (!existing) {
    return null;
  }

  const timestamp = nowIso();
  const nextStatus = data.status ?? existing.status;
  let resolvedAt = existing.resolved_at;
  if (nextStatus === 'resolved') {
    resolvedAt = existing.resolved_at ?? timestamp;
  } else {
    resolvedAt = null;
  }

  const merged = {
    title: data.title ?? existing.title,
    description: data.description !== undefined ? data.description : existing.description,
    priority: data.priority ?? existing.priority,
    status: nextStatus,
    alert_id: data.alert_id !== undefined ? data.alert_id : existing.alert_id,
    assignee_user_id: data.assignee_user_id !== undefined ? data.assignee_user_id : existing.assignee_user_id,
    resolution_comment: data.resolution_comment !== undefined ? data.resolution_comment : existing.resolution_comment,
    resolved_at: resolvedAt,
    updated_at: timestamp
  };

  await run(
    `UPDATE incidents
     SET title = ?, description = ?, priority = ?, status = ?, alert_id = ?, assignee_user_id = ?, resolution_comment = ?, updated_at = ?, resolved_at = ?
     WHERE id = ? AND owner_user_id = ?`,
    [
      merged.title,
      merged.description,
      merged.priority,
      merged.status,
      merged.alert_id,
      merged.assignee_user_id,
      merged.resolution_comment,
      merged.updated_at,
      merged.resolved_at,
      id,
      ownerUserId
    ]
  );

  return getIncidentById(id, ownerUserId);
};

export const updateIncidentStatus = async (id, status, ownerUserId) => {
  const existing = await getIncidentById(id, ownerUserId);
  if (!existing) {
    return null;
  }

  const timestamp = nowIso();
  const resolvedAt = status === 'resolved' ? (existing.resolved_at ?? timestamp) : null;

  const result = await run(
    `UPDATE incidents
     SET status = ?, updated_at = ?, resolved_at = ?
     WHERE id = ? AND owner_user_id = ?`,
    [status, timestamp, resolvedAt, id, ownerUserId]
  );

  if (result.changes === 0) {
    return null;
  }

  return getIncidentById(id, ownerUserId);
};

export const createIncidentHandler = async (req, res) => {
  const validation = validateCreatePayload(req.body);
  if (validation.error) {
    return res.status(400).json(validation.error);
  }

  try {
    const ownerUserId = getOwnerUserId(req);

    if (validation.data.alert_id !== null) {
      const alertExists = await validateAlertOwnership(validation.data.alert_id, ownerUserId);
      if (!alertExists) {
        return res.status(400).json({ error: 'alert_id не найден или не принадлежит пользователю' });
      }
    }

    const created = await createIncident({
      ...validation.data,
      owner_user_id: ownerUserId
    });

    await notifyIncidentCreated(created, ownerUserId);

    if (created.assignee_user_id !== null) {
      await notifyIncidentAssigned(created, created.assignee_user_id);
    }

    return res.status(201).json(normalizeIncident(created));
  } catch (error) {
    logger.error(`Error: Failed to create incident. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось создать инцидент' });
  }
};

export const getIncidentByIdHandler = async (req, res) => {
  const incidentId = Number(req.params.id);
  if (!Number.isInteger(incidentId) || incidentId <= 0) {
    return res.status(400).json({ error: 'Некорректный id инцидента' });
  }

  try {
    const incident = await getIncidentById(incidentId, getOwnerUserId(req));
    if (!incident) {
      return res.status(404).json({ error: 'Инцидент не найден' });
    }

    return res.status(200).json(normalizeIncident(incident));
  } catch (error) {
    logger.error(`Error: Failed to fetch incident by id ${incidentId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить инцидент' });
  }
};

export const listIncidentsHandler = async (req, res) => {
  const priority = req.query.priority === undefined ? undefined : String(req.query.priority).trim();
  const status = req.query.status === undefined ? undefined : String(req.query.status).trim();
  const assigneeUserIdRaw = req.query.assignee_user_id;
  const alertIdRaw = req.query.alert_id;

  if (priority !== undefined && !INCIDENT_PRIORITIES.has(priority)) {
    return res.status(400).json({ error: 'priority должен быть одним из: low, medium, high, critical' });
  }

  if (status !== undefined && !INCIDENT_STATUSES.has(status)) {
    return res.status(400).json({ error: 'status должен быть одним из: open, in_progress, resolved, closed' });
  }

  const assigneeUserId = assigneeUserIdRaw === undefined ? undefined : Number(assigneeUserIdRaw);
  if (assigneeUserId !== undefined && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) {
    return res.status(400).json({ error: 'assignee_user_id должен быть целым числом больше 0' });
  }

  const alertId = alertIdRaw === undefined ? undefined : Number(alertIdRaw);
  if (alertId !== undefined && (!Number.isInteger(alertId) || alertId <= 0)) {
    return res.status(400).json({ error: 'alert_id должен быть целым числом больше 0' });
  }

  try {
    const incidents = await listIncidents(
      {
        priority,
        status,
        assignee_user_id: assigneeUserId,
        alert_id: alertId
      },
      getOwnerUserId(req)
    );

    return res.status(200).json(incidents.map(normalizeIncident));
  } catch (error) {
    logger.error(`Error: Failed to list incidents. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить список инцидентов' });
  }
};

export const updateIncidentHandler = async (req, res) => {
  const incidentId = Number(req.params.id);
  if (!Number.isInteger(incidentId) || incidentId <= 0) {
    return res.status(400).json({ error: 'Некорректный id инцидента' });
  }

  const validation = validateUpdatePayload(req.body);
  if (validation.error) {
    return res.status(400).json(validation.error);
  }

  try {
    const ownerUserId = getOwnerUserId(req);

    if (validation.data.alert_id !== undefined && validation.data.alert_id !== null) {
      const alertExists = await validateAlertOwnership(validation.data.alert_id, ownerUserId);
      if (!alertExists) {
        return res.status(400).json({ error: 'alert_id не найден или не принадлежит пользователю' });
      }
    }

    const beforeUpdate = await getIncidentById(incidentId, ownerUserId);
    if (!beforeUpdate) {
      return res.status(404).json({ error: 'Инцидент не найден' });
    }

    const updated = await updateIncident(incidentId, validation.data, ownerUserId);
    if (!updated) {
      return res.status(404).json({ error: 'Инцидент не найден' });
    }

    const assigneeChanged = beforeUpdate.assignee_user_id !== updated.assignee_user_id;
    if (assigneeChanged && updated.assignee_user_id !== null) {
      await notifyIncidentAssigned(updated, updated.assignee_user_id);
    }

    return res.status(200).json(normalizeIncident(updated));
  } catch (error) {
    logger.error(`Error: Failed to update incident id ${incidentId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось обновить инцидент' });
  }
};

export const updateIncidentStatusHandler = async (req, res) => {
  const incidentId = Number(req.params.id);
  if (!Number.isInteger(incidentId) || incidentId <= 0) {
    return res.status(400).json({ error: 'Некорректный id инцидента' });
  }

  const validation = validateStatus(req.body?.status);
  if (validation.error) {
    return res.status(400).json(validation.error);
  }

  try {
    const ownerUserId = getOwnerUserId(req);
    const beforeUpdate = await getIncidentById(incidentId, ownerUserId);
    if (!beforeUpdate) {
      return res.status(404).json({ error: 'Инцидент не найден' });
    }

    const updated = await updateIncidentStatus(incidentId, validation.data, ownerUserId);
    if (!updated) {
      return res.status(404).json({ error: 'Инцидент не найден' });
    }

    await notifyIncidentStatusChanged(updated, beforeUpdate.status, updated.status, ownerUserId);

    return res.status(200).json(normalizeIncident(updated));
  } catch (error) {
    logger.error(`Error: Failed to update incident status for id ${incidentId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось обновить статус инцидента' });
  }
};
