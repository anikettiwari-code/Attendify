import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { lectureService } from '../../services/lectureService';
import { Clock, MapPin, User } from 'lucide-react-native';
import { getLocalDateString } from '../../lib/constants';

export default function StudentSchedule() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lectures, setLectures] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchSchedule = async () => {
    if (!profile?.class_id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const dateStr = getLocalDateString(selectedDate);
      const data = await lectureService.getStudentSchedule(profile.class_id, dateStr);
      setLectures(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [profile, selectedDate]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Class Schedule</Text>
        <Text style={styles.date}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSchedule} />}
      >
        {(!profile?.class_id) ? (
           <View style={styles.emptyState}>
             <Text style={styles.emptyText}>You are not assigned to any class yet.</Text>
           </View>
        ) : lectures.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No lectures scheduled for today.</Text>
          </View>
        ) : (
          lectures.map((lecture) => (
            <View key={lecture.id} style={styles.timelineItem}>
              <View style={styles.timeColumn}>
                <Text style={styles.startTime}>{lecture.start_time.slice(0, 5)}</Text>
                <Text style={styles.endTime}>{lecture.end_time.slice(0, 5)}</Text>
              </View>
              
              <Card style={styles.lectureCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.subject}>{lecture.subject}</Text>
                  <View style={styles.roomBadge}>
                    <MapPin size={12} color={COLORS.primary} />
                    <Text style={styles.roomText}>{lecture.room_no}</Text>
                  </View>
                </View>
                
                <View style={styles.teacherRow}>
                  <User size={14} color={COLORS.text.secondary} />
                  <Text style={styles.teacherName}>{lecture.teacher?.full_name || 'TBA'}</Text>
                </View>

                <View style={styles.timeRow}>
                  <Clock size={14} color={COLORS.text.light} />
                  <Text style={styles.duration}>
                    {lecture.start_time.slice(0, 5)} - {lecture.end_time.slice(0, 5)}
                  </Text>
                </View>
              </Card>
            </View>
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
  date: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  content: {
    padding: SPACING.md,
  },
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  timeColumn: {
    width: 50,
    alignItems: 'center',
    paddingTop: SPACING.sm,
    marginRight: SPACING.sm,
  },
  startTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  endTime: {
    fontSize: 12,
    color: COLORS.text.light,
    marginTop: 4,
  },
  lectureCard: {
    flex: 1,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  subject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  roomText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  teacherName: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  duration: {
    fontSize: 12,
    color: COLORS.text.light,
  },
});
