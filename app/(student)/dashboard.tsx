import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, CheckCircle, Clock, MapPin, ScanFace } from 'lucide-react-native';
import { useAttendance } from '../../hooks/useAttendance';
import { useLectures } from '../../hooks/useLectures';
import { Lecture } from '../../types';
import { useRouter } from 'expo-router';
import { getLocalDateString } from '../../lib/constants';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const { fetchStudentStats, loading: statsLoading } = useAttendance();
  const { fetchStudentSchedule, loading: scheduleLoading } = useLectures();

  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });
  const [schedule, setSchedule] = useState<Lecture[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;

    const [statsData, scheduleData] = await Promise.all([
      fetchStudentStats(profile.id),
      profile.class_id ? fetchStudentSchedule(profile.class_id, getLocalDateString()) : Promise.resolve([]),
    ]);

    if (statsData) setStats(statsData);
    if (scheduleData) setSchedule(scheduleData);
  }, [profile, fetchStudentStats, fetchStudentSchedule]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isLoading = statsLoading || scheduleLoading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] || 'Student'} 👋</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.donutCard}>
            <View style={styles.donutPlaceholder}>
              {/* Circular progress simulation */}
              <View style={[styles.donutCircle, { borderColor: COLORS.primary }]}>
                <Text style={styles.donutValue}>{stats.percentage}%</Text>
                <Text style={styles.donutLabel}>Attendance</Text>
              </View>
            </View>
            <View style={styles.donutLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>Present: {stats.present}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#e2e8f0' }]} />
                <Text style={styles.legendText}>Total: {stats.total}</Text>
              </View>
            </View>
          </Card>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#eef2ff' }]}
              onPress={() => router.push('/(student)/profile')}
            >
              <ScanFace color={COLORS.primary} size={24} />
              <Text style={styles.actionText}>Enroll Face</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ecfdf5' }]}
              onPress={() => router.push('/(student)/attendance')}
            >
              <Calendar color={COLORS.success} size={24} />
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {isLoading && !refreshing && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>

        <View style={styles.scheduleList}>
          {schedule.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color={COLORS.text.light} />
              <Text style={styles.emptyText}>No lectures scheduled for today</Text>
            </View>
          ) : (
            schedule.map((item) => (
              <Card key={item.id} style={styles.scheduleItem}>
                <View style={styles.scheduleLeft}>
                  <Text style={styles.subject}>{item.subject}</Text>
                  <Text style={styles.teacherName}>Prof. {item.teacher?.full_name}</Text>
                  <View style={styles.infoRow}>
                    <Clock size={14} color={COLORS.text.secondary} />
                    <Text style={styles.infoText}>{item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MapPin size={14} color={COLORS.text.secondary} />
                    <Text style={styles.infoText}>Room: {item.room_no}</Text>
                  </View>
                </View>
                <View style={styles.scheduleRight}>
                  {/* Status badge could be determined by checking if an attendance record exists for this lecture */}
                  <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
                    <Text style={[styles.statusText, { color: COLORS.text.secondary }]}>
                      Upcoming
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  date: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  donutCard: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  donutPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  donutLabel: {
    fontSize: 8,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
  },
  donutLegend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  quickActions: {
    flex: 1,
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...SHADOWS.sm,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  scheduleList: {
    gap: SPACING.md,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleLeft: {
    gap: 4,
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  teacherName: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  scheduleRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text.light,
    fontSize: 14,
  },
});
