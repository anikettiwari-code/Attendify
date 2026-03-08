import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../../lib/theme';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { classService } from '../../../services/classService';
import { attendanceService } from '../../../services/attendanceService';
import { Profile, Lecture } from '../../../types';
import { ChevronLeft, Save, Scan, ChevronDown } from 'lucide-react-native';
import { AICameraModal } from '../../../components/attendance/AICameraModal';
import { lectureService } from '../../../services/lectureService';
import { getLocalDateString } from '../../../lib/constants';

// Simple Grid Item for Roll Number
const RollNoItem = ({
    rollNo,
    status,
    onPress
}: {
    rollNo: string,
    status: 'Present' | 'Absent',
    onPress: () => void
}) => {
    const isPresent = status === 'Present';
    return (
        <TouchableOpacity
            style={[
                styles.rollItem,
                isPresent && styles.rollItemPresent,
                !isPresent && styles.rollItemAbsent
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.rollText,
                isPresent && styles.rollTextPresent
            ]}>
                {rollNo}
            </Text>
        </TouchableOpacity>
    );
};

export default function MarkAttendanceScreen() {
    const { classId, className } = useLocalSearchParams<{ classId: string, className: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [students, setStudents] = useState<Profile[]>([]);
    const [isAIModalVisible, setIsAIModalVisible] = useState(false);
    const [lecturesList, setLecturesList] = useState<Lecture[]>([]);
    const [showLectureSelector, setShowLectureSelector] = useState(false);
    const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);

    // Key: Student ID, Value: Status
    const [attendance, setAttendance] = useState<Record<string, 'Present' | 'Absent'>>({});

    // Find today's lecture for this class
    const findLecture = useCallback(async () => {
        try {
            const today = getLocalDateString();
            const lectures = await lectureService.getStudentSchedule(classId || '', today);
            setLecturesList(lectures);
            if (lectures.length > 0) {
                setCurrentLecture(lectures[0]);
            }
        } catch (error) {
            console.error('Failed to find lecture:', error);
        }
    }, [classId]);

    useEffect(() => {
        findLecture();
    }, [findLecture]);

    // Fetch students for the class
    const loadStudents = useCallback(async () => {
        if (!classId) return;
        try {
            setLoading(true);
            const data = await classService.getClassStudents(classId);
            setStudents(data);

            const initial: Record<string, 'Present' | 'Absent'> = {};
            data.forEach(s => {
                initial[s.id] = 'Absent';
            });
            setAttendance(initial);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load students');
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const toggleStatus = (studentId: string) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
        }));
    };

    const onStudentRecognized = (studentId: string, studentName: string) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: 'Present'
        }));
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            if (!currentLecture) {
                Alert.alert('Error', 'Please select a lecture to mark attendance for.');
                setSubmitting(false);
                return;
            }

            const records = Object.entries(attendance).map(([student_id, status]) => ({
                student_id,
                status
            }));

            console.log('Submitting attendance for class', classId, records.length);
            await attendanceService.markManualAttendance(currentLecture.id, records);

            if (Platform.OS === 'web') {
                window.alert(`✅ Attendance Saved! ${records.filter(r => r.status === 'Present').length} present, ${records.filter(r => r.status === 'Absent').length} absent.`);
                router.back();
            } else {
                Alert.alert(
                    '✅ Attendance Saved',
                    `${records.filter(r => r.status === 'Present').length} present, ${records.filter(r => r.status === 'Absent').length} absent — saved to database.`,
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }

        } catch (error: any) {
            console.error('Save error:', JSON.stringify(error));
            Alert.alert('Error', `Failed to save attendance: ${error?.message || JSON.stringify(error)}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate Summary
    const presentCount = Object.values(attendance).filter(s => s === 'Present').length;
    const totalCount = students.length;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{className || 'Class'}</Text>
                    <Text style={styles.subtitle}>Tap roll number to mark Present</Text>
                </View>
                <View style={styles.summaryBadge}>
                    <Text style={styles.summaryText}>{presentCount}/{totalCount}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => {
                        if (!currentLecture) {
                            Alert.alert('No Lecture Found', 'Please create a lecture for today first to use AI scanning.');
                            return;
                        }
                        setIsAIModalVisible(true);
                    }}
                    style={styles.aiButton}
                >
                    <Scan size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={{ padding: SPACING.md, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border, zIndex: 1 }}>
                <Text style={{ fontSize: 12, color: COLORS.text.secondary, marginBottom: 6, fontWeight: '700' }}>SELECT LECTURE SLOT</Text>
                <TouchableOpacity 
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border }}
                    onPress={() => setShowLectureSelector(true)}
                >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: currentLecture ? COLORS.text.primary : COLORS.text.light }}>
                        {currentLecture ? `${currentLecture.subject} (${currentLecture.start_time.substring(0,5)} - ${currentLecture.end_time.substring(0,5)})` : (lecturesList.length === 0 ? "No lectures found for today" : "Select lecture...")}
                    </Text>
                    <ChevronDown size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
            </View>

            <Modal visible={showLectureSelector} transparent animationType="fade" onRequestClose={() => setShowLectureSelector(false)}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }} activeOpacity={1} onPress={() => setShowLectureSelector(false)}>
                    <View style={{ margin: SPACING.xl, backgroundColor: COLORS.card, borderRadius: RADIUS.md, overflow: 'hidden' }}>
                        <View style={{ padding: SPACING.md, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                           <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Select Lecture</Text>
                        </View>
                        {lecturesList.length === 0 ? (
                            <Text style={{ padding: SPACING.lg, textAlign: 'center', color: COLORS.text.secondary }}>No lectures scheduled today.</Text>
                        ) : (
                            lecturesList.map(l => (
                                <TouchableOpacity 
                                    key={l.id} 
                                    style={{ padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: currentLecture?.id === l.id ? '#eff6ff' : COLORS.card }}
                                    onPress={() => { setCurrentLecture(l); setShowLectureSelector(false); }}
                                >
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: currentLecture?.id === l.id ? COLORS.primary : COLORS.text.primary }}>{l.subject}</Text>
                                    <Text style={{ fontSize: 13, color: COLORS.text.secondary, marginTop: 4 }}>Time: {l.start_time.substring(0,5)} - {l.end_time.substring(0,5)} | Room: {l.room_no}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            <AICameraModal
                isVisible={isAIModalVisible}
                onClose={() => setIsAIModalVisible(false)}
                lectureId={currentLecture?.id || ''}
                onStudentRecognized={onStudentRecognized}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.sectionTitle}>Roll Numbers</Text>

                    <View style={styles.grid}>
                        {students.map((student) => (
                            <RollNoItem
                                key={student.id}
                                rollNo={student.roll_no || '?'}
                                status={attendance[student.id]}
                                onPress={() => toggleStatus(student.id)}
                            />
                        ))}
                    </View>

                    {students.length === 0 && (
                        <Text style={styles.emptyText}>No students found in this class.</Text>
                    )}

                    <View style={styles.footer}>
                        <Button
                            label={`Save Attendance (${presentCount})`}
                            onPress={handleSave}
                            loading={submitting}
                            icon={<Save size={20} color="#fff" />}
                        />
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: SPACING.md,
    },
    backButton: {
        padding: 4,
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
    summaryBadge: {
        marginLeft: 'auto',
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
    },
    summaryText: {
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    aiButton: {
        backgroundColor: COLORS.primary,
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: SPACING.md,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: SPACING.md,
        color: COLORS.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    rollItem: {
        width: 65,
        height: 65,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    rollItemPresent: {
        backgroundColor: '#dcfce7',
        borderColor: COLORS.success,
    },
    rollItemAbsent: {
        backgroundColor: COLORS.card,
    },
    rollText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    rollTextPresent: {
        color: COLORS.success,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.text.secondary,
        marginTop: SPACING.xl,
    },
    footer: {
        marginTop: SPACING.xl,
        marginBottom: 40,
    }
});
