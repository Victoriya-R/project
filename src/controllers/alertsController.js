import db from '../utils/db.js';
import logger from '../utils/logger.js';

const ALERT_SEVERITIES = new Set(['info', 'warning', 'critical']);
const ALERT_STATUSES = new Set(['new', 'acknowledged', 'resolved', 'muted']);
const ALERT_SOURCE_TYPES = new Set(['rack', 'equipment', 'cable', 'connection', 'ups', 'zone']);

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

const normalizeAlert = (row) => ({
  id: Number(row.id),
  title: row.title,
  description: row.description ?? null,
  severity: row.severity,
  source_type: row.source_type,
  source_id: Number(row.source_id),
  status: row.status,
  rule_code: row.rule_code ?? null,
  owner_user_id: Number(row.owner_user_id),
  created_at: row.created_at,
  updated_at: row.updated_at,
  resolved_at: row.resolved_at ?? null
});

const buildValidationError = (message) => ({ error: message });

const validateCreatePayload = (payload = {}) => {
  const title = String(payload.title ?? '').trim();
  const description = payload.description === undefined || payload.description === null
    ? null
    : String(payload.description).trim();
  const severity = String(payload.severity ?? '').trim();
  const sourceType = String(payload.source_type ?? '').trim();
  const sourceId = Number(payload.source_id);
  const status = payload.status === undefined ? 'new' : String(payload.status).trim();
  const ruleCode = payload.rule_code === undefined || payload.rule_code === null
    ? null
    : String(payload.rule_code).trim();

  if (!title) {
    return { error: buildValidationError('title обязателен и должен быть непустой строкой') };
  }

  if (!ALERT_SEVERITIES.has(severity)) {
    return { error: buildValidationError('severity должен быть одним из: info, warning, critical') };
  }

  if (!ALERT_SOURCE_TYPES.has(sourceType)) {
    return { error: buildValidationError('source_type должен быть одним из: rack, equipment, cable, connection, ups, zone') };
  }

  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    return { error: buildValidationError('source_id должен быть целым числом больше 0') };
  }

  if (!ALERT_STATUSES.has(status)) {
    return { error: buildValidationError('status должен быть одним из: new, acknowledged, resolved, muted') };
  }

  return {
    data: {
      title,
      description,
      severity,
      source_type: sourceType,
      source_id: sourceId,
      status,
      rule_code: ruleCode
    }
  };
};

const validateStatus = (status) => {
  const normalized = String(status ?? '').trim();

  if (!ALERT_STATUSES.has(normalized)) {
    return { error: buildValidationError('status должен быть одним из: new, acknowledged, resolved, muted') };
  }

  return { data: normalized };
};

export const createAlert = async (data) => {
  const timestamp = nowIso();
  const resolvedAt = data.status === 'resolved' ? timestamp : null;

  const result = await run(
    `INSERT INTO alerts (title, description, severity, source_type, source_id, status, rule_code, owner_user_id, created_at, updated_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description,
      data.severity,
      data.source_type,
      data.source_id,
      data.status,
      data.rule_code,
      data.owner_user_id,
      timestamp,
      timestamp,
      resolvedAt
    ]
  );

  return get(
    `SELECT id, title, description, severity, source_type, source_id, status, rule_code, owner_user_id, created_at, updated_at, resolved_at
     FROM alerts
     WHERE id = ? AND owner_user_id = ?`,
    [result.lastID, data.owner_user_id]
  );
};

export const getAlertById = async (id, ownerUserId) => get(
  `SELECT id, title, description, severity, source_type, source_id, status, rule_code, owner_user_id, created_at, updated_at, resolved_at
   FROM alerts
   WHERE id = ? AND owner_user_id = ?`,
  [id, ownerUserId]
);

export const listAlerts = async (filters = {}, ownerUserId) => {
  const clauses = ['owner_user_id = ?'];
  const params = [ownerUserId];

  if (filters.severity) {
    clauses.push('severity = ?');
    params.push(filters.severity);
  }

  if (filters.status) {
    clauses.push('status = ?');
    params.push(filters.status);
  }

  if (filters.source_type) {
    clauses.push('source_type = ?');
    params.push(filters.source_type);
  }

  return all(
    `SELECT id, title, description, severity, source_type, source_id, status, rule_code, owner_user_id, created_at, updated_at, resolved_at
     FROM alerts
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC`,
    params
  );
};

export const updateAlertStatus = async (id, status, ownerUserId) => {
  const timestamp = nowIso();
  const resolvedAt = status === 'resolved' ? timestamp : null;

  const result = await run(
    `UPDATE alerts
     SET status = ?, updated_at = ?, resolved_at = ?
     WHERE id = ? AND owner_user_id = ?`,
    [status, timestamp, resolvedAt, id, ownerUserId]
  );

  if (result.changes === 0) {
    return null;
  }

  return getAlertById(id, ownerUserId);
};

export const createAlertHandler = async (req, res) => {
  const validation = validateCreatePayload(req.body);
  if (validation.error) {
    return res.status(400).json(validation.error);
  }

  try {
    const ownerUserId = getOwnerUserId(req);
    const created = await createAlert({
      ...validation.data,
      owner_user_id: ownerUserId
    });

    return res.status(201).json(normalizeAlert(created));
  } catch (error) {
    logger.error(`Error: Failed to create alert. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось создать алерт' });
  }
};

export const getAlertByIdHandler = async (req, res) => {
  const alertId = Number(req.params.id);
  if (!Number.isInteger(alertId) || alertId <= 0) {
    return res.status(400).json({ error: 'Некорректный id алерта' });
  }

  try {
    const alert = await getAlertById(alertId, getOwnerUserId(req));
    if (!alert) {
      return res.status(404).json({ error: 'Алерт не найден' });
    }

    return res.status(200).json(normalizeAlert(alert));
  } catch (error) {
    logger.error(`Error: Failed to fetch alert by id ${alertId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить алерт' });
  }
};

export const listAlertsHandler = async (req, res) => {
  const severity = req.query.severity === undefined ? undefined : String(req.query.severity).trim();
  const status = req.query.status === undefined ? undefined : String(req.query.status).trim();
  const sourceType = req.query.source_type === undefined ? undefined : String(req.query.source_type).trim();

  if (severity !== undefined && !ALERT_SEVERITIES.has(severity)) {
    return res.status(400).json({ error: 'severity должен быть одним из: info, warning, critical' });
  }

  if (status !== undefined && !ALERT_STATUSES.has(status)) {
    return res.status(400).json({ error: 'status должен быть одним из: new, acknowledged, resolved, muted' });
  }

  if (sourceType !== undefined && !ALERT_SOURCE_TYPES.has(sourceType)) {
    return res.status(400).json({ error: 'source_type должен быть одним из: rack, equipment, cable, connection, ups, zone' });
  }

  try {
    const alerts = await listAlerts(
      {
        severity,
        status,
        source_type: sourceType
      },
      getOwnerUserId(req)
    );

    return res.status(200).json(alerts.map(normalizeAlert));
  } catch (error) {
    logger.error(`Error: Failed to list alerts. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить список алертов' });
  }
};

export const updateAlertStatusHandler = async (req, res) => {
  const alertId = Number(req.params.id);
  if (!Number.isInteger(alertId) || alertId <= 0) {
    return res.status(400).json({ error: 'Некорректный id алерта' });
  }

  const validation = validateStatus(req.body?.status);
  if (validation.error) {
    return res.status(400).json(validation.error);
  }

  try {
    const updated = await updateAlertStatus(alertId, validation.data, getOwnerUserId(req));
    if (!updated) {
      return res.status(404).json({ error: 'Алерт не найден' });
    }

    return res.status(200).json(normalizeAlert(updated));
  } catch (error) {
    logger.error(`Error: Failed to update alert status for id ${alertId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось обновить статус алерта' });
  }
};
