import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../lib/theme';
import { X, Scan, RefreshCw, CheckCircle } from 'lucide-react-native';
import { useRecognition } from '../../hooks/useRecognition';
import { AIStatusFeed } from './AIStatusFeed';

interface AICameraModalProps {
    isVisible: boolean;
    onClose: () => void;
    lectureId: string;
    onStudentRecognized: (studentId: string, studentName: string) => void;
}

export function AICameraModal({ isVisible, onClose, lectureId, onStudentRecognized }: AICameraModalProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [isScanning, setIsScanning] = useState(false);
    const { recognizeFrame, loading, error } = useRecognition();
    const [scanInterval, setScanInterval] = useState<any>(null);
    const [aiLogs, setAiLogs] = useState<any[]>([]);

    useEffect(() => {
        if (isVisible && !permission?.granted) {
            requestPermission();
        }
    }, [isVisible, permission]);

    useEffect(() => {
        if (isScanning) {
            const interval = setInterval(async () => {
                await captureAndRecognize();
            }, 3000); // Scan every 3 seconds
            setScanInterval(interval);
            return () => clearInterval(interval);
        } else {
            if (scanInterval) {
                clearInterval(scanInterval);
                setScanInterval(null);
            }
        }
    }, [isScanning]);

    const captureAndRecognize = async () => {
        if (!cameraRef.current) return;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: true,
                skipProcessing: true,
            });

            if (photo?.base64) {
                const result = await recognizeFrame(photo.base64, lectureId);

                if (result?.success) {
                    // Update logs for the feed
                    const newLogs = result.detections.map((d: any) => ({
                        id: Math.random().toString(),
                        studentId: d.name, // Usually we'd map name to ID
                        studentName: d.name,
                        message: d.name !== 'Unknown' ? `Verified: ${d.name}` : `Unknown face detected`,
                        type: d.name !== 'Unknown' ? 'success' : 'uncertain',
                        confidence: d.confidence / 100,
                        timestamp: new Date().toLocaleTimeString()
                    }));
                    setAiLogs(prev => [...newLogs, ...prev].slice(0, 20));

                    // Mark attendance state in parent
                    if (result.attendance_marked.length > 0) {
                        result.attendance_marked.forEach((record: any) => {
                            if (record.status === 'marked' || record.status === 'already_marked') {
                                onStudentRecognized(record.student_id, record.student_name);
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Capture/Recognition error:', err);
        }
    };

    const toggleScanning = () => {
        setIsScanning(!isScanning);
    };

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <Modal visible={isVisible} animationType="slide">
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>We need your permission to show the camera</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <X size={24} color={COLORS.text.primary} />
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={isVisible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>AI Attendance Scanner</Text>
                        <Text style={styles.subtitle}>Point camera at students to mark attendance</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeHeaderButton}>
                        <X size={24} color={COLORS.text.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.cameraContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing="back"
                    >
                        <View style={styles.overlay}>
                            <View style={styles.scanFrame} />
                        </View>
                    </CameraView>

                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.loadingText}>Processing...</Text>
                        </View>
                    )}
                </View>

                <View style={styles.controls}>
                    <TouchableOpacity
                        style={[styles.scanButton, isScanning && styles.scanButtonActive]}
                        onPress={toggleScanning}
                    >
                        {isScanning ? (
                            <>
                                <RefreshCw size={24} color="#fff" />
                                <Text style={styles.scanButtonText}>Stop Scanning</Text>
                            </>
                        ) : (
                            <>
                                <Scan size={24} color="#fff" />
                                <Text style={styles.scanButtonText}>Start AI Scan</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.feedContainer}>
                    <AIStatusFeed isActive={isScanning} externalLogs={aiLogs} />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.lg,
        paddingTop: 60,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    closeHeaderButton: {
        padding: 8,
    },
    cameraContainer: {
        width: '100%',
        aspectRatio: 3 / 4,
        backgroundColor: '#000',
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: '70%',
        height: '60%',
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: RADIUS.lg,
        borderStyle: 'dashed',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontWeight: 'bold',
    },
    controls: {
        padding: SPACING.lg,
        alignItems: 'center',
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: RADIUS.full,
        gap: 10,
        ...SHADOWS.md,
    },
    scanButtonActive: {
        backgroundColor: COLORS.danger,
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    feedContainer: {
        flex: 1,
        paddingHorizontal: SPACING.md,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    permissionText: {
        textAlign: 'center',
        fontSize: 16,
        marginBottom: 20,
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: RADIUS.md,
    },
    permissionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
    },
});
