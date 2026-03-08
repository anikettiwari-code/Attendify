import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, RefreshControl, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../lib/theme';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Bell, Plus, X } from 'lucide-react-native';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function TeacherNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('GENERAL');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleCreateNotification = async () => {
    if (!profile?.id) {
      Alert.alert('Error', 'User session not found. Please log in again.');
      return;
    }

    if (!title || !body) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await notificationService.createNotification({
        sender_id: profile!.id,
        title,
        body,
        type: type.toLowerCase(),
        is_urgent: isUrgent
      } as any);

      setModalVisible(false);
      setTitle('');
      setBody('');
      loadNotifications();
      Alert.alert('Success', 'Notification posted successfully');
    } catch (error: any) {
      console.error('Failed to create notification', error);
      Alert.alert('Error', error.message || 'Failed to post notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'exam': return { color: COLORS.danger, bg: '#fee2e2' };
      case 'holiday': return { color: COLORS.warning, bg: '#fef3c7' };
      case 'system': return { color: COLORS.success, bg: '#dcfce7' };
      case 'enrollment': return { color: COLORS.primary, bg: '#e0e7ff' };
      case 'alert': return { color: COLORS.danger, bg: '#fee2e2' };
      default: return { color: COLORS.primary, bg: '#e0e7ff' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.headerSubtitle}>Add & Manage Notifications</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={24} color="#fff" strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            notifications.map(notif => {
              const iconTheme = renderIcon(notif.type);
              return (
                <Card key={notif.id} style={styles.notifCard}>
                  <View style={[styles.iconBox, { backgroundColor: iconTheme.bg }]}>
                    <Bell size={20} color={iconTheme.color} />
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.notifHeader}>
                      <Text style={styles.notifTitle}>{notif.title}</Text>
                      <Text style={styles.typeBadge}>{notif.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.notifBody}>{notif.body}</Text>
                    <Text style={styles.time}>
                      {notif.sender?.full_name ? `By ${notif.sender.full_name} • ` : ''}
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add Notification Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post New Notice</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>TITLE</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Holiday Announcement"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={COLORS.text.light}
              />

              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter details..."
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={4}
                placeholderTextColor={COLORS.text.light}
              />

              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>TYPE (EXAM/EVENT/GENERAL)</Text>
                  <View style={styles.typeContainer}>
                    {['GENERAL', 'EXAM', 'EVENT'].map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeButton, type === t && styles.typeButtonActive]}
                        onPress={() => setType(t)}
                      >
                        <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.label}>URGENT?</Text>
                  <Switch
                    value={isUrgent}
                    onValueChange={setIsUrgent}
                    trackColor={{ false: '#e2e8f0', true: COLORS.success }}
                  />
                </View>
              </View>

              <Button
                label={isSubmitting ? "Posting..." : "Post Notice"}
                onPress={handleCreateNotification}
                disabled={isSubmitting}
                style={styles.submitBtn}
              />
            </View>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  notifCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text.light,
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  notifBody: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  time: {
    fontSize: 12,
    color: COLORS.text.light,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.text.secondary,
  },
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
    paddingBottom: SPACING.xxl,
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  form: {
    gap: SPACING.md,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.secondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f4f4f5',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#f4f4f5',
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  submitBtn: {
    marginTop: SPACING.lg,
    backgroundColor: '#2d7a3a',
  },
});
