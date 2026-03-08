/**
 * Timetable & Schedule Types
 */

export interface Course {
  id: string;
  name: string;
  code: string;
  department: string;
  credits: number;
  faculty_id?: string;
  semester?: string;
}

export interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
  course: Course;
  room?: string;
  faculty?: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  semester: string;
  slots: TimeSlot[];
  created_at: string;
}

export interface GenerateTimetableRequest {
  semester: string;
  department?: string;
  class_groups?: string[];
}

export interface ScheduleEntry {
    id: number;
    day: number;
    period: number;
    teacher_id: number;
    teacher_name: string;
    room_id: number;
    room_number: string;
    subject_id: number;
    subject_name: string;
    subject_code: string;
    class_group_id: number;
    class_group_name: string;
}
