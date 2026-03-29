import express from 'express';
import {
  createIncidentHandler,
  getIncidentByIdHandler,
  listIncidentsHandler,
  updateIncidentHandler,
  updateIncidentStatusHandler
} from '../controllers/incidentsController.js';

const router = express.Router();

router.post('/', createIncidentHandler);
router.get('/', listIncidentsHandler);
router.get('/:id', getIncidentByIdHandler);
router.patch('/:id', updateIncidentHandler);
router.patch('/:id/status', updateIncidentStatusHandler);

export default router;
