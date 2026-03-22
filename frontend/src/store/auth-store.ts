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

const initialToken = localStorage.getItem('dcim_token');
const initialUser = localStorage.getItem('dcim_user');

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: initialUser ? JSON.parse(initialUser) : null,
  isAuthCheckInProgress: Boolean(initialToken),
  login: (token, user) => {
    localStorage.setItem('dcim_token', token);
    localStorage.setItem('dcim_user', JSON.stringify(user));
    set({ token, user, isAuthCheckInProgress: false });
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem('dcim_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dcim_user');
    }
    set({ user });
  },
  setAuthCheckInProgress: (value) => set({ isAuthCheckInProgress: value }),
  logout: () => {
    localStorage.removeItem('dcim_token');
    localStorage.removeItem('dcim_user');
    set({ token: null, user: null, isAuthCheckInProgress: false });
  }
}));
