import { create } from 'zustand';
import { AuthUser } from '../types/entities';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

const initialToken = localStorage.getItem('dcim_token');
const initialUser = localStorage.getItem('dcim_user');

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: initialUser ? JSON.parse(initialUser) : null,
  login: (token, user) => {
    localStorage.setItem('dcim_token', token);
    localStorage.setItem('dcim_user', JSON.stringify(user));
    set({ token, user });
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem('dcim_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dcim_user');
    }
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('dcim_token');
    localStorage.removeItem('dcim_user');
    set({ token: null, user: null });
  }
}));
