/**
 * Recognition Service — AI Face Recognition via Backend
 * ======================================================
 * Communicates with the FastAPI backend's /recognise-frame endpoint
 * to detect and identify students from camera frames.
 */

import { API_CONFIG } from '../lib/constants';

export interface FaceDetection {
    name: string;
    confidence: number;
    distance: number;
    rect: number[];
}

export interface AttendanceResult {
    student_id: string;
    student_name: string;
    confidence: number;
    attendance_id?: string;
    status: 'marked' | 'already_marked';
}

export interface RecognitionResponse {
    success: boolean;
    message: string;
    detections: FaceDetection[];
    attendance_marked: AttendanceResult[];
}

export interface ModelStats {
    is_trained: boolean;
    persons: string[];
    person_count: number;
    total_training_images: number;
    training_folders: { name: string; images: number }[];
    max_distance: number;
    min_confidence: number;
}

export const recognitionService = {
    /**
     * Send a base64 camera frame for AI recognition.
     * The backend runs YOLO+LBPH and auto-logs attendance.
     */
    recognizeFrame: async (
        base64Image: string,
        lectureId: string,
        cameraId: string = 'mobile-app'
    ): Promise<RecognitionResponse> => {
        const backendUrl = API_CONFIG.BASE_URL;

        const response = await fetch(`${backendUrl}/api/v1/attendance/recognise-frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: base64Image,
                lecture_id: lectureId,
                camera_id: cameraId,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || err.message || 'Recognition request failed');
        }

        return response.json();
    },

    /**
     * Get the current model status (trained persons, stats).
     */
    getModelStatus: async (): Promise<ModelStats> => {
        const backendUrl = API_CONFIG.BASE_URL;

        const response = await fetch(`${backendUrl}/api/v1/model/status`);

        if (!response.ok) {
            throw new Error('Failed to fetch model status');
        }

        return response.json();
    },

    /**
     * Force the backend to retrain the AI model.
     */
    retrainModel: async (): Promise<{ success: boolean; message: string }> => {
        const backendUrl = API_CONFIG.BASE_URL;

        const response = await fetch(`${backendUrl}/api/v1/model/retrain`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Model retrain failed');
        }

        return response.json();
    },
};
