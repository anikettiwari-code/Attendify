/**
 * Application Constants
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export const TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user_data';

export const API_TIMEOUT = 30000; // 30 seconds

export const ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
  },
  STUDENTS: {
    LIST: '/api/attendance/students',
    CREATE: '/api/attendance/students',
    GET: (id: string) => `/api/attendance/students/${id}`,
    UPDATE: (id: string) => `/api/attendance/students/${id}`,
    DELETE: (id: string) => `/api/attendance/students/${id}`,
  },
  ATTENDANCE: {
    MARK: '/api/attendance/mark',
    FACE: '/api/attendance/face',
    STUDENT: (id: string) => `/api/attendance/student/${id}`,
    COURSE: (id: string) => `/api/attendance/course/${id}`,
  },
  NOTICES: {
    LIST: '/api/notices',
    CREATE: '/api/notices',
    DELETE: (id: string) => `/api/notices/${id}`,
  },
  COURSES: {
    LIST: '/api/timetable/subjects',
    CREATE: '/api/timetable/subjects',
    GET: (id: string) => `/api/timetable/subjects/${id}`,
    UPDATE: (id: string) => `/api/timetable/subjects/${id}`,
    DELETE: (id: string) => `/api/timetable/subjects/${id}`,
  },
  TIMETABLE: {
    GET: (id: string) => `/api/timetable/${id}`,
    GENERATE: '/api/timetable/generate',
  },
} as const;

// Legacy API_ENDPOINTS for backward compatibility
export const API_ENDPOINTS = {
  REGISTER_STUDENT: `${API_BASE_URL}/api/attendance/register`,
  MARK_ATTENDANCE: `${API_BASE_URL}/api/attendance/mark`,
  GET_STUDENTS: `${API_BASE_URL}/api/attendance/students`,
  GET_LOGS: `${API_BASE_URL}/api/attendance/logs`,
  GET_ATTENDANCE_LOGS: `${API_BASE_URL}/api/attendance/logs`,
  
  // Timetable
  GET_SCHEDULE: `${API_BASE_URL}/api/timetable/schedule`,
  GENERATE_TIMETABLE: `${API_BASE_URL}/api/timetable/generate`,
  CLEAR_SCHEDULE: `${API_BASE_URL}/api/timetable/schedule`,
  
  // Resources
  GET_TEACHERS: `${API_BASE_URL}/api/timetable/teachers`,
  CREATE_TEACHER: `${API_BASE_URL}/api/timetable/teachers`,
  DELETE_TEACHER: (id: number) => `${API_BASE_URL}/api/timetable/teachers/${id}`,
  
  GET_ROOMS: `${API_BASE_URL}/api/timetable/rooms`,
  CREATE_ROOM: `${API_BASE_URL}/api/timetable/rooms`,
  DELETE_ROOM: (id: number) => `${API_BASE_URL}/api/timetable/rooms/${id}`,
  
  GET_SUBJECTS: `${API_BASE_URL}/api/timetable/subjects`,
  CREATE_SUBJECT: `${API_BASE_URL}/api/timetable/subjects`,
  DELETE_SUBJECT: (id: number) => `${API_BASE_URL}/api/timetable/subjects/${id}`,
  
  GET_CLASS_GROUPS: `${API_BASE_URL}/api/timetable/class-groups`,
  CREATE_CLASS_GROUP: `${API_BASE_URL}/api/timetable/class-groups`,
  DELETE_CLASS_GROUP: (id: number) => `${API_BASE_URL}/api/timetable/class-groups/${id}`,

  // Notices
  GET_NOTICES: `${API_BASE_URL}/api/notices`,
  CREATE_NOTICE: `${API_BASE_URL}/api/notices`,
  DELETE_NOTICE: (id: number) => `${API_BASE_URL}/api/notices/${id}`,

  // Sessions (NEW)
  START_SESSION: `${API_BASE_URL}/api/sessions/start`,
  END_SESSION: (id: number) => `${API_BASE_URL}/api/sessions/${id}/end`,
  GET_SESSIONS: `${API_BASE_URL}/api/sessions`,
  GET_ACTIVE_SESSIONS: `${API_BASE_URL}/api/sessions/active`,
  GET_SESSION_SUMMARY: (id: number) => `${API_BASE_URL}/api/sessions/${id}/summary`,

  // Additional Attendance
  MARK_ATTENDANCE_MULTI: `${API_BASE_URL}/api/attendance/mark-multi`,
  MANUAL_OVERRIDE: `${API_BASE_URL}/api/attendance/override`,
  GET_THRESHOLDS: `${API_BASE_URL}/api/attendance/thresholds`,
} as const;
