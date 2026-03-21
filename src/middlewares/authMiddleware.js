import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your_secret_key'; // тот же, что в userController.js

// Проверка токена (как и раньше)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) return res.status(401).json({ error: 'Access denied, token missing' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded; // { userId, role }
    next();
  });
};

// Универсальная проверка ролей
export const authorizeRoles = (...allowed) => (req, res, next) => {
  const role = req.user?.role;

  // поддержим и числовые id, и строки (на будущее)
  const roleName =
    role === 1 ? 'admin' :
    role === 2 ? 'user' :
    typeof role === 'string' ? role :
    null;

  if (!roleName || !allowed.includes(roleName)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }

  next();
};

// Удобный хелпер “только админ”
export const requireAdmin = authorizeRoles('admin');

export default authenticateToken;