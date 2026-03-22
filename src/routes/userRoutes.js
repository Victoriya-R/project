import express from 'express';
import authenticateToken, { requireSuperuser } from '../middlewares/authMiddleware.js';
import {
  createUser,
  deleteUser,
  getCurrentUser,
  listUsers,
  loginUser,
  updateUser
} from '../controllers/userController.js';

const router = express.Router();

/**
 * @swagger
 * /users/login:
 *   post:
 *     tags:
 *       - Authorization
 *     summary: Авторизация пользователя
 *     description: Проверяет логин и пароль и возвращает JWT bearer token для вызова защищенных endpoint-ов через Swagger Authorize и frontend.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Авторизация успешна, JWT токен выдан.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Не передан username или password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Неверный пароль.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Пользователь не найден.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', loginUser);

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags:
 *       - Authorization
 *     summary: Получение текущего пользователя по токену
 *     description: Используется frontend route guard-ом и Swagger для проверки, что bearer token валиден и сессия авторизована.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Текущий пользователь.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *               required: [user]
 *       401:
 *         description: Токен отсутствует, истек или невалиден.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Пользователь из токена не найден.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Получение списка пользователей
 *     description: Доступно только авторизованному superuser/admin. Открытая регистрация отсутствует.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ManagedUser'
 *       401:
 *         description: Токен отсутствует, истек или невалиден.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав superuser/admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Users
 *     summary: Создание нового пользователя superuser/admin
 *     description: Endpoint доступен только авторизованному superuser/admin. Открытая регистрация в системе отключена.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: Пользователь успешно создан.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Пользователь успешно создан
 *                 user:
 *                   $ref: '#/components/schemas/ManagedUser'
 *               required: [message, user]
 *       400:
 *         description: Некорректные данные пользователя.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Токен отсутствует, истек или невалиден.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Недостаточно прав superuser/admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Пользователь с таким логином уже существует.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticateToken, requireSuperuser, listUsers);
router.post('/', authenticateToken, requireSuperuser, createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Обновление пользователя
 *     description: Доступно только авторизованному superuser/admin.
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
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       200:
 *         description: Пользователь обновлён.
 *       400:
 *         description: Некорректные данные.
 *       401:
 *         description: Токен отсутствует, истек или невалиден.
 *       403:
 *         description: Недостаточно прав superuser/admin.
 *       404:
 *         description: Пользователь не найден.
 *   delete:
 *     tags:
 *       - Users
 *     summary: Удаление пользователя
 *     description: Доступно только авторизованному superuser/admin.
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
 *         description: Пользователь удалён.
 *       400:
 *         description: Некорректный запрос.
 *       401:
 *         description: Токен отсутствует, истек или невалиден.
 *       403:
 *         description: Недостаточно прав superuser/admin.
 *       404:
 *         description: Пользователь не найден.
 */
router.put('/:id', authenticateToken, requireSuperuser, updateUser);
router.delete('/:id', authenticateToken, requireSuperuser, deleteUser);

export default router;
