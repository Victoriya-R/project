import express from 'express';
import {
  createAlertHandler,
  getAlertByIdHandler,
  listAlertsHandler,
  updateAlertStatusHandler
} from '../controllers/alertsController.js';

const router = express.Router();

router.post('/alerts', createAlertHandler);
router.get('/alerts', listAlertsHandler);
router.get('/alerts/:id', getAlertByIdHandler);
router.patch('/alerts/:id/status', updateAlertStatusHandler);

export default router;
