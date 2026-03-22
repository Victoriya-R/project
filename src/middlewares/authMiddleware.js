import jwt from 'jsonwebtoken';
import { SECRET_KEY } from '../utils/auth.js';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied, token missing', code: 'TOKEN_MISSING' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }

    if (err) {
      return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    }

    req.user = decoded;
    return next();
  });
};

export const authorizeRoles = (...allowed) => (req, res, next) => {
  const role = req.user?.role;

  if (!role || !allowed.includes(role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }

  return next();
};

export const requireAdmin = authorizeRoles('admin');

export const requireSuperuser = (req, res, next) => {
  if (!req.user?.isSuperuser) {
    return res.status(403).json({ error: 'Forbidden: superuser permissions required' });
  }

  return next();
};

export default authenticateToken;
