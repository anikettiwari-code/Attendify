import { supabase } from '../lib/supabase';

export const notificationService = {
    // Get notifications for a student — shows only those targeted to them or their class
    getStudentNotifications: async (studentId: string, classId?: string | null) => {
        let query = supabase
            .from('notifications')
            .select(`
                *,
                sender:profiles!notifications_sender_id_fkey(full_name)
            `)
            .order('created_at', { ascending: false });

        if (classId) {
            // Show notifications targeted to this student OR broadcast to their class OR general (no target/class)
            query = query.or(`target_id.eq.${studentId},class_id.eq.${classId},and(target_id.is.null,class_id.is.null)`);
        } else {
            // No class assigned — just show notifications targeted to this student or general ones
            query = query.or(`target_id.eq.${studentId},and(target_id.is.null,class_id.is.null)`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    // Get all notifications for teacher — sees everything
    getNotifications: async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                *,
                sender:profiles!notifications_sender_id_fkey(full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Create a notification (Teacher)
    createNotification: async (payload: { sender_id: string, class_id?: string, title: string, body: string, type: string }) => {
        const { data, error } = await supabase
            .from('notifications')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete a notification
    deleteNotification: async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};
