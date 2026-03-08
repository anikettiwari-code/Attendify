import { apiClient } from '../utils/api';

export interface AttendanceStats {
    total_students: number;
    present_today: number;
    absent_today: number;
    attendance_rate: number;
    weekly_data: Array<{
        day: string;
        present: number;
        absent: number;
    }>;
}

export const attendanceStatsService = {
    /**
     * Get attendance statistics for dashboard
     */
    async getStats(): Promise<AttendanceStats> {
        const response = await apiClient.get<AttendanceStats>('/api/attendance/stats');
        return response.data;
    }
};
