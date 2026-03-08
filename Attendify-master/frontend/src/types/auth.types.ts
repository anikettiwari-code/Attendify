/**
 * Authentication & User Types
 */

export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN';

export interface User {
  id: number;
  email: string | null;
  username: string;
  role: UserRole;
  name?: string | null;
  full_name?: string | null;
  department?: string;
  student_id?: string;
  faculty_id?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  role: UserRole;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  department?: string;
  student_id?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
}
