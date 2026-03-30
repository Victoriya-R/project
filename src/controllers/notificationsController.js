import logger from '../utils/logger.js';
import {
  NOTIFICATION_TYPES,
  getNotificationSettings,
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateNotificationSettings
} from '../services/notificationService.js';

const NOTIFICATION_TYPES_SET = new Set(Object.values(NOTIFICATION_TYPES));

const SETTINGS_FIELDS = [
  'in_app_enabled',
  'alert_created_enabled',
  'incident_created_enabled',
  'incident_status_changed_enabled',
  'incident_assigned_enabled'
];

const getUserId = (req) => Number(req.user?.userId);

export const listNotificationsHandler = async (req, res) => {
  const userId = getUserId(req);
  const filters = {};

  if (req.query.is_read !== undefined) {
    const value = String(req.query.is_read).trim().toLowerCase();
    if (!['0', '1', 'true', 'false'].includes(value)) {
      return res.status(400).json({ error: 'is_read должен быть boolean (true/false) или 0/1' });
    }

    filters.is_read = value === '1' || value === 'true';
  }

  if (req.query.type !== undefined) {
    const type = String(req.query.type).trim();
    if (!NOTIFICATION_TYPES_SET.has(type)) {
      return res.status(400).json({ error: 'Некорректный type уведомления' });
    }

    filters.type = type;
  }

  if (req.query.limit !== undefined) {
    const limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      return res.status(400).json({ error: 'limit должен быть целым числом от 1 до 100' });
    }

    filters.limit = limit;
  }

  try {
    const notifications = await listNotifications(userId, filters);
    return res.status(200).json(notifications);
  } catch (error) {
    logger.error(`Error: Failed to list notifications for user ${userId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить уведомления' });
  }
};

export const getUnreadCountHandler = async (req, res) => {
  const userId = getUserId(req);

  try {
    const count = await getUnreadNotificationsCount(userId);
    return res.status(200).json({ count });
  } catch (error) {
    logger.error(`Error: Failed to get unread notifications count for user ${userId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить количество непрочитанных уведомлений' });
  }
};

export const markNotificationAsReadHandler = async (req, res) => {
  const userId = getUserId(req);
  const notificationId = Number(req.params.id);

  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ error: 'Некорректный id уведомления' });
  }

  try {
    const updated = await markNotificationAsRead(notificationId, userId);
    if (!updated) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    logger.error(`Error: Failed to mark notification ${notificationId} as read for user ${userId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось отметить уведомление как прочитанное' });
  }
};

export const markAllNotificationsAsReadHandler = async (req, res) => {
  const userId = getUserId(req);

  try {
    const result = await markAllNotificationsAsRead(userId);
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error: Failed to mark all notifications as read for user ${userId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось отметить все уведомления как прочитанные' });
  }
};

export const getNotificationSettingsHandler = async (req, res) => {
  const userId = getUserId(req);

  try {
    const settings = await getNotificationSettings(userId);
    return res.status(200).json(settings);
  } catch (error) {
    logger.error(`Error: Failed to get notification settings for user ${userId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить настройки уведомлений' });
  }
};

export const updateNotificationSettingsHandler = async (req, res) => {
  const userId = getUserId(req);
  const payload = req.body ?? {};

  for (const field of SETTINGS_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field) && typeof payload[field] !== 'boolean') {
      return res.status(400).json({ error: `${field} должен быть boolean` });
    }
  }

  try {
    const settings = await updateNotificationSettings(userId, payload);
    return res.status(200).json(settings);
  } catch (error) {
    logger.error(`Error: Failed to update notification settings for user ${userId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось обновить настройки уведомлений' });
  }
};
