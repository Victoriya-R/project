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
 *     description: Создаёт план помещения для последующего 3D-отображения со стойками и оборудованием.
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
 *                 example: Основной зал №1
 *               description:
 *                 type: string
 *                 example: План основного серверного помещения
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
 *                 example: true
 *               axis_x_label:
 *                 type: string
 *                 example: X
 *               axis_y_label:
 *                 type: string
 *                 example: Y
 *               background_image_url:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/floor-a.png
 *               camera:
 *                 type: object
 *                 description: Начальные параметры камеры 3D сцены
 *     responses:
 *       201:
 *         description: План помещения создан
 *       404:
 *         description: Зона не найдена
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
 *               height:
 *                 type: number
 *               panel_size_x:
 *                 type: number
 *               panel_size_y:
 *                 type: number
 *               scale:
 *                 type: number
 *               grid_enabled:
 *                 type: boolean
 *               axis_x_label:
 *                 type: string
 *               axis_y_label:
 *                 type: string
 *               background_image_url:
 *                 type: string
 *                 nullable: true
 *               camera:
 *                 type: object
 *     responses:
 *       200:
 *         description: План помещения обновлён
 *       404:
 *         description: План помещения или зона не найдены
 *       409:
 *         description: Для зоны уже существует план
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
 *       404:
 *         description: План помещения не найден
 */
router.delete('/floorplan/delete/:id', deleteFloorPlan);

/**
 * @swagger
 * /api/floorplan/{id}:
 *   get:
 *     tags:
 *       - Floor Plans
 *     summary: Получение 3D представления плана помещения
 *     description: Возвращает план помещения с геометрией, стойками и вложенным оборудованием для рендера 3D сцены.
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
 *         description: 3D представление плана помещения
 *       404:
 *         description: План помещения не найден
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
 *               y:
 *                 type: number
 *               z:
 *                 type: number
 *               rotation_y:
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
 *       404:
 *         description: План помещения или стойка switch_cabinet не найдены
 *       409:
 *         description: Нельзя разместить стойку из другой зоны на этом плане
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
 *             properties:
 *               switch_cabinet_id:
 *                 type: integer
 *                 nullable: true
 *               name:
 *                 type: string
 *               x:
 *                 type: number
 *               y:
 *                 type: number
 *               z:
 *                 type: number
 *               rotation_y:
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
 *       200:
 *         description: Стойка обновлена
 *       404:
 *         description: Стойка не найдена
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
 *       404:
 *         description: Стойка не найдена
 */
router.delete('/rack/delete/:id', deleteRack);

/**
 * @swagger
 * /api/rack/{id}/2d:
 *   get:
 *     tags:
 *       - Floor Plan Racks
 *     summary: Получение 2D вида стойки
 *     description: Возвращает данные выбранной стойки для детального 2D отображения юнитов и оборудования.
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
 *       404:
 *         description: Стойка не найдена
 */
router.get('/rack/:id/2d', getRack2DView);

export default router;
