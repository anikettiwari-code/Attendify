/** Course (Subject) Management Service */
import { apiClient } from '../utils/api';

export interface CourseRecord {
  id: number;
  name: string;
  code: string;
  weekly_sessions: number;
  requires_lab: boolean;
  teachers?: Array<{ id: number; name: string }>;
}

export interface CreateCoursePayload {
  name: string;
  code: string;
  weekly_sessions: number;
  requires_lab: boolean;
  teacher_ids?: number[];
}

export const courseService = {
  async list(): Promise<CourseRecord[]> {
    const res = await apiClient.get<CourseRecord[]>('/api/timetable/subjects');
    return res.data;
  },

  async create(payload: CreateCoursePayload): Promise<CourseRecord> {
    const res = await apiClient.post<CourseRecord>('/api/timetable/subjects', payload);
    return res.data;
  },

  async remove(courseId: number): Promise<void> {
    await apiClient.delete(`/api/timetable/subjects/${courseId}`);
  },
};
