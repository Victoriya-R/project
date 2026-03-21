import express from 'express';  // Используем import вместо require
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { 
    createEquipment, 
    getEquipment, 
    getEquipmentByStatus, 
    getEquipmentById,
    updateEquipment, 
    deleteEquipment, 
    createUps, 
    getUpsById,
    getPortsForUps,
    updateUps,
    deleteUps,
    createSwitchCabinet, 
    updateSwitchCabinet, 
    deleteSwitchCabinet, 
    createCable, 
    getCables,
    getCableById,
    updateCable,
    deleteCable,
    createConnection, 
    getConnections,
    getPortsForEquipment,
    updateConnection,
    deleteConnection,
    createZone,
    getZones,
    getZoneById,
    updateZone,
    deleteZone,
    getSwitchCabinet,
    getAllSwitchCabinets,
    partialUpdateSwitchCabinet,
    placeInSwitchCabinet,
    removeFromSwitchCabinet,
    getEquipmentStatusReport,
    getSwitchCabinetsReport,
    getZonesReport,
    getZoneLoadReport
} from '../controllers/equipmentController.js';   // Подключаем контроллеры для оборудования

const router = express.Router();

/**
 * @swagger
 * /equipment/zones:
 *   post:
 *     tags:
 *       - Placement
 *     summary: Создание Зоны
 *     description: Создает новую зону для размещения оборудования с дополнительными данными
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               employee:
 *                 type: string
 *               site:
 *                 type: string
 *     responses:
 *       201:
 *         description: Зона успешно создана
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (только admin)
 */
router.post('/zones', requireAdmin, createZone);

/**
 * @swagger
 * /equipment/zones:
 *   get:
 *     tags:
 *       - Placement
 *     summary: Получение списка зон
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список зон
 */
router.get('/zones', getZones);

/**
 * @swagger
 * /equipment/zones/{id}:
 *   get:
 *     tags:
 *       - Placement
 *     summary: Получение зоны по ID
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
 *         description: Зона найдена
 *       404:
 *         description: Зона не найдена
 */
router.get('/zones/:id', getZoneById);

/**
 * @swagger
 * /equipment/zones/{id}:
 *   put:
 *     tags:
 *       - Placement
 *     summary: Обновление зоны
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               employee:
 *                 type: string
 *               site:
 *                 type: string
 *     responses:
 *       200:
 *         description: Зона успешно обновлена
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Зона не найдена
 */
router.put('/zones/:id', requireAdmin, updateZone);

/**
 * @swagger
 * /equipment/zones/{id}:
 *   delete:
 *     tags:
 *       - Placement
 *     summary: Удаление зоны
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
 *         description: Зона успешно удалена
 *       404:
 *         description: Зона не найдена
 *       409:
 *         description: Нельзя удалить зону, в которой размещены стойки
 */
router.delete('/zones/:id', requireAdmin, deleteZone);


/**
 * @swagger
 * /equipment/ports:
 *   get:
 *     tags:
 *       - Connections
 *     summary: Получение списка портов для оборудования
 *     description: Возвращает список портов для указанного оборудования, включая типы портов, их состояние и типы кабелей
 *     parameters:
 *       - in: query
 *         name: equipment_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Список портов для оборудования
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   port_type:
 *                     type: string
 *                   port_number:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   cable_type:
 *                     type: string
 *       400:
 *         description: Не указан equipment_id
 *       404:
 *         description: Порты для указанного оборудования не найдены
 *       500:
 *         description: Ошибка на сервере
 */
router.get('/ports', getPortsForEquipment);


/**
 * @swagger
 * /equipment/connections:
 *   post:
 *     tags:
 *       - Connections
 *     summary: Создание соединения
 *     description: Создаёт соединение между двумя портами, проверяя типы портов и кабелей
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cable_id, a_port_id, b_port_id]
 *             properties:
 *               cable_id:
 *                 type: integer
 *               a_port_id:
 *                 type: integer
 *               b_port_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Соединение успешно создано
 *       400:
 *         description: Некорректные данные или неправильный тип порта и кабеля
 *       404:
 *         description: Порты не найдены
 *       500:
 *         description: Ошибка при создании соединения
 */
router.post('/connections', requireAdmin, createConnection);



/**
 * @swagger
 * /equipment/connections:
 *   get:
 *     tags:
 *       - Connections
 *     summary: Получение списка всех соединений
 *     description: Возвращает все соединения между портами и кабелями
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список соединений
 */
router.get('/connections', getConnections);

/**
 * @swagger
 * /equipment/connections/{id}:
 *   put:
 *     tags:
 *       - Connections
 *     summary: Обновление соединения
 *     description: Обновляет соединение по ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cable_id, a_port_id, b_port_id]
 *             properties:
 *               cable_id:
 *                 type: integer
 *                 example: 2
 *               a_port_id:
 *                 type: integer
 *                 example: 12
 *               b_port_id:
 *                 type: integer
 *                 example: 13
 *     responses:
 *       200:
 *         description: Соединение успешно обновлено
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Соединение не найдено
 */
router.put('/connections/:id', requireAdmin, updateConnection);

/**
 * @swagger
 * /equipment/connections/{id}:
 *   delete:
 *     tags:
 *       - Connections
 *     summary: Удаление соединения
 *     description: Удаляет соединение по ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Соединение успешно удалено
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Соединение не найдено
 */
router.delete('/connections/:id', requireAdmin, deleteConnection);

/**
 * @swagger
 * /equipment/cables:
 *   post:
 *     tags:
 *       - Cable accounting
 *     summary: Создание кабеля
 *     description: Создаёт новый кабель. Тип кабеля ограничен значениями patchCord/powerCable.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, length, status, equipment_type_allowed]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [patchCord, powerCable]
 *                 example: patchCord
 *               length:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               status:
 *                 type: string
 *                 example: active
 *               equipment_type_allowed:
 *                 type: string
 *                 example: server
 *     responses:
 *       201:
 *         description: Кабель успешно создан
 *       400:
 *         description: Некорректные данные, неподдерживаемый тип кабеля или length <= 0
 *       401:
 *         description: Unauthorized (нет токена)
 */
router.post('/cables', requireAdmin, createCable);

/**
 * @swagger
 * /equipment/cables:
 *   get:
 *     tags:
 *       - Cable accounting
 *     summary: Получение списка кабелей
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список кабелей
 *       401:
 *         description: Unauthorized
 */
router.get('/cables', getCables);              // список кабелей

/**
 * @swagger
 * /equipment/cables/{id}:
 *   get:
 *     tags:
 *       - Cable accounting
 *     summary: Получение кабеля по ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Кабель найден
 *       404:
 *         description: Кабель не найден
 *       401:
 *         description: Unauthorized
 */
router.get('/cables/:id', getCableById);       // кабель по id

/**
 * @swagger
 * /equipment/cables/{id}:
 *   put:
 *     tags:
 *       - Cable accounting
 *     summary: Обновление кабеля
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, length, status, equipment_type_allowed]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [patchCord, powerCable]
 *               length:
 *                 type: integer
 *                 minimum: 1
 *               status:
 *                 type: string
 *               equipment_type_allowed:
 *                 type: string
 *     responses:
 *       200:
 *         description: Кабель обновлён
 *       404:
 *         description: Кабель не найден
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Unauthorized
 */
router.put('/cables/:id', requireAdmin, updateCable);        // обновить кабель

/**
 * @swagger
 * /equipment/cables/{id}:
 *   delete:
 *     tags:
 *       - Cable accounting
 *     summary: Удаление кабеля
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Кабель удалён
 *       404:
 *         description: Кабель не найден
 *       401:
 *         description: Unauthorized
 */
router.delete('/cables/:id', requireAdmin, deleteCable);     // удалить кабель

/**
 * @swagger
 * tags:
 *   - name: Data Center Equipment
 *     description: Оборудование ЦОД (Стойки)
 */

/**
 * @swagger
 * /equipment/switch_cabinets:
 *   post:
 *     tags:
 *       - Data Center Equipment
 *     summary: Создание новой стойки
 *     description: Создает новую стойку для размещения оборудования с дополнительными данными
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               weight:
 *                 type: integer
 *               energy_consumption:
 *                 type: integer
 *               energy_limit:
 *                 type: integer
 *               employee:
 *                 type: string
 *               zone_id:
 *                 type: integer
 *               description:
 *                 type: string
 *               isDataCenterEquipment:
 *                 type: boolean
 *               serial_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: Стойка успешно создана
 *       400:
 *         description: Некорректные данные
 */
router.post('/switch_cabinets', requireAdmin, createSwitchCabinet);  // Создание новой стойки

/**
 * @swagger
 * /equipment/switch_cabinets/{id}:
 *   put:
 *     tags:
 *       - Data Center Equipment
 *     summary: Обновление стойки
 *     description: Обновляет стойку по указанному ID с новыми данными
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID стойки
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Название стойки
 *               weight:
 *                 type: integer
 *                 description: Вес стойки
 *               energy_consumption:
 *                 type: integer
 *                 description: Энергопотребление стойки
 *               energy_limit:
 *                 type: integer
 *                 description: Лимит энергопотребления стойки
 *               employee:
 *                 type: string
 *                 description: Сотрудник, ответственный за стойку
 *               zone_id:
 *                 type: integer
 *                 description: ID зоны, в которой расположена стойка
 *               description:
 *                 type: string
 *                 description: Описание стойки
 *               isDataCenterEquipment:
 *                 type: boolean
 *                 description: Булевый параметр для указания, является ли стойка оборудованием ЦОД
 *               serial_number:
 *                 type: string
 *                 description: Серийный номер стойки
 *     responses:
 *       200:
 *         description: Стойка успешно обновлена
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Стойка не найдена
 */
router.put('/switch_cabinets/:id', requireAdmin, updateSwitchCabinet);  // Обновление стойки

/**
 * @swagger
 * /equipment/switch_cabinets/{id}:
 *   get:
 *     tags:
 *       - Data Center Equipment
 *     summary: Получение информации о стойке
 *     description: Получение полной информации о стойке по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID стойки
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные о стойке
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 weight:
 *                   type: integer
 *                 energy_consumption:
 *                   type: integer
 *                 energy_limit:
 *                   type: integer
 *                 employee:
 *                   type: string
 *                 zone_id:
 *                   type: integer
 *                 description:
 *                   type: string
 *                 isDataCenterEquipment:
 *                   type: boolean
 *                 serial_number:
 *                   type: string
 *       404:
 *         description: Стойка не найдена
 */
router.get('/switch_cabinets/:id', getSwitchCabinet);  // Получение информации о стойке

/**
 * @swagger
 * /equipment/switch_cabinets:
 *   get:
 *     tags:
 *       - Data Center Equipment
 *     summary: Получение списка всех стоек
 *     description: Возвращает список всех стоек с их характеристиками
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список стоек
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Ошибка сервера
 */
router.get('/switch_cabinets', getAllSwitchCabinets);

/**
 * @swagger
 * /equipment/switch_cabinets/{id}:
 *   patch:
 *     tags:
 *       - Data Center Equipment
 *     summary: Частичное обновление стойки
 *     description: Частичное обновление стойки по ID с новыми данными
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID стойки
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: integer
 *               energy_consumption:
 *                 type: integer
 *               energy_limit:
 *                 type: integer
 *               employee:
 *                 type: string
 *               zone_id:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Стойка успешно обновлена
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Стойка не найдена
 */
router.patch('/switch_cabinets/:id/partial', requireAdmin, partialUpdateSwitchCabinet);  // Частичное обновление стойки


/**
 * @swagger
 * /equipment/switch_cabinets/{id}:
 *   delete:
 *     tags:
 *       - Data Center Equipment
 *     summary: Удаление стойки
 *     description: Удаляет стойку по указанному ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID стойки
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Стойка успешно удалена
 *       404:
 *         description: Стойка не найдена
 */
router.delete('/switch_cabinets/:id', requireAdmin, deleteSwitchCabinet);  // Удаление стойки

/**
 * @swagger
 * /equipment/placeInSwitchCabinet:
 *   put:
 *     tags:
 *       - Data Center Equipment
 *     summary: Размещение оборудования в стойке
 *     description: Проверяет лимиты энергопотребления и веса при размещении оборудования в стойке
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               equipment_id:
 *                 type: integer
 *               switch_cabinet_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Оборудование успешно размещено в стойке
 *       400:
 *         description: Некорректные данные
 *       500:
 *         description: Ошибка при размещении оборудования
 */
router.put('/placeInSwitchCabinet', requireAdmin, placeInSwitchCabinet);  // Размещение оборудования в стойке

/**
 * @swagger
 * /equipment/removeFromSwitchCabinet:
 *   put:
 *     summary: Удаление оборудования из стойки
 *     description: Убирает оборудование из стойки (обнуляет switch_cabinet_id)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipment_id]
 *             properties:
 *               equipment_id:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       200:
 *         description: Оборудование убрано из стойки
 *       400:
 *         description: Некорректные данные
 *       404:
 *         description: Оборудование не найдено
 *       409:
 *         description: Оборудование не размещено в стойке
 */
router.put('/removeFromSwitchCabinet', requireAdmin, removeFromSwitchCabinet);

/**
 * @swagger
 * /equipment:
 *   post:
 *     summary: Создание оборудования
 *     description: |
 *       Создает новое оборудование и добавляет его в систему.
 *
 *       Поддерживаемые типы оборудования:
 *       - `server` — требуется объект `serverData`
 *       - `patchPanel` — требуется объект `patchPanelData`
 *
 *       Для `type=server` необходимо передать:
 *       - `ip_address`
 *       - `memory_slots`
 *       - `cpu`
 *       - `os`
 *
 *       Для `type=patchPanel` необходимо передать:
 *       - `number_of_ports`
 *       - `port_type`
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - model
 *               - serial
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 description: Имя оборудования
 *                 example: Сервер Dell R740
 *               type:
 *                 type: string
 *                 description: Тип оборудования
 *                 enum:
 *                   - server
 *                   - patchPanel
 *                 example: server
 *               model:
 *                 type: string
 *                 description: Модель оборудования
 *                 example: Dell R740
 *               serial:
 *                 type: string
 *                 description: Серийный номер оборудования
 *                 example: SRV-123456
 *               status:
 *                 type: string
 *                 description: Статус оборудования
 *                 example: active
 *               serverData:
 *                 type: object
 *                 description: Дополнительные данные для оборудования типа server
 *                 properties:
 *                   ip_address:
 *                     type: string
 *                     example: 192.168.1.10
 *                   memory_slots:
 *                     type: integer
 *                     example: 8
 *                   cpu:
 *                     type: string
 *                     example: Intel Xeon
 *                   os:
 *                     type: string
 *                     example: Ubuntu 22.04
 *               patchPanelData:
 *                 type: object
 *                 description: Дополнительные данные для оборудования типа patchPanel
 *                 properties:
 *                   number_of_ports:
 *                     type: integer
 *                     example: 24
 *                   port_type:
 *                     type: string
 *                     example: RJ-45
 *           examples:
 *             serverExample:
 *               summary: Пример создания сервера
 *               value:
 *                 name: Сервер Dell R740
 *                 type: server
 *                 model: Dell R740
 *                 serial: SRV-123456
 *                 status: active
 *                 serverData:
 *                   ip_address: 192.168.1.10
 *                   memory_slots: 8
 *                   cpu: Intel Xeon
 *                   os: Ubuntu 22.04
 *             patchPanelExample:
 *               summary: Пример создания патч-панели
 *               value:
 *                 name: Патч-панель 24 порта
 *                 type: patchPanel
 *                 model: Legrand
 *                 serial: PP-889966
 *                 status: active
 *                 patchPanelData:
 *                   number_of_ports: 24
 *                   port_type: RJ-45
 *     responses:
 *       201:
 *         description: Оборудование успешно создано
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (только admin)
 */
router.post('/', requireAdmin, createEquipment);

/**
 * @swagger
 * /equipment:
 *   get:
 *     summary: Получение списка всего оборудования
 *     description: Возвращает список всех зарегистрированных в системе оборудования
 *     responses:
 *       200:
 *         description: Список оборудования
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   status:
 *                     type: string
 *               example:
 *                 - id: 1
 *                   name: "Сервер Dell R740"
 *                   type: "server"
 *                   status: "active"
 *                 - id: 2
 *                   name: "Патч-панель 24 порта"
 *                   type: "patchPanel"
 *                   status: "inactive"
 */
router.get('/', getEquipment);  // Получение списка оборудования

/**
 * @swagger
 * /equipment/status/{status}:
 *   get:
 *     summary: Получение оборудования по статусу
 *     description: Получает список оборудования с заданным статусом (например, "в работе", "не работает")
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         description: Статус оборудования
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список оборудования с данным статусом
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   status:
 *                     type: string
 *               example:
 *                 - id: 1
 *                   name: "Сервер Dell R740"
 *                   type: "server"
 *                   status: "active"
 *                 - id: 3
 *                   name: "Патч-панель 12 портов"
 *                   type: "patchPanel"
 *                   status: "inactive"
 */
router.get('/status/:status', getEquipmentByStatus);  // Получение оборудования по статусу

/**
 * @swagger
 * /equipment/{id}:
 *   get:
 *     summary: Получение оборудования по ID
 *     description: Возвращает данные о конкретном оборудовании по его ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID оборудования
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные о конкретном оборудовании
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 type:
 *                   type: string
 *                 status:
 *                   type: string
 *               example:
 *                 id: 1
 *                 name: "Сервер Dell R740"
 *                 type: "server"
 *                 status: "active"
 *       404:
 *         description: Оборудование не найдено
 */
router.get('/:id', getEquipmentById);

/**
 * @swagger
 * /equipment/{id}:
 *   put:
 *     summary: Обновление оборудования
 *     description: |
 *       Обновляет данные оборудования по ID.
 *
 *       В текущей реализации можно изменить только:
 *       - `name`
 *       - `status`
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID оборудования
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - status
 *             properties:
 *               name:
 *                 type: string
 *                 description: Новое имя оборудования
 *                 example: Сервер Dell R740 обновлённый
 *               status:
 *                 type: string
 *                 description: Новый статус оборудования
 *                 example: inactive
 *           examples:
 *             updateEquipmentExample:
 *               summary: Пример обновления оборудования
 *               value:
 *                 name: Сервер Dell R740 обновлённый
 *                 status: inactive
 *     responses:
 *       200:
 *         description: Оборудование успешно обновлено
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (только admin)
 *       404:
 *         description: Оборудование не найдено
 */
router.put('/:id', requireAdmin, updateEquipment);

/**
 * @swagger
 * /equipment/{id}:
 *   delete:
 *     summary: Удаление оборудования
 *     description: Удаляет оборудование по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID оборудования
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Оборудование успешно удалено
 *       404:
 *         description: Оборудование не найдено
 */
router.delete('/:id', requireAdmin, deleteEquipment);  // Удаление оборудования

/**
 * @swagger
 * /equipment/ups:
 *   post:
 *     tags:
 *       - Power supply
 *     summary: Создание ИБП
 *     description: Создает ИБП и добавляет его в систему
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, status, upsData]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Имя оборудования
 *                 example: UPS-123
 *               status:
 *                 type: string
 *                 example: available
 *               upsData:
 *                 type: object
 *                 required: [capacity, battery_life]
 *                 properties:
 *                   capacity:
 *                     type: integer
 *                     example: 1500
 *                   battery_life:
 *                     type: integer
 *                     example: 120
 *     responses:
 *       201:
 *         description: ИБП успешно создано
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (только admin)
 */
router.post('/ups', requireAdmin, createUps);

/**
 * @swagger
 * /equipment/ups/{id}/ports:
 *   get:
 *     tags:
 *       - Connections
 *     summary: Получение портов ИБП
 *     description: Возвращает список портов для ИБП по ID из таблицы ups
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID ИБП из таблицы ups
 *     responses:
 *       200:
 *         description: Порты ИБП найдены
 *       404:
 *         description: ИБП или его порты не найдены
 *       401:
 *         description: Unauthorized
 */
router.get('/ups/:id/ports', getPortsForUps);

/**
 * @swagger
 * /equipment/ups/{id}:
 *   get:
 *     tags:
 *       - Power supply
 *     summary: Получение ИБП по ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ИБП найдено
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: ИБП не найдено
 */
router.get('/ups/:id', getUpsById);                 // чтение (user тоже может)

/**
 * @swagger
 * /equipment/ups/{id}:
 *   put:
 *     tags:
 *       - Power supply
 *     summary: Обновление ИБП
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, status, upsData]
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *               upsData:
 *                 type: object
 *                 required: [capacity, battery_life]
 *                 properties:
 *                   capacity:
 *                     type: integer
 *                   battery_life:
 *                     type: integer
 *     responses:
 *       200:
 *         description: ИБП обновлено
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (только admin)
 *       404:
 *         description: ИБП не найдено
 */
router.put('/ups/:id', requireAdmin, updateUps);    // изменение (только admin)

/**
 * @swagger
 * /equipment/ups/{id}:
 *   delete:
 *     tags:
 *       - Power supply
 *     summary: Удаление ИБП
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ИБП удалено
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (только admin)
 *       404:
 *         description: ИБП не найдено
 */
router.delete('/ups/:id', requireAdmin, deleteUps); // удаление (только admin)

/**
 * @swagger
 * /equipment/reports/equipment-status:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Получение отчёта по состоянию оборудования
 *     description: Генерирует отчёт по количеству оборудования, сгруппированного по типам и статусам
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Сводка по состоянию оборудования
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: server
 *                   total_count:
 *                     type: integer
 *                     example: 10
 *                   active_count:
 *                     type: integer
 *                     example: 8
 *                   inactive_count:
 *                     type: integer
 *                     example: 1
 *                   maintenance_count:
 *                     type: integer
 *                     example: 1
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Ошибка сервера
 */
router.get('/reports/equipment-status', getEquipmentStatusReport);

/**
 * @swagger
 * /equipment/reports/switch-cabinets:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Получение отчёта по стойкам
 *     description: Возвращает сводный отчёт по стойкам с количеством оборудования, текущей нагрузкой по весу и энергопотреблению, а также признаками перегрузки
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Отчёт по стойкам успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Rack A1
 *                   serial_number:
 *                     type: string
 *                     example: SC-001
 *                   zone_id:
 *                     type: integer
 *                     example: 2
 *                   zone_name:
 *                     type: string
 *                     example: Серверный зал 1
 *                   employee:
 *                     type: string
 *                     example: Иванов И.И.
 *                   weight_limit:
 *                     type: integer
 *                     example: 1000
 *                   energy_limit:
 *                     type: integer
 *                     example: 5000
 *                   equipment_count:
 *                     type: integer
 *                     example: 8
 *                   current_weight:
 *                     type: integer
 *                     example: 620
 *                   current_energy_consumption:
 *                     type: integer
 *                     example: 3400
 *                   weight_load_percent:
 *                     type: number
 *                     format: float
 *                     example: 62
 *                   energy_load_percent:
 *                     type: number
 *                     format: float
 *                     example: 68
 *                   is_weight_overloaded:
 *                     type: integer
 *                     example: 0
 *                   is_energy_overloaded:
 *                     type: integer
 *                     example: 0
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Ошибка сервера
 */
router.get('/reports/switch-cabinets', getSwitchCabinetsReport);

/**
 * @swagger
 * /equipment/reports/zones:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Получение отчёта по зонам
 *     description: Возвращает сводный отчёт по зонам с количеством стоек, оборудования, суммарным весом и энергопотреблением, а также распределением по статусам оборудования
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Отчёт по зонам успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Зона 1
 *                   description:
 *                     type: string
 *                     example: Основной серверный зал
 *                   address:
 *                     type: string
 *                     example: Москва, ул. Примерная, 10
 *                   phone:
 *                     type: string
 *                     example: +79990001122
 *                   employee:
 *                     type: string
 *                     example: Иванов И.И.
 *                   site:
 *                     type: integer
 *                     example: 1
 *                   switch_cabinet_count:
 *                     type: integer
 *                     example: 3
 *                   equipment_count:
 *                     type: integer
 *                     example: 12
 *                   total_equipment_weight:
 *                     type: integer
 *                     example: 740
 *                   total_energy_consumption:
 *                     type: integer
 *                     example: 4200
 *                   active_equipment_count:
 *                     type: integer
 *                     example: 9
 *                   inactive_equipment_count:
 *                     type: integer
 *                     example: 2
 *                   maintenance_equipment_count:
 *                     type: integer
 *                     example: 1
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Ошибка сервера
 */
router.get('/reports/zones', getZonesReport);

/**
 * @swagger
 * /equipment/reports/zones-load:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Получение отчёта по загрузке зон
 *     description: Возвращает агрегированный отчёт по лимитам веса и энергопотребления в разрезе зон, а также текущую загрузку и количество перегруженных стоек
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Отчёт по загрузке зон успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   zone_name:
 *                     type: string
 *                     example: Зона 1
 *                   switch_cabinet_count:
 *                     type: integer
 *                     example: 4
 *                   equipment_count:
 *                     type: integer
 *                     example: 15
 *                   total_weight_limit:
 *                     type: integer
 *                     example: 4000
 *                   current_weight:
 *                     type: integer
 *                     example: 2150
 *                   total_energy_limit:
 *                     type: integer
 *                     example: 18000
 *                   current_energy_consumption:
 *                     type: integer
 *                     example: 9700
 *                   weight_load_percent:
 *                     type: number
 *                     format: float
 *                     example: 53.75
 *                   energy_load_percent:
 *                     type: number
 *                     format: float
 *                     example: 53.89
 *                   overloaded_by_weight_cabinets:
 *                     type: integer
 *                     example: 1
 *                   overloaded_by_energy_cabinets:
 *                     type: integer
 *                     example: 0
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Ошибка сервера
 */
router.get('/reports/zones-load', getZoneLoadReport);

export default router;  