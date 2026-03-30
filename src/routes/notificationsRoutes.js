import express from 'express';
import {
  getNotificationSettingsHandler,
  getUnreadCountHandler,
  listNotificationsHandler,
  markAllNotificationsAsReadHandler,
  markNotificationAsReadHandler,
  updateNotificationSettingsHandler
} from '../controllers/notificationsController.js';

const router = express.Router();

router.get('/notifications', listNotificationsHandler);
router.get('/notifications/unread-count', getUnreadCountHandler);
router.patch('/notifications/:id/read', markNotificationAsReadHandler);
router.patch('/notifications/read-all', markAllNotificationsAsReadHandler);
router.get('/notification-settings', getNotificationSettingsHandler);
router.patch('/notification-settings', updateNotificationSettingsHandler);

export default router;
