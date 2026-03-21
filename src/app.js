const app = express();
import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import winston from './utils/logger.js'; // Логирование
import db from './utils/db.js'; // Подключение к базе данных
import userRoutes from './routes/userRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import authenticateToken from './middlewares/authMiddleware.js'; // Подключаем middleware для авторизации

// Настройка middleware
app.use((req, res, next) => {
    const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    return next();
});

app.use(express.json()); // Для парсинга JSON в теле запросов

// Подключаем маршруты
app.use('/users', userRoutes);
app.use('/equipment', authenticateToken, equipmentRoutes);

// Настройка Swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Data Center Infrastructure API',
            version: '1.0.0',
            description: 'API для управления инфраструктурой ЦОД. http://localhost:3000/swagger.json',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT', // Указываем, что используется JWT токен
                },
            },
        },
        security: [
            {
                bearerAuth: [], // Это применяет Bearer токен ко всем эндпоинтам, которые защищены авторизацией
            },
        ],
        tags: [
            {
                name: 'Authorization',   // Убедитесь, что Authorization находится в начале
                description: 'Все запросы, связанные с авторизацией и регистрацией',
            },
            {
                name: 'Data Center Equipment',
                description: 'Оборудование ЦОД (Стойки)',
            },
            {
                name: 'Cable accounting',
                description: 'Учет и управление кабелями',
            },
            {
                name: 'Connections',
                description: 'Подключение оборудования',
            },
            {
                name: 'Power supply',
                description: 'Электропитание: ИБП (UPS) и связанные операции',
            },
            {
                name: 'Placement',
                description: 'Помещения/зоны для размещения оборудования',
            },
            {
                name: 'Reports',
                description: 'Отчёты и сводная аналитика по инфраструктуре',
            },
        ],
    },
    apis: ['./src/routes/*.js'], // Путь к файлам с аннотациями
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Подключение Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/swagger.json', (req, res) => {
    res.json(swaggerSpec);  // Отправка сгенерированного swagger.json
});


// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;