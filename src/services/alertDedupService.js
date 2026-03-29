import db from '../utils/db.js';

const ACTIVE_ALERT_STATUSES = ['new', 'acknowledged', 'muted'];

const nowIso = () => new Date().toISOString();

const get = (query, params = []) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(row ?? null);
  });
});

const run = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function onRun(err) {
    if (err) {
      reject(err);
      return;
    }

    resolve({ changes: this.changes, lastID: this.lastID });
  });
});

export const findActiveAlertByRule = async ({
  ownerUserId,
  sourceType,
  sourceId,
  ruleCode
}) => get(
  `SELECT id, status, title, description, severity
   FROM alerts
   WHERE owner_user_id = ?
     AND source_type = ?
     AND source_id = ?
     AND rule_code = ?
     AND status IN (?, ?, ?)
   ORDER BY created_at ASC
   LIMIT 1`,
  [ownerUserId, sourceType, sourceId, ruleCode, ...ACTIVE_ALERT_STATUSES]
);

export const upsertAlertForRule = async ({
  ownerUserId,
  sourceType,
  sourceId,
  ruleCode,
  severity,
  title,
  description
}) => {
  const existingAlert = await findActiveAlertByRule({
    ownerUserId,
    sourceType,
    sourceId,
    ruleCode
  });

  const timestamp = nowIso();

  if (existingAlert) {
    await run(
      `UPDATE alerts
       SET title = ?,
           description = ?,
           severity = ?,
           updated_at = ?
       WHERE id = ? AND owner_user_id = ?`,
      [title, description, severity, timestamp, existingAlert.id, ownerUserId]
    );

    return Number(existingAlert.id);
  }

  const insertResult = await run(
    `INSERT INTO alerts (title, description, severity, source_type, source_id, status, rule_code, owner_user_id, created_at, updated_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, NULL)`,
    [title, description, severity, sourceType, sourceId, ruleCode, ownerUserId, timestamp, timestamp]
  );

  return Number(insertResult.lastID);
};

export const resolveAlertForRule = async ({
  ownerUserId,
  sourceType,
  sourceId,
  ruleCode
}) => {
  const activeAlert = await findActiveAlertByRule({
    ownerUserId,
    sourceType,
    sourceId,
    ruleCode
  });

  if (!activeAlert) {
    return 0;
  }

  const timestamp = nowIso();

  const result = await run(
    `UPDATE alerts
     SET status = 'resolved',
         updated_at = ?,
         resolved_at = ?
     WHERE id = ? AND owner_user_id = ?`,
    [timestamp, timestamp, activeAlert.id, ownerUserId]
  );

  return result.changes;
};

export { ACTIVE_ALERT_STATUSES };
