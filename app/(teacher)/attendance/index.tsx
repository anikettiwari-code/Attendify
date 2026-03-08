import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../../lib/theme';
import { Card } from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import { classService } from '../../../services/classService';
import { lectureService } from '../../../services/lectureService';
import { Class, Lecture } from '../../../types';
import { Users, ChevronRight, Calendar } from 'lucide-react-native';

export default function ClassSelectionScreen() {
    const { profile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<Class[]>([]);

    // We can either fetch all classes or filter by what the teacher actually teaches.
    // Since the database schema doesn't explicitly link Teachers <-> Classes (only via Lectures),
    // we'll fetch the teacher's schedule to find their classes, OR just fetch all classes 
    // if the system assumes teachers can mark attendance for any class.
    // For a better UX, let's fetch ALL classes for now as per "distinct list" requirement.

    const loadClasses = useCallback(async () => {
        try {
            setLoading(true);
            const allClasses = await classService.getAllClasses();
            setClasses(allClasses);
        } catch (error) {
            console.error('Failed to load classes', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadClasses();
    }, [loadClasses]);

    const handleClassSelect = (cls: Class) => {
        router.push({
            pathname: '/(teacher)/attendance/[classId]',
            params: { classId: cls.id, className: cls.name }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Select Class</Text>
                <Text style={styles.subtitle}>Choose a class to mark attendance</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadClasses} />}
                >
                    {classes.map((cls) => (
                        <TouchableOpacity key={cls.id} onPress={() => handleClassSelect(cls)}>
                            <Card style={styles.classCard}>
                                <View style={styles.cardLeft}>
                                    <View style={styles.iconBox}>
                                        <Users size={24} color={COLORS.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.className}>{cls.name}</Text>
                                        <Text style={styles.studentCount}>
                                            {cls.student_count || 0} Students
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={20} color={COLORS.text.light} />
                            </Card>
                        </TouchableOpacity>
                    ))}

                    {classes.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No classes found.</Text>
                        </View>
                    )}
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
        padding: SPACING.md,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: SPACING.md,
        gap: SPACING.md,
    },
    classCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
        backgroundColor: '#e0e7ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    className: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    studentCount: {
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    emptyState: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.text.light,
    },
});
