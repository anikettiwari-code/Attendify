import { supabase, supabaseAdmin } from '../lib/supabase';
import { Lecture, Class } from '../types';

export const lectureService = {
  // Fetch lectures for a specific student's class for a given date
  getStudentSchedule: async (classId: string, date: string) => {
    const { data, error } = await supabase
      .from('lectures')
      .select(`
        *,
        teacher:profiles(full_name),
        class:classes(name)
      `)
      .eq('class_id', classId)
      .eq('lecture_date', date)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data as Lecture[];
  },

  // Fetch lectures taught by a specific teacher for a given date
  getTeacherSchedule: async (teacherId: string, date: string) => {
    const { data, error } = await supabase
      .from('lectures')
      .select(`
        *,
        class:classes(name, student_count)
      `)
      .eq('teacher_id', teacherId)
      .eq('lecture_date', date)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data as Lecture[];
  },

  // Get details of a specific lecture
  getLectureDetails: async (lectureId: string) => {
    const { data, error } = await supabase
      .from('lectures')
      .select(`
        *,
        class:classes(*)
      `)
      .eq('id', lectureId)
      .single();

    if (error) throw error;
    return data as Lecture;
  },

  // Create a new lecture — use admin client to bypass RLS
  createLecture: async (payload: Partial<Lecture>) => {
    const { data, error } = await supabaseAdmin
      .from('lectures')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Lecture;
  },

  // Delete a lecture — use admin client to bypass RLS
  deleteLecture: async (lectureId: string) => {
    const { error } = await supabaseAdmin
      .from('lectures')
      .delete()
      .eq('id', lectureId);

    if (error) throw error;
  },
};
