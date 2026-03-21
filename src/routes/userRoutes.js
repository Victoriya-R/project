import express from 'express';  // Используем import вместо require
import { registerUser, loginUser } from '../controllers/userController.js';  // Подключаем контроллеры для пользователей

const router = express.Router();
/**
 * @swagger
 * tags:
 *   - name: Authorization
 *     description: Все запросы, связанные с авторизацией и регистрацией
 */

/**
 * @swagger
 * /users/register:
 *   post:
 *     tags:
 *       - Authorization
 *     summary: Регистрация нового пользователя
 *     description: Создает нового пользователя и сохраняет его в систему
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *       400:
 *         description: Некорректные данные
 *       500:
 *         description: Ошибка при сохранении пользователя
 */
router.post('/register', registerUser);

/**
 * @swagger
 * /users/login:
 *   post:
 *     tags:
 *       - Authorization
 *     summary: Авторизация пользователя
 *     description: Авторизует пользователя и возвращает JWT токен
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Токен JWT возвращен
 *       400:
 *         description: Отсутствует имя или пароль
 *       404:
 *         description: Пользователь не найден
 *       401:
 *         description: Неверный пароль
 */
router.post('/login', loginUser);

export default router;  // Экспортируем маршруты с использованием export default