import { useState, useCallback } from 'react';
import { attendanceService } from '../services/attendanceService';
import { AttendanceRecord } from '../types';

export function useAttendance() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStudentStats = useCallback(async (studentId: string) => {
        setLoading(true);
        setError(null);
        try {
            const stats = await attendanceService.getStudentStats(studentId);
            return stats;
        } catch (e: any) {
            setError(e.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStudentHistory = useCallback(async (studentId: string) => {
        setLoading(true);
        setError(null);
        try {
            const history = await attendanceService.getStudentAttendance(studentId);
            return history;
        } catch (e: any) {
            setError(e.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLectureAttendance = useCallback(async (lectureId: string) => {
        setLoading(true);
        setError(null);
        try {
            const records = await attendanceService.getLectureAttendance(lectureId);
            return records;
        } catch (e: any) {
            setError(e.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const markAttendance = useCallback(async (lectureId: string, records: { student_id: string; status: 'Present' | 'Absent' }[]) => {
        setLoading(true);
        setError(null);
        try {
            await attendanceService.markManualAttendance(lectureId, records);
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
        fetchStudentStats,
        fetchStudentHistory,
        fetchLectureAttendance,
        markAttendance,
    };
}
