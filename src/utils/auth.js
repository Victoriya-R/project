export const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';
export const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export function buildAuthUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role_name,
    isSuperuser: Boolean(user.is_superuser)
  };
}

export function buildTokenPayload(user) {
  const authUser = buildAuthUser(user);
  return {
    userId: authUser.id,
    username: authUser.username,
    role: authUser.role,
    isSuperuser: authUser.isSuperuser
  };
}
