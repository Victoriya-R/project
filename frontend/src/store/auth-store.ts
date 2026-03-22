import { create } from 'zustand';
import { AuthUser } from '../types/entities';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthCheckInProgress: boolean;
  login: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser | null) => void;
  setAuthCheckInProgress: (value: boolean) => void;
  logout: () => void;
}

const TOKEN_STORAGE_KEY = 'dcim_token';
const USER_STORAGE_KEY = 'dcim_user';
const AUTH_ERROR_STORAGE_KEY = 'dcim_auth_error';

const decodeJwtPayload = (token: string) => {
  const payloadPart = token.split('.')[1];
  if (!payloadPart) {
    return null;
  }

  try {
    const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    return JSON.parse(window.atob(paddedPayload));
  } catch {
    return null;
  }
};

const isStoredTokenValid = (token: string | null) => {
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }

  return payload.exp * 1000 > Date.now();
};

const getStoredUser = () => {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY);
};

const initialToken = localStorage.getItem(TOKEN_STORAGE_KEY);
const hasValidInitialToken = isStoredTokenValid(initialToken);

if (!hasValidInitialToken) {
  clearAuthStorage();
}

const initialUser = hasValidInitialToken ? getStoredUser() : null;

export const useAuthStore = create<AuthState>((set) => ({
  token: hasValidInitialToken ? initialToken : null,
  user: initialUser,
  isAuthCheckInProgress: hasValidInitialToken,
  login: (token, user) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    sessionStorage.removeItem(AUTH_ERROR_STORAGE_KEY);
    set({ token, user, isAuthCheckInProgress: false });
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    set({ user });
  },
  setAuthCheckInProgress: (value) => set({ isAuthCheckInProgress: value }),
  logout: () => {
    clearAuthStorage();
    set({ token: null, user: null, isAuthCheckInProgress: false });
  }
}));
