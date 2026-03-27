import express from 'express';
import {
  createFloorPlan,
  listFloorPlans,
  updateFloorPlan,
  deleteFloorPlan,
  getFloorPlan3DView,
  createRack,
  updateRack,
  deleteRack,
  getRack2DView
} from '../controllers/floorplanController.js';

const router = express.Router();

/**
 * @swagger
 * /api/floorplan/create:
 *   post:
 *     tags:
 *       - Floor Plans
 *     summary: Создание нового плана помещения
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [zone_id, name]
 *             properties:
 *               zone_id:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: Машзал А
 *               description:
 *                 type: string
 *               width:
 *                 type: number
 *                 example: 18
 *               depth:
 *                 type: number
 *                 example: 12
 *               height:
 *                 type: number
 *                 example: 3.5
 *               panel_size_x:
 *                 type: number
 *                 example: 0.6
 *               panel_size_y:
 *                 type: number
 *                 example: 0.6
 *               scale:
 *                 type: number
 *                 example: 1
 *               grid_enabled:
 *                 type: boolean
 *               axis_x_label:
 *                 type: string
 *                 example: X
 *               axis_y_label:
 *                 type: string
 *                 example: Y
 *               background_image_url:
 *                 type: string
 *                 example: https://example.com/floor-a.png
 *               camera:
 *                 type: object
 *     responses:
 *       201:
 *         description: План помещения создан
 *       409:
 *         description: Для зоны уже существует план
 */
router.post('/floorplan/create', createFloorPlan);

/**
 * @swagger
 * /api/floorplan:
 *   get:
 *     tags:
 *       - Floor Plans
 *     summary: Получение списка планов помещений
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список планов помещений
 */
router.get('/floorplan', listFloorPlans);

/**
 * @swagger
 * /api/floorplan/update/{id}:
 *   put:
 *     tags:
 *       - Floor Plans
 *     summary: Редактирование существующего плана помещения
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               zone_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               width:
 *                 type: number
 *               depth:
 *                 type: number
 *               panel_size_x:
 *                 type: number
 *               panel_size_y:
 *                 type: number
 *               background_image_url:
 *                 type: string
 *               camera:
 *                 type: object
 *     responses:
 *       200:
 *         description: План помещения обновлён
 */
router.put('/floorplan/update/:id', updateFloorPlan);

/**
 * @swagger
 * /api/floorplan/delete/{id}:
 *   delete:
 *     tags:
 *       - Floor Plans
 *     summary: Удаление плана помещения
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: План помещения удалён
 */
router.delete('/floorplan/delete/:id', deleteFloorPlan);

/**
 * @swagger
 * /api/floorplan/{id}:
 *   get:
 *     tags:
 *       - Floor Plans
 *     summary: Получение 3D/2D данных плана помещения
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные плана помещения со стойками
 */
router.get('/floorplan/:id', getFloorPlan3DView);

/**
 * @swagger
 * /api/rack/create:
 *   post:
 *     tags:
 *       - Floor Plan Racks
 *     summary: Создание стойки в плане помещения
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [floorplan_id, name]
 *             properties:
 *               floorplan_id:
 *                 type: integer
 *               switch_cabinet_id:
 *                 type: integer
 *                 nullable: true
 *               name:
 *                 type: string
 *               x:
 *                 type: number
 *               z:
 *                 type: number
 *               width:
 *                 type: number
 *               depth:
 *                 type: number
 *               height:
 *                 type: number
 *               unit_capacity:
 *                 type: integer
 *               equipment:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Стойка создана
 */
router.post('/rack/create', createRack);

/**
 * @swagger
 * /api/rack/update/{id}:
 *   put:
 *     tags:
 *       - Floor Plan Racks
 *     summary: Редактирование стойки
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Стойка обновлена
 */
router.put('/rack/update/:id', updateRack);

/**
 * @swagger
 * /api/rack/delete/{id}:
 *   delete:
 *     tags:
 *       - Floor Plan Racks
 *     summary: Удаление стойки
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Стойка удалена
 */
router.delete('/rack/delete/:id', deleteRack);

/**
 * @swagger
 * /api/rack/{id}/2d:
 *   get:
 *     tags:
 *       - Floor Plan Racks
 *     summary: Получение 2D вида стойки
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 2D вид стойки
 */
router.get('/rack/:id/2d', getRack2DView);

export default router;
