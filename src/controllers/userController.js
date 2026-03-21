import bcrypt from 'bcryptjs';  // Импорт bcrypt
import jwt from 'jsonwebtoken';  // Импорт jwt
import db from '../utils/db.js';     // Подключение к базе данных
import logger from '../utils/logger.js';  // Логирование

// Секретный ключ для JWT
const SECRET_KEY = 'your_secret_key';

// Регистрация пользователя
const registerUser = (req, res) => {
    const { username, password, email, role } = req.body;

    if (!username || !password || !email || !role) {
        return res.status(400).json({ error: 'Все поля должны быть заполнены' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            logger.error(`Error: Failed to hash password for user ${username}. Error: ${err.message}`);
            return res.status(500).json({ error: 'Error hashing password' });
        }

        // Добавление нового пользователя в базу данных
        const query = `INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = ?))`;
        db.run(query, [username, hashedPassword, email, role], function (err) {
            if (err) {
                logger.error(`Error: Failed to insert user into database. Error: ${err.message}`);
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
        });
    });
};

// Авторизация пользователя
const loginUser = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Сравниваем введенный пароль с хешированным паролем
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ error: 'Invalid password' });
            }

            // Генерация токена
            const token = jwt.sign({ userId: user.id, role: user.role_id }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ token });
        });
    });
};

const createTestUsers = () => {
    const users = [
        { username: 'admin_1', password: '12345', role: 'admin' },
        { username: 'user_1', password: '12345', role: 'user' }
    ];

    users.forEach(({ username, password, role }) => {
        // Хешируем пароли для пользователей
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.log(`Error hashing password for ${username}:`, err);
                return;
            }

            // Проверяем, существует ли уже пользователь с таким логином
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, existingUser) => {
                if (existingUser) {
                    console.log(`${username} already exists, skipping creation.`);
                } else {
                    // Добавляем пользователя в базу данных
                    const query = `INSERT INTO users (username, password, email, role_id) 
                                   VALUES (?, ?, ?, (SELECT id FROM roles WHERE name = ?))`;

                    db.run(query, [username, hashedPassword, `${username}@example.com`, role], function (err) {
                        if (err) {
                            console.log(`Error adding user ${username}:`, err);
                            return;
                        }
                        console.log(`${username} successfully added to the database.`);
                    });
                }
            });
        });
    });
};

// Вызываем функцию при старте сервера
createTestUsers();

// Экспортируем функции
export { registerUser, loginUser };