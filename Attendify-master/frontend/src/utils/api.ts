/**
 * Axios API Configuration
 * Centralized HTTP client with interceptors for authentication and error handling
 */

import axios, { AxiosError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from './constants';
import type { ApiResponse, ApiError } from '../types';

// Re-export for backward compatibility
export { API_ENDPOINTS } from './constants';

/**
 * Create Axios instance with base configuration
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Attaches JWT token to all outgoing requests
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    throw error;
  }
);

/**
 * Response Interceptor
 * Handles responses and errors globally
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log error in development
    if (import.meta.env.DEV) {
      console.error('[API Error]', error.response?.data || error.message);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem(TOKEN_KEY, access_token);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        handleLogout();
        throw refreshError;
      }
    }

    // Handle other errors
    const responseData = error.response?.data as
      | { message?: string; detail?: string; details?: Record<string, unknown> }
      | undefined;

    const apiError: ApiError = {
      message:
        responseData?.message ||
        responseData?.detail ||
        error.message ||
        'An unexpected error occurred',
      code: error.code,
      details: responseData?.details,
    };

    throw apiError;
  }
);

/**
 * Logout handler
 * Clears authentication data and redirects to login
 */
const handleLogout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // Redirect to login page
  const { location } = globalThis;
  if (location.pathname !== '/login' && location.pathname !== '/') {
    location.href = '/login';
  }
};

/**
 * Helper function to handle API responses
 */
const isApiResponse = <T>(data: unknown): data is ApiResponse<T> => {
  return typeof data === 'object' && data !== null && 'success' in (data as Record<string, unknown>);
};

export const handleApiResponse = <T>(response: AxiosResponse<T | ApiResponse<T>>): T => {
  const payload = response.data;

  if (isApiResponse<T>(payload)) {
    if (payload.success) {
      if (payload.data !== undefined) {
        return payload.data;
      }
      return ({ ...(payload as unknown as Record<string, unknown>) } as unknown) as T;
    }

    const message = payload.message || payload.error || 'API request failed';
    throw new Error(message);
  }

  return payload;
};

/**
 * Helper function to handle API errors
 */
export const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<ApiError>;
    throw new Error(apiError.response?.data?.message || apiError.message);
  }
  throw error;
};

export const apiClient = api;

export default api;

