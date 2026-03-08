/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import api, { handleApiResponse, handleApiError } from '../utils/api';
import { ROUTES, TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '../utils/constants';
import type { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User 
} from '../types/auth.types';
import type { ApiResponse } from '../types/api.types';

import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';

/**
 * Login with Google (Firebase)
 */
export const loginWithGoogle = async (): Promise<AuthResponse> => {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const idToken = await userCredential.user.getIdToken();

    const response = await api.post<AuthResponse>('/api/auth/google', {
      token: idToken
    });

    const authData = handleApiResponse(response);

    // Store authentication data
    localStorage.setItem(TOKEN_KEY, authData.access_token);
    if (authData.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, authData.refresh_token);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    localStorage.setItem('userRole', authData.user.role);

    return authData;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Login user and store authentication data
 * @param credentials - User login credentials
 * @returns Authentication response with tokens and user data
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    // Convert credentials to FormData for OAuth2 compatible endpoint
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<AuthResponse>(
      ROUTES.AUTH.LOGIN,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const authData = handleApiResponse(response);

    // Store authentication data
    localStorage.setItem(TOKEN_KEY, authData.access_token);
    if (authData.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, authData.refresh_token);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    localStorage.setItem('userRole', authData.user.role);

    return authData;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Register new user
 * @param userData - User registration data
 * @returns Authentication response with tokens and user data
 */
export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await api.post<ApiResponse<AuthResponse>>(
      ROUTES.AUTH.REGISTER,
      userData
    );

    const authData = handleApiResponse(response);

    // Store authentication data
    localStorage.setItem(TOKEN_KEY, authData.access_token);
    if (authData.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, authData.refresh_token);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    localStorage.setItem('userRole', authData.user.role);

    return authData;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get current authenticated user
 * @returns User data
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get<ApiResponse<User>>(ROUTES.AUTH.ME);
    const user = handleApiResponse(response);
    
    // Update stored user data
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('userRole', user.role);
    
    return user;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get user data from localStorage
 * @returns User data or null
 */
export const getStoredUser = (): User | null => {
  try {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns True if user has valid token
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
};

/**
 * Logout user and clear authentication data
 */
export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('userRole');
  
  // Redirect to login page
  window.location.href = '/login';
};

/**
 * Refresh authentication token
 * @returns New access token
 */
export const refreshToken = async (): Promise<string> => {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<ApiResponse<{ access_token: string }>>(
      ROUTES.AUTH.REFRESH,
      { refresh_token: refreshToken }
    );

    const { access_token } = handleApiResponse(response);
    localStorage.setItem(TOKEN_KEY, access_token);

    return access_token;
  } catch (error) {
    logout();
    return handleApiError(error);
  }
};
