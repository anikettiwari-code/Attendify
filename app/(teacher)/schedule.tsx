import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, Alert, Modal, TextInput, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../lib/theme';
import { useAuth } from '../../context/AuthContext';
import { supabaseAdmin } from '../../lib/supabase';
import { classService } from '../../services/classService';
import { Button } from '../../components/ui/Button';
import { Calendar, Plus, X, Users, MapPin, Trash2, AlertCircle } from 'lucide-react-native';
import { getLocalDateString } from '../../lib/constants';

export default function FacultySchedule() {
    const { profile } = useAuth();
    const [lectures, setLectures] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form state
    const [subject, setSubject] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [date, setDate] = useState(getLocalDateString());
    const [roomNo, setRoomNo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (profile?.id) {
            fetchSchedule();
            fetchClasses();
        }
    }, [profile]);

    const fetchSchedule = useCallback(async () => {
        if (!profile?.id) return;
        try {
            setLoading(true);
            // Fetch ALL upcoming lectures for this teacher (not just today)
            const { data, error } = await supabaseAdmin
                .from('lectures')
                .select(`
                    *,
                    class:classes(name, student_count)
                `)
                .eq('teacher_id', profile.id)
                .gte('lecture_date', getLocalDateString()) // today and future
                .order('lecture_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (error) {
                console.error('Fetch schedule error:', JSON.stringify(error));
                return;
            }
            setLectures(data || []);
        } catch (e) {
            console.error('fetchSchedule exception:', e);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    const fetchClasses = async () => {
        try {
            const data = await classService.getAllClasses();
            setClasses(data);
            if (data.length > 0) setSelectedClassId(data[0].id);
        } catch (error) {
            console.error('fetchClasses error:', error);
        }
    };

    const resetForm = () => {
        setSubject('');
        setStartTime('09:00');
        setEndTime('10:00');
        setDate(getLocalDateString());
        setRoomNo('');
        setErrorMsg(null);
    };

    const handleAddLecture = async () => {
        setErrorMsg(null);

        // Validate required fields
        if (!subject.trim()) {
            setErrorMsg('Subject is required.');
            return;
        }
        if (!selectedClassId) {
            setErrorMsg('Please select a class.');
            return;
        }
        if (!startTime.match(/^\d{2}:\d{2}$/)) {
            setErrorMsg('Start time must be in HH:MM format (e.g. 09:00).');
            return;
        }
        if (!endTime.match(/^\d{2}:\d{2}$/)) {
            setErrorMsg('End time must be in HH:MM format (e.g. 10:00).');
            return;
        }
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            setErrorMsg('Date must be in YYYY-MM-DD format (e.g. 2026-03-09).');
            return;
        }
        if (!profile?.id) {
            setErrorMsg('User session not found. Please log in again.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                teacher_id: profile.id,
                class_id: selectedClassId,
                subject: subject.trim(),
                lecture_date: date,
                start_time: startTime + ':00', // ensure HH:MM:SS format
                end_time: endTime + ':00',
                room_no: roomNo.trim() || null,
            };

            console.log('Inserting lecture payload:', JSON.stringify(payload));

            const { data: inserted, error } = await supabaseAdmin
                .from('lectures')
                .insert(payload)
                .select()
                .single();

            if (error) {
                console.error('Insert error details:', JSON.stringify(error));
                setErrorMsg(`Save failed: ${error.message || JSON.stringify(error)}`);
                return;
            }

            console.log('Lecture saved successfully:', inserted?.id);

            // Close modal, reset form, refresh
            setModalVisible(false);
            resetForm();

            // Refresh schedule list
            await fetchSchedule();

            setSuccessMsg('✅ Lecture scheduled successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);

        } catch (exception: any) {
            console.error('handleAddLecture exception:', exception);
            setErrorMsg(`Unexpected error: ${exception?.message || String(exception)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLecture = (id: string, subjectName: string) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm(`Delete Lecture\nAre you sure you want to delete "${subjectName}"?`);
            if (confirmed) {
                (async () => {
                    try {
                        const { error } = await supabaseAdmin.from('lectures').delete().eq('id', id);
                        if (error) throw error;
                        fetchSchedule();
                    } catch (error: any) {
                        window.alert(`Error: ${error.message || 'Failed to delete'}`);
                    }
                })();
            }
            return;
        }

        Alert.alert(
            'Delete Lecture',
            `Delete "${subjectName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabaseAdmin
                                .from('lectures')
                                .delete()
                                .eq('id', id);
                            if (error) throw error;
                            fetchSchedule();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr + 'T00:00:00');
            const today = getLocalDateString();
            if (dateStr === today) return 'Today';
            return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch { return dateStr; }
    };

    const renderLecture = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.datePill}>
                <Text style={styles.datePillText}>{formatDate(item.lecture_date)}</Text>
            </View>
            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{item.start_time.substring(0, 5)}</Text>
                <View style={styles.timeDivider} />
                <Text style={styles.timeText}>{item.end_time.substring(0, 5)}</Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.subjectText}>{item.subject}</Text>
                <View style={styles.metaRow}>
                    <Users size={14} color={COLORS.text.secondary} />
                    <Text style={styles.classText}>{item.class?.name || 'Class'}</Text>
                </View>
                <View style={styles.metaRow}>
                    <MapPin size={14} color={COLORS.text.light} />
                    <Text style={styles.roomText}>{item.room_no || 'TBD'}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteLecture(item.id, item.subject)}
            >
                <Trash2 size={20} color={COLORS.danger} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Schedule</Text>
                    <Text style={styles.subtitle}>Upcoming lectures</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => { resetForm(); setModalVisible(true); }}
                    activeOpacity={0.8}
                >
                    <Plus size={24} color="#fff" strokeWidth={3} />
                </TouchableOpacity>
            </View>

            {/* Success banner */}
            {successMsg && (
                <View style={styles.successBanner}>
                    <Text style={styles.successText}>{successMsg}</Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : (
                <FlatList
                    data={lectures}
                    renderItem={renderLecture}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    onRefresh={fetchSchedule}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Calendar size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>No upcoming lectures</Text>
                            <Text style={styles.emptySubText}>Tap + to schedule one</Text>
                        </View>
                    }
                />
            )}

            {/* Add Lecture Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => { setModalVisible(false); resetForm(); }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Schedule Lecture</Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <X size={24} color={COLORS.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.form}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Error message inside modal */}
                            {errorMsg && (
                                <View style={styles.errorBox}>
                                    <AlertCircle size={16} color={COLORS.danger} />
                                    <Text style={styles.errorBoxText}>{errorMsg}</Text>
                                </View>
                            )}

                            {/* SUBJECT — most important, shown first */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>SUBJECT *</Text>
                                <TextInput
                                    style={[styles.input, !subject.trim() && errorMsg ? styles.inputError : null]}
                                    placeholder="e.g. Advanced Algorithms"
                                    value={subject}
                                    onChangeText={(v) => { setSubject(v); setErrorMsg(null); }}
                                    placeholderTextColor={COLORS.text.light}
                                    autoFocus
                                />
                            </View>

                            {/* DATE */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>DATE (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={date}
                                    onChangeText={setDate}
                                    placeholder="2026-03-09"
                                    placeholderTextColor={COLORS.text.light}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* TIME ROW */}
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.label}>START TIME</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={startTime}
                                        onChangeText={setStartTime}
                                        placeholder="09:00"
                                        placeholderTextColor={COLORS.text.light}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>END TIME</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={endTime}
                                        onChangeText={setEndTime}
                                        placeholder="10:00"
                                        placeholderTextColor={COLORS.text.light}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            {/* CLASS SELECTOR */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>SELECT CLASS *</Text>
                                <View style={styles.classSelectorWrapper}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {classes.length === 0 ? (
                                            <ActivityIndicator color={COLORS.primary} />
                                        ) : (
                                            classes.map((c) => (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    style={[styles.classOption, selectedClassId === c.id && styles.classOptionActive]}
                                                    onPress={() => setSelectedClassId(c.id)}
                                                >
                                                    <Text style={[styles.classOptionText, selectedClassId === c.id && styles.classOptionTextActive]}>
                                                        {c.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                            </View>

                            {/* ROOM */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>ROOM / LAB</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Lab 302"
                                    value={roomNo}
                                    onChangeText={setRoomNo}
                                    placeholderTextColor={COLORS.text.light}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                                onPress={handleAddLecture}
                                disabled={isSubmitting}
                                activeOpacity={0.8}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Add to Schedule</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.lg,
        backgroundColor: COLORS.card,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...SHADOWS.sm,
    },
    addButton: {
        backgroundColor: COLORS.success,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.md,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: 4,
    },
    listContent: {
        padding: SPACING.lg,
        paddingBottom: 40,
    },
    successBanner: {
        backgroundColor: '#dcfce7',
        padding: SPACING.md,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
        borderRadius: RADIUS.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.success,
    },
    successText: {
        color: '#166534',
        fontWeight: '600',
        fontSize: 14,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    datePill: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        marginRight: SPACING.sm,
        minWidth: 55,
        alignItems: 'center',
    },
    datePillText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primary,
    },
    timeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: SPACING.md,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
        width: 65,
    },
    timeText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primary,
    },
    timeDivider: {
        height: 10,
        width: 2,
        backgroundColor: '#e2e8f0',
        marginVertical: 3,
        borderRadius: 1,
    },
    infoContainer: {
        flex: 1,
        paddingLeft: SPACING.md,
    },
    deleteBtn: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: SPACING.sm,
    },
    subjectText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    classText: {
        fontSize: 13,
        color: COLORS.text.secondary,
        marginLeft: 6,
    },
    roomText: {
        fontSize: 12,
        color: COLORS.text.light,
        marginLeft: 6,
    },
    loader: {
        marginTop: 50,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: SPACING.md,
        color: COLORS.text.secondary,
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubText: {
        color: COLORS.text.light,
        fontSize: 14,
        marginTop: 4,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: SPACING.lg,
        height: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    form: {
        flex: 1,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#fee2e2',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.danger,
    },
    errorBoxText: {
        flex: 1,
        color: '#991b1b',
        fontSize: 14,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.text.secondary,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#f4f4f5',
        borderRadius: RADIUS.md,
        height: 48,
        fontSize: 15,
        color: COLORS.text.primary,
        paddingHorizontal: SPACING.md,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inputError: {
        borderColor: COLORS.danger,
        backgroundColor: '#fff5f5',
    },
    classSelectorWrapper: {
        minHeight: 48,
        justifyContent: 'center',
    },
    classOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 10,
        height: 44,
        justifyContent: 'center',
    },
    classOptionActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    classOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text.secondary,
    },
    classOptionTextActive: {
        color: '#fff',
    },
    submitBtn: {
        backgroundColor: COLORS.success,
        borderRadius: RADIUS.md,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.md,
        ...SHADOWS.md,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
