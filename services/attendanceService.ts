import { supabase, supabaseAdmin } from '../lib/supabase';
import { AttendanceRecord, Profile } from '../types';

export const attendanceService = {
  // Get attendance records for a specific lecture
  getLectureAttendance: async (lectureId: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        student:profiles(id, full_name, roll_no, avatar_url)
      `)
      .eq('lecture_id', lectureId);

    if (error) throw error;
    return data as AttendanceRecord[];
  },

  // Get attendance history for a student
  getStudentAttendance: async (studentId: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        lecture:lectures(subject, lecture_date, start_time)
      `)
      .eq('student_id', studentId)
      .order('marked_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Mark attendance for a list of students — saves DIRECTLY to Supabase
  // Uses supabaseAdmin to bypass RLS, upsert to handle re-marking
  markManualAttendance: async (
    lectureId: string,
    records: { student_id: string; status: 'Present' | 'Absent' | 'Late' }[]
  ) => {
    if (!records.length) return { success: true, message: 'No records' };

    const timestamp = new Date().toISOString();
    const upsertData = records.map(r => ({
      lecture_id: lectureId,
      student_id: r.student_id,
      status: r.status,
      method: 'Manual',
      marked_at: timestamp,
    }));

    const { error } = await supabaseAdmin
      .from('attendance')
      .upsert(upsertData, { onConflict: 'student_id,lecture_id' });

    if (error) {
      console.error('Attendance save error:', JSON.stringify(error));
      throw new Error(error.message || 'Failed to save attendance');
    }

    // Also try to notify backend for AI sync (non-blocking — won't fail the save)
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      await fetch(`${backendUrl}/api/v1/attendance/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lecture_id: lectureId, records }),
      });
    } catch (_) {
      // Silently ignored — Supabase save already succeeded above
    }

    return { success: true, message: `Saved ${records.length} attendance records` };
  },

  // Get stats for a student
  getStudentStats: async (studentId: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', studentId);

    if (error) throw error;

    const total = data?.length || 0;
    const present = data?.filter((r: { status: string }) => r.status === 'Present').length || 0;

    return {
      total,
      present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0
    };
  }
};
