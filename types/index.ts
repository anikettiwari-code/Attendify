export type UserRole = 'student' | 'teacher' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  roll_no?: string;
  department?: string;
  class_id?: string;
  avatar_url?: string;
  enrollment_status?: 'pending' | 'approved' | 'rejected' | null;
}

export interface Class {
  id: string;
  name: string;
  department: string;
  student_count: number;
}

export interface Lecture {
  id: string;
  teacher_id: string;
  class_id: string;
  subject: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  room_no: string;
  class?: Class; // Joined
  teacher?: Profile; // Joined
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  lecture_id: string;
  status: 'Present' | 'Absent' | 'Late';
  method: 'Manual' | 'AI';
  confidence_score?: number;
  marked_at: string;
  student?: Profile; // Joined
}

export interface StudentPhoto {
  id: string;
  student_id: string;
  photo_url: string;
  photo_index: number;
}
