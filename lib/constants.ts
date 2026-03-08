import { COLORS } from './theme';

export const APP_NAME = 'Attendify';

export const API_CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    TIMEOUT: 10000,
};

export const ATTENDANCE_LIMITS = {
    MIN_PHOTOS: 5,
    MAX_PHOTOS: 5,
    CONFIDENCE_THRESHOLD: 0.87,
};

export const SCREEN_NAMES = {
    STUDENT_DASHBOARD: 'dashboard',
    TEACHER_DASHBOARD: 'teacher-dashboard',
};

/**
 * Returns today's date as YYYY-MM-DD using LOCAL timezone.
 * Using new Date().toISOString() would return UTC date, which can be wrong
 * for users in IST (UTC+5:30) and other positive-offset timezones after midnight UTC.
 */
export function getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
