import axios from 'axios';
import { AuthResponse, LoginCredentials, RegisterCredentials, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post('/api/v1/auth/signup', credentials);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/api/v1/auth/login', credentials);
    return response.data;
  },

  async verifyEmail(token: string): Promise<ApiResponse> {
    const response = await api.post('/api/v1/auth/verify-email', { token });
    return response.data;
  },

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await api.post('/api/v1/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const response = await api.post('/api/v1/auth/reset-password', { token, password });
    return response.data;
  },

  async resendVerification(email: string): Promise<ApiResponse> {
    const response = await api.post('/api/v1/auth/resend-verification', { email });
    return response.data;
  },
};

export default api;