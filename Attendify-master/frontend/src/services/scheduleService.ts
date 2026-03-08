import { apiClient } from '../utils/api';
import type { ScheduleEntry } from '../types/timetable.types';

export const scheduleService = {
    /**
     * Get timetable schedule
     * @param classGroupId Optional class group ID to filter by
     */
    async getSchedule(classGroupId?: number): Promise<ScheduleEntry[]> {
        const params = classGroupId ? { class_group_id: classGroupId } : {};
        const response = await apiClient.get<ScheduleEntry[]>('/api/timetable/schedule', { params });
        return response.data;
    },

    /**
     * Upload raw timetable file for AI processing
     */
    async uploadTimetable(file: File): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await apiClient.post('/api/timetable/upload-raw', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data;
    }
};
