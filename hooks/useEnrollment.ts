import { useState, useCallback } from 'react';
import { enrollmentService } from '../services/enrollmentService';
import { StudentPhoto } from '../types';

export function useEnrollment() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [enrolledPhotos, setEnrolledPhotos] = useState<StudentPhoto[]>([]);
    const [enrollmentStatus, setEnrollmentStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

    const fetchEnrolledPhotos = useCallback(async (studentId: string) => {
        setLoading(true);
        setError(null);
        try {
            const [photos, status] = await Promise.all([
                enrollmentService.getEnrolledPhotos(studentId),
                enrollmentService.getEnrollmentStatus(studentId)
            ]);
            setEnrolledPhotos(photos);
            setEnrollmentStatus(status);
            return { photos, status };
        } catch (e: any) {
            setError(e.message);
            return { photos: [], status: null };
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadPhoto = useCallback(async (studentId: string, uri: string, index: number, base64?: string) => {
        setLoading(true);
        setError(null);
        try {
            const photo = await enrollmentService.uploadEnrollmentPhoto(studentId, uri, index, base64);
            setEnrolledPhotos(prev => {
                const remaining = prev.filter(p => p.photo_index !== index);
                return [...remaining, photo].sort((a, b) => a.photo_index - b.photo_index);
            });
            return photo;
        } catch (e: any) {
            setError(e.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const removePhoto = useCallback(async (studentId: string, index: number) => {
        setLoading(true);
        setError(null);
        try {
            await enrollmentService.deletePhoto(studentId, index);
            setEnrolledPhotos(prev => prev.filter(p => p.photo_index !== index));
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    const submitForApproval = useCallback(async (studentId: string, classId: string) => {
        setLoading(true);
        setError(null);
        try {
            await enrollmentService.submitForApproval(studentId, classId);
            setEnrollmentStatus('pending');
            return true;
        } catch (e: any) {
            setError(e.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        enrolledPhotos,
        enrollmentStatus,
        fetchEnrolledPhotos,
        uploadPhoto,
        removePhoto,
        submitForApproval,
    };
}
