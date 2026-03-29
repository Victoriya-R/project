import express from 'express';
import {
  createIncidentFromAlertHandler,
  createAlertHandler,
  getAlertByIdHandler,
  listAlertsHandler,
  updateAlertStatusHandler
} from '../controllers/alertsController.js';

const router = express.Router();

router.post('/', createAlertHandler);
router.get('/', listAlertsHandler);
router.get('/:id', getAlertByIdHandler);
router.patch('/:id/status', updateAlertStatusHandler);
router.post('/:id/create-incident', createIncidentFromAlertHandler);

export default router;
