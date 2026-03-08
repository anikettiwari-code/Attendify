import { supabase } from '../lib/supabase';
import { Class, Profile } from '../types';

export const classService = {
    // Get all classes
    getAllClasses: async () => {
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data as Class[];
    },

    // Get students in a specific class
    getClassStudents: async (classId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('class_id', classId)
            .eq('role', 'student')
            .order('roll_no', { ascending: true });

        if (error) throw error;
        return data as Profile[];
    }
};
