/** User Management Service */
import { apiClient } from '../utils/api';
import type { UserRole } from '../types/auth.types';

export interface UserRecord {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string | null;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: UserRole;
  email?: string;
  full_name?: string;
  is_active?: boolean;
}

export const userService = {
  async list(): Promise<UserRecord[]> {
    const res = await apiClient.get<{ users: UserRecord[] }>('/api/users');
    return res.data.users;
  },

  async create(payload: CreateUserPayload): Promise<UserRecord> {
    const res = await apiClient.post<UserRecord>('/api/users', payload);
    return res.data;
  },

  async remove(userId: number): Promise<void> {
    await apiClient.delete(`/api/users/${userId}`);
  },
};
