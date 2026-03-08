/**
 * Attendance Types
 */

export type AttendanceStatus = 'Present' | 'Absent' | 'Unknown' | 'Verify' | 'Rejected' | 'Biometric Required';

export interface Student {
  id: number;
  name: string;
  roll_number: string;
}

export interface AttendanceLogEntry {
  id: number;
  student_name: string;
  roll_number: string;
  timestamp: string;
  status: AttendanceStatus;
}

export interface FaceAttendanceResponse {
  success: boolean;
  name: string;
  status: AttendanceStatus;
  confidence?: string;
  message: string;
  require_biometric?: boolean;
  notes?: string[];
}
