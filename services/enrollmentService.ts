import { supabase } from '../lib/supabase';
import { StudentPhoto } from '../types';

export const enrollmentService = {
    // Upload a photo to Supabase Storage and record in database
    uploadEnrollmentPhoto: async (studentId: string, uri: string, index: number, base64?: string) => {
        try {
            const fileName = `photo_${index}.jpg`;
            const filePath = `${studentId}/${fileName}`;

            let uploadBody: any;

            if (base64) {
                // Convert base64 to ArrayBuffer (more reliable for React Native + Supabase)
                const binaryString = atob(base64.split(',')[1] || base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                uploadBody = bytes.buffer;
            } else {
                // Fallback to URI object for RN
                uploadBody = {
                    uri: uri,
                    name: fileName,
                    type: 'image/jpeg',
                };
            }

            // 2. Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('student-faces')
                .upload(filePath, uploadBody, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            // 3. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('student-faces')
                .getPublicUrl(filePath);

            // 4. Update student_photos table
            const { data, error: dbError } = await supabase
                .from('student_photos')
                .upsert({
                    student_id: studentId,
                    photo_url: publicUrl,
                    photo_index: index,
                }, { onConflict: 'student_id, photo_index' })
                .select()
                .single();

            if (dbError) throw dbError;
            return data as StudentPhoto;
        } catch (error) {
            console.error('Enrollment upload error:', error);
            throw error;
        }
    },

    // Get enrolled photos for a student
    getEnrolledPhotos: async (studentId: string) => {
        const { data, error } = await supabase
            .from('student_photos')
            .select('*')
            .eq('student_id', studentId)
            .order('photo_index', { ascending: true });

        if (error) throw error;
        return data as StudentPhoto[];
    },

    // Delete an enrolled photo
    deletePhoto: async (studentId: string, photoIndex: number) => {
        const filePath = `${studentId}/photo_${photoIndex}.jpg`;

        // 1. Delete from storage
        const { error: storageError } = await supabase.storage
            .from('student-faces')
            .remove([filePath]);

        if (storageError) throw storageError;

        // 2. Delete from database
        const { error: dbError } = await supabase
            .from('student_photos')
            .delete()
            .eq('student_id', studentId)
            .eq('photo_index', photoIndex);

        if (dbError) throw dbError;
    },

    // Sync all enrollment photos to the FastAPI backend
    syncToBackend: async (studentId: string, fullName: string, profileId: string) => {
        try {
            const photos = await enrollmentService.getEnrolledPhotos(studentId);
            if (photos.length === 0) return;

            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            if (!backendUrl) return;

            // Convert image URLs to base64 or just send the URLs
            // The backend expects base64 in MultipleBiometricsRequest
            // For simulation, we'll send the public URLs if the backend supports it, 
            // or fetch them and convert to base64

            const imagesBase64 = await Promise.all(photos.map(async (p) => {
                const resp = await fetch(p.photo_url);
                const blob = await resp.blob();
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }));

            const response = await fetch(`${backendUrl}/api/v1/students/upload-multiple-biometrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile_id: profileId,
                    student_id: studentId,
                    full_name: fullName,
                    images: imagesBase64,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Backend sync failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Backend sync error:', error);
            throw error;
        }
    },

    // Submit enrollment for teacher approval
    submitForApproval: async (studentId: string, classId: string) => {
        // 1. Update profile enrollment_status to 'pending'
        const { error: profileError } = await supabase.from('profiles')
            .update({ enrollment_status: 'pending' })
            .eq('id', studentId);

        if (profileError) throw profileError;

        // 2. Create notification for the teacher
        const { error: notifError } = await supabase.from('notifications').insert({
            sender_id: studentId,
            class_id: classId,
            title: 'New Student Enrollment',
            body: `A student has submitted 5 photos for face enrollment. Please review and approve.`,
            type: 'enrollment',
            target_id: studentId,
        });

        if (notifError) throw notifError;
    },

    // Get enrollment status
    getEnrollmentStatus: async (studentId: string) => {
        const { data, error } = await supabase.from('profiles')
            .select('enrollment_status')
            .eq('id', studentId)
            .single();

        if (error) throw error;
        return data?.enrollment_status as 'pending' | 'approved' | 'rejected' | null;
    },
};
