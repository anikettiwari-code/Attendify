/**
 * useRecognition — React hook for AI face recognition
 * =====================================================
 * Wraps recognitionService with loading/error state management.
 */

import { useState, useCallback } from 'react';
import {
    recognitionService,
    RecognitionResponse,
    ModelStats,
} from '../services/recognitionService';

export function useRecognition() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modelStats, setModelStats] = useState<ModelStats | null>(null);

    const recognizeFrame = useCallback(
        async (base64Image: string, lectureId: string): Promise<RecognitionResponse | null> => {
            setLoading(true);
            setError(null);
            try {
                const result = await recognitionService.recognizeFrame(base64Image, lectureId);
                return result;
            } catch (e: any) {
                setError(e.message);
                return null;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const fetchModelStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const stats = await recognitionService.getModelStatus();
            setModelStats(stats);
            return stats;
        } catch (e: any) {
            setError(e.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const retrainModel = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await recognitionService.retrainModel();
            return result;
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
        modelStats,
        recognizeFrame,
        fetchModelStatus,
        retrainModel,
    };
}
