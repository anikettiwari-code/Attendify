import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { Calendar, CheckCircle, XCircle } from 'lucide-react-native';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [historyData, statsData] = await Promise.all([
        attendanceService.getStudentAttendance(user.id),
        attendanceService.getStudentStats(user.id)
      ]);
      setHistory(historyData || []);
      setStats(statsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance History</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
      >
        {/* Overall Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.circularProgress}>
            <Text style={styles.percentage}>{stats.percentage}%</Text>
            <Text style={styles.percentageLabel}>Overall</Text>
          </View>
          <View style={styles.statsDetail}>
            <View style={styles.statRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.statText}>Present: {stats.present}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.statText}>Absent: {stats.total - stats.present}</Text>
            </View>
            <View style={styles.statRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.text.light }]} />
              <Text style={styles.statText}>Total Lectures: {stats.total}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No attendance records found.</Text>
          </View>
        ) : (
          history.map((record) => (
            <Card key={record.id} style={styles.recordCard}>
              <View style={styles.recordLeft}>
                <Text style={styles.subject}>{record.lecture?.subject || 'Unknown Subject'}</Text>
                <View style={styles.dateRow}>
                  <Calendar size={14} color={COLORS.text.secondary} />
                  <Text style={styles.date}>
                    {new Date(record.marked_at).toLocaleDateString()} • {new Date(record.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <View style={styles.recordRight}>
                {record.status === 'Present' ? (
                  <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                    <CheckCircle size={14} color={COLORS.success} />
                    <Text style={[styles.badgeText, { color: COLORS.success }]}>Present</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
                    <XCircle size={14} color={COLORS.danger} />
                    <Text style={[styles.badgeText, { color: COLORS.danger }]}>Absent</Text>
                  </View>
                )}
                <Text style={styles.method}>{record.method}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  circularProgress: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  percentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  percentageLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  statsDetail: {
    flex: 1,
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.text.secondary,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLeft: {
    gap: 4,
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  recordRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  method: {
    fontSize: 10,
    color: COLORS.text.light,
    textTransform: 'uppercase',
  },
});
