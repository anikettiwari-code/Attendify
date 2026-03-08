/**
 * Student Service
 * Handles student registration and retrieval
 */

import { apiClient } from '../utils/api';
import type { Student } from '../types';

interface RegisterStudentResponse {
    message: string;
    student_id?: number;
}

export const studentService = {
    /**
     * Register a new student with face image
     */
    async register(name: string, rollNumber: string, faceImage: Blob): Promise<RegisterStudentResponse> {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('roll_number', rollNumber);
        formData.append('file', faceImage, 'face.jpg');

        const response = await apiClient.post<RegisterStudentResponse>(
            '/api/attendance/register',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    /**
     * Get all registered students
     */
    async getAll(): Promise<Student[]> {
        const response = await apiClient.get<Student[]>('/api/attendance/students');
        return response.data;
    },
};
