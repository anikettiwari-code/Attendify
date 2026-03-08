/**
 * Attendance Service
 * Handles attendance marking and logs
 */

import { apiClient } from '../utils/api';
import type { AttendanceLogEntry, FaceAttendanceResponse } from '../types';

export const attendanceService = {
    /**
     * Mark attendance using face recognition
     */
    async markWithFace(faceImage: Blob, latitude?: number, longitude?: number): Promise<FaceAttendanceResponse> {
        const formData = new FormData();
        formData.append('file', faceImage, 'face.jpg');
        if (latitude !== undefined) formData.append('latitude', latitude.toString());
        if (longitude !== undefined) formData.append('longitude', longitude.toString());

        const response = await apiClient.post<FaceAttendanceResponse>(
            '/api/attendance/mark',
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
     * Mark attendance using face recognition with fingerprint verification (and optional ID card)
     */
    async markWithFaceAndFingerprint(faceImage: Blob, fingerprintData: string, idCardScan?: string, latitude?: number, longitude?: number): Promise<FaceAttendanceResponse> {
        const formData = new FormData();
        formData.append('file', faceImage, 'face.jpg');
        formData.append('fingerprint_data', fingerprintData);
        if (idCardScan) formData.append('id_card_scan', idCardScan);
        if (latitude !== undefined) formData.append('latitude', latitude.toString());
        if (longitude !== undefined) formData.append('longitude', longitude.toString());

        const response = await apiClient.post<FaceAttendanceResponse>(
            '/api/attendance/mark',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },
    async getLogs(): Promise<AttendanceLogEntry[]> {
        const response = await apiClient.get<AttendanceLogEntry[]>('/api/attendance/logs');
        return response.data;
    },

    /**
     * Submit manual attendance (present/absent) for a list of students
     */
    async submitManual(entries: { student_id: number; status: 'present' | 'absent'; note?: string }[], session_id?: number, submitted_by?: string) {
        const response = await apiClient.post('/api/attendance/manual/submit', {
            entries,
            session_id,
            submitted_by,
        });
        return response.data as { message: string; created: number; updated: number; session_id?: number };
    },
};
