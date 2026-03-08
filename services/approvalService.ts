import { supabase, supabaseAdmin } from '../lib/supabase';
import { Profile, StudentPhoto } from '../types';
import { notificationService } from './notificationService';

export const approvalService = {
    // Get students with pending enrollment
    getPendingStudents: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'student')
            .eq('enrollment_status', 'pending')
            .order('full_name', { ascending: true });

        if (error) throw error;
        return data as Profile[];
    },

    // Get photos for a specific student
    getStudentPhotos: async (studentId: string) => {
        const { data, error } = await supabase
            .from('student_photos')
            .select('*')
            .eq('student_id', studentId)
            .order('photo_index', { ascending: true });

        if (error) throw error;
        return data as StudentPhoto[];
    },

    // Approve student enrollment
    approveStudent: async (studentId: string, teacherId?: string) => {
        // 1. Update enrollment_status to 'approved' — use admin client to bypass RLS
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ enrollment_status: 'approved' })
            .eq('id', studentId);

        if (profileError) throw profileError;

        // 2. Create notification for the student — use admin client
        if (teacherId) {
            await supabaseAdmin.from('notifications').insert({
                sender_id: teacherId,
                title: 'Enrollment Approved! 🎉',
                body: 'Your face enrollment has been approved. You can now be recognized by the AI camera.',
                type: 'system',
                target_id: studentId,
            });
        }

        // 3. Call backend for AI training (non-blocking — approval already saved)
        try {
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            if (backendUrl) {
                const response = await fetch(`${backendUrl}/api/v1/students/${studentId}/approve`, {
                    method: 'POST',
                });
                if (!response.ok) console.warn('Backend AI training not triggered');
            }
        } catch (e) {
            console.warn('Backend unreachable for training (non-critical):', e);
        }

        return true;
    },

    // Reject student enrollment
    rejectStudent: async (studentId: string, teacherId?: string) => {
        // 1. Update enrollment_status to 'rejected' — use admin client
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ enrollment_status: 'rejected' })
            .eq('id', studentId);

        if (profileError) throw profileError;

        // 2. Create notification for the student — use admin client
        if (teacherId) {
            await supabaseAdmin.from('notifications').insert({
                sender_id: teacherId,
                title: 'Enrollment Rejected',
                body: 'Your enrollment photos were not clear enough. Please upload clearer photos and re-submit.',
                type: 'alert',
                target_id: studentId,
            });
        }

        // 3. Call backend for deletion (non-blocking — rejection already saved)
        try {
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            if (backendUrl) {
                const response = await fetch(`${backendUrl}/api/v1/students/${studentId}/reject`, {
                    method: 'POST',
                });
                if (!response.ok) console.warn('Backend photo deletion not triggered');
            }
        } catch (e) {
            console.warn('Backend unreachable for deletion (non-critical):', e);
        }

        return true;
    }
};
