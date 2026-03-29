import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import './utils/logger.js';
import './utils/db.js';
import userRoutes from './routes/userRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import floorplanRoutes from './routes/floorplanRoutes.js';
import alertsRoutes from './routes/alertsRoutes.js';
import authenticateToken from './middlewares/authMiddleware.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.use(express.json());
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/users', userRoutes);
app.use('/equipment', authenticateToken, equipmentRoutes);
app.use('/api', authenticateToken, floorplanRoutes);
app.use('/', authenticateToken, alertsRoutes);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Data Center Infrastructure API',
      version: '1.0.0',
      description: 'API для управления инфраструктурой ЦОД.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите JWT токен, полученный через endpoint авторизации /users/login.',
        },
      },
      schemas: {
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'admin_1' },
            role: { type: 'string', enum: ['admin', 'user'], example: 'admin' },
            isSuperuser: { type: 'boolean', example: true },
          },
          required: ['id', 'username', 'role', 'isSuperuser'],
        },
        LoginRequest: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'admin_1' },
            password: { type: 'string', example: '12345' },
          },
          required: ['username', 'password'],
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            user: {
              $ref: '#/components/schemas/AuthUser',
            },
          },
          required: ['token', 'user'],
        },
        CreateUserRequest: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'operator_1' },
            password: { type: 'string', example: 'StrongPassword123' },
            role: { type: 'string', enum: ['admin', 'user'], example: 'user' },
            email: { type: 'string', example: 'operator_1@local.dcim' },
          },
          required: ['username', 'password', 'role'],
        },
        ManagedUser: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 2 },
            username: { type: 'string', example: 'operator_1' },
            role: { type: 'string', enum: ['admin', 'user'], example: 'user' },
            email: { type: 'string', example: 'operator_1@local.dcim' },
            isSuperuser: { type: 'boolean', example: false },
          },
          required: ['id', 'username', 'role', 'isSuperuser'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Invalid token' },
            code: { type: 'string', example: 'INVALID_TOKEN' },
          },
          required: ['error'],
        },
      },
    },
    tags: [
      {
        name: 'Authorization',
        description: 'Авторизация, получение JWT токена и проверка текущей сессии.',
      },
      {
        name: 'Users',
        description: 'Управление пользователями. Создание, изменение и удаление доступны только superuser/admin.',
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
      {
        name: 'Floor Plans',
        description: 'Планы помещений и их 3D-представление',
      },
      {
        name: 'Floor Plan Racks',
        description: 'Стойки в рамках плана помещения и их 2D/3D представления',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.get('/swagger.json', (_req, res) => {
  res.json(swaggerSpec);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
