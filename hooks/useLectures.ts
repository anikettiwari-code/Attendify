import { useState, useCallback } from 'react';
import { lectureService } from '../services/lectureService';
import { Lecture } from '../types';

export function useLectures() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStudentSchedule = useCallback(async (classId: string, date: string) => {
        setLoading(true);
        setError(null);
        try {
            const schedule = await lectureService.getStudentSchedule(classId, date);
            return schedule;
        } catch (e: any) {
            setError(e.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTeacherSchedule = useCallback(async (teacherId: string, date: string) => {
        setLoading(true);
        setError(null);
        try {
            const schedule = await lectureService.getTeacherSchedule(teacherId, date);
            return schedule;
        } catch (e: any) {
            setError(e.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLectureDetails = useCallback(async (lectureId: string) => {
        setLoading(true);
        setError(null);
        try {
            const details = await lectureService.getLectureDetails(lectureId);
            return details;
        } catch (e: any) {
            setError(e.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        fetchStudentSchedule,
        fetchTeacherSchedule,
        fetchLectureDetails,
    };
}
