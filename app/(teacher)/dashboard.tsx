import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, BookOpen, Clock, Calendar as CalendarIcon, ChevronRight, Plus, Bell } from 'lucide-react-native';
import { useLectures } from '../../hooks/useLectures';
import { Lecture } from '../../types';
import { useRouter } from 'expo-router';
import { notificationService } from '../../services/notificationService';
import { getLocalDateString } from '../../lib/constants';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const { fetchTeacherSchedule, loading } = useLectures();
  const [schedule, setSchedule] = useState<Lecture[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    const dateStr = getLocalDateString();

    // Load schedule
    const scheduleData = await fetchTeacherSchedule(profile.id, dateStr);
    if (scheduleData) setSchedule(scheduleData);

    // Load recent alerts
    try {
      const alertsData = await notificationService.getNotifications();
      setRecentAlerts(alertsData.slice(0, 3)); // show only top 3
    } catch (e) {
      console.error(e);
    }
  }, [profile, fetchTeacherSchedule]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeClassesCount = new Set(schedule.map(l => l.class_id)).size;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome, Prof. {profile?.full_name?.split(' ')[1] || 'Teacher'}</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
              <Users color={COLORS.primary} size={24} />
            </View>
            <Text style={styles.statValue}>{activeClassesCount}</Text>
            <Text style={styles.statLabel}>Active Classes</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: '#fce7f3' }]}>
              <BookOpen color={COLORS.danger} size={24} />
            </View>
            <Text style={styles.statValue}>{schedule.length}</Text>
            <Text style={styles.statLabel}>Lectures Today</Text>
          </Card>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Lectures</Text>
          <TouchableOpacity
            style={styles.inlineAddBtn}
            onPress={() => router.push('/(teacher)/schedule')}
          >
            <Plus size={18} color={COLORS.success} strokeWidth={3} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleList}>
          {schedule.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarIcon size={40} color={COLORS.text.light} />
              <Text style={styles.emptyText}>No lectures scheduled for today.</Text>
            </View>
          ) : (
            schedule.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push({
                  pathname: '/(teacher)/attendance',
                  params: { lectureId: item.id }
                })}
              >
                <Card style={styles.scheduleItem}>
                  <View style={styles.scheduleLeft}>
                    <Text style={styles.subject}>{item.subject}</Text>
                    <Text style={styles.classInfo}>{item.class?.name}</Text>
                    <View style={styles.timeRow}>
                      <Clock size={14} color={COLORS.text.secondary} />
                      <Text style={styles.time}>{item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}</Text>
                    </View>
                  </View>
                  <View style={styles.scheduleRight}>
                    <View style={styles.roomBadge}>
                      <Text style={styles.room}>Room {item.room_no}</Text>
                    </View>
                    <ChevronRight size={20} color={COLORS.text.light} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={[styles.sectionHeader, { marginTop: SPACING.lg }]}>
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
          <TouchableOpacity
            style={styles.inlineAddBtn}
            onPress={() => router.push('/(teacher)/notifications')}
          >
            <Plus size={18} color={COLORS.success} strokeWidth={3} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertsList}>
          {recentAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={40} color={COLORS.text.light} />
              <Text style={styles.emptyText}>No recent alerts.</Text>
            </View>
          ) : (
            recentAlerts.map((alert) => (
              <TouchableOpacity key={alert.id} onPress={() => router.push('/(teacher)/notifications')}>
                <Card style={styles.alertItem}>
                  <View style={[styles.alertIcon, { backgroundColor: '#fef3c7' }]}>
                    <Bell size={18} color={COLORS.warning} />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertBody} numberOfLines={1}>{alert.body}</Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.text.light} />
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
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
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    ...SHADOWS.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  scheduleList: {
    gap: SPACING.md,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  scheduleLeft: {
    gap: 4,
    flex: 1,
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  classInfo: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  scheduleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  room: {
    fontSize: 12,
    color: COLORS.text.light,
    fontWeight: '600',
  },
  alertsList: {
    gap: SPACING.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  alertBody: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyText: {
    color: COLORS.text.light,
    fontSize: 14,
  },
});
