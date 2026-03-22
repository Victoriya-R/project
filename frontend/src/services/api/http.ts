import axios from 'axios';
import { useAuthStore } from '../../store/auth-store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  timeout: 5000
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore.getState();
      if (authStore.token) {
        const backendMessage = typeof error.response?.data?.error === 'string'
          ? error.response.data.error
          : 'Сессия истекла или токен недействителен. Выполните вход повторно.';

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('dcim_auth_error', backendMessage);
        }

        authStore.logout();

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);
