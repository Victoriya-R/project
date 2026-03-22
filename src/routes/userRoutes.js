import express from 'express';
import authenticateToken, { requireSuperuser } from '../middlewares/authMiddleware.js';
import {
  deleteUser,
  getCurrentUser,
  listUsers,
  loginUser,
  registerUser,
  updateUser
} from '../controllers/userController.js';

const router = express.Router();

router.post('/login', loginUser);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/register', authenticateToken, requireSuperuser, registerUser);
router.get('/', authenticateToken, requireSuperuser, listUsers);
router.put('/:id', authenticateToken, requireSuperuser, updateUser);
router.delete('/:id', authenticateToken, requireSuperuser, deleteUser);

export default router;
