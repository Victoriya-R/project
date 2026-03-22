import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../utils/db.js';
import logger from '../utils/logger.js';
import { buildAuthUser, buildTokenPayload, SECRET_KEY, TOKEN_EXPIRES_IN } from '../utils/auth.js';

const allowedRoles = new Set(['admin', 'user']);

const getUserByUsername = (username) => new Promise((resolve, reject) => {
  db.get(
    `SELECT u.id, u.username, u.password, u.email, u.is_superuser, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.username = ?`,
    [username],
    (err, row) => (err ? reject(err) : resolve(row ?? null))
  );
});

const getUserById = (id) => new Promise((resolve, reject) => {
  db.get(
    `SELECT u.id, u.username, u.password, u.email, u.is_superuser, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?`,
    [id],
    (err, row) => (err ? reject(err) : resolve(row ?? null))
  );
});

const getRoleId = (role) => new Promise((resolve, reject) => {
  db.get('SELECT id FROM roles WHERE name = ?', [role], (err, row) => (err ? reject(err) : resolve(row?.id ?? null)));
});

const normalizeRegistrationPayload = (body = {}) => ({
  username: String(body.username ?? '').trim(),
  password: String(body.password ?? '').trim(),
  role: String(body.role ?? '').trim(),
  email: String(body.email ?? '').trim() || null
});

export const registerUser = async (req, res) => {
  const { username, password, role, email } = normalizeRegistrationPayload(req.body);

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Необходимо передать username, password и role' });
  }

  if (!allowedRoles.has(role)) {
    return res.status(400).json({ error: 'Роль должна быть admin или user' });
  }

  try {
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(500).json({ error: 'Роль не найдена в системе' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedEmail = email || `${username}@local.dcim`;

    const userId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, password, email, role_id, is_superuser) VALUES (?, ?, ?, ?, 0)',
        [username, hashedPassword, normalizedEmail, roleId],
        function (err) {
          if (err) return reject(err);
          return resolve(this.lastID);
        }
      );
    });

    logger.info(`Success: User ${username} created by superuser ${req.user?.username}`);

    return res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: userId,
        username,
        role,
        isSuperuser: false
      }
    });
  } catch (error) {
    logger.error(`Error: Failed to register user ${username}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
  }
};

export const loginUser = async (req, res) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '').trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(buildTokenPayload(user), SECRET_KEY, { expiresIn: TOKEN_EXPIRES_IN });

    logger.info(`Success: User ${username} logged in`);

    return res.status(200).json({
      token,
      user: buildAuthUser(user)
    });
  } catch (error) {
    logger.error(`Error: Failed to login user ${username}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Ошибка авторизации' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    return res.status(200).json({ user: buildAuthUser(user) });
  } catch (error) {
    logger.error(`Error: Failed to fetch current user ${req.user?.userId}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить пользователя' });
  }
};

export const listUsers = async (_req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.email, u.is_superuser, r.name AS role
         FROM users u
         JOIN roles r ON r.id = u.role_id
         ORDER BY u.is_superuser DESC, u.username ASC`,
        [],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    return res.status(200).json(users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isSuperuser: Boolean(user.is_superuser)
    })));
  } catch (error) {
    logger.error(`Error: Failed to list users. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось получить пользователей' });
  }
};

export const updateUser = async (req, res) => {
  const userId = Number(req.params.id);
  const username = req.body?.username !== undefined ? String(req.body.username).trim() : undefined;
  const password = req.body?.password !== undefined ? String(req.body.password).trim() : undefined;
  const role = req.body?.role !== undefined ? String(req.body.role).trim() : undefined;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Некорректный id пользователя' });
  }

  if (username === undefined && password === undefined && role === undefined) {
    return res.status(400).json({ error: 'Нужно передать хотя бы одно поле: username, password или role' });
  }

  if (role !== undefined && !allowedRoles.has(role)) {
    return res.status(400).json({ error: 'Роль должна быть admin или user' });
  }

  try {
    const existing = await getUserById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (existing.is_superuser && role && role !== existing.role_name) {
      return res.status(400).json({ error: 'Нельзя изменять роль суперпользователя' });
    }

    if (username && username !== existing.username) {
      const byUsername = await getUserByUsername(username);
      if (byUsername && byUsername.id !== userId) {
        return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
      }
    }

    const fields = [];
    const values = [];

    if (username !== undefined) {
      fields.push('username = ?');
      values.push(username || existing.username);
    }

    if (password !== undefined) {
      fields.push('password = ?');
      values.push(await bcrypt.hash(password, 10));
    }

    if (role !== undefined) {
      const roleId = await getRoleId(role);
      fields.push('role_id = ?');
      values.push(roleId);
    }

    if (username !== undefined) {
      fields.push('email = ?');
      values.push(`${(username || existing.username)}@local.dcim`);
    }

    values.push(userId);

    await new Promise((resolve, reject) => {
      db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values, function (err) {
        if (err) return reject(err);
        return resolve(this.changes);
      });
    });

    const updatedUser = await getUserById(userId);

    return res.status(200).json({
      message: 'Пользователь обновлён',
      user: buildAuthUser(updatedUser)
    });
  } catch (error) {
    logger.error(`Error: Failed to update user ${req.params.id}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось обновить пользователя' });
  }
};

export const deleteUser = async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Некорректный id пользователя' });
  }

  if (userId === req.user?.userId) {
    return res.status(400).json({ error: 'Нельзя удалить текущего пользователя' });
  }

  try {
    const existing = await getUserById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (existing.is_superuser) {
      return res.status(400).json({ error: 'Суперпользователя нельзя удалить' });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
        if (err) return reject(err);
        return resolve(this.changes);
      });
    });

    return res.status(200).json({ message: 'Пользователь удалён', id: userId });
  } catch (error) {
    logger.error(`Error: Failed to delete user ${req.params.id}. Error: ${error.message}`);
    return res.status(500).json({ error: 'Не удалось удалить пользователя' });
  }
};
