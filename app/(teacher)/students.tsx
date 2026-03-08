import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../lib/theme';
import { Card } from '../../components/ui/Card';
import { Search, User, ChevronDown, Filter, CheckCircle, XCircle, Camera } from 'lucide-react-native';
import { classService } from '../../services/classService';
import { approvalService } from '../../services/approvalService';
import { Class, Profile, StudentPhoto } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function StudentsList() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Profile[]>([]);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'pending'>('all');
  const [pendingPhotos, setPendingPhotos] = useState<Record<string, StudentPhoto[]>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Student details modal state
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<Profile | null>(null);
  const [studentModalVisible, setStudentModalVisible] = useState(false);

  const { profile } = useAuth();

  // Load Classes
  const loadClasses = async () => {
    try {
      const data = await classService.getAllClasses();
      setClasses(data);
      if (data.length > 0) {
        setSelectedClass(data[0]);
      }
    } catch (error) {
      console.error('Failed to load classes', error);
    } finally {
      // We don't stop loading here because we still need to load students
    }
  };

  // Load Students for selected class
  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);

      let data: Profile[] = [];
      if (filterType === 'pending') {
        data = await approvalService.getPendingStudents();

        // Fetch photos for each pending student
        const photoMap: Record<string, StudentPhoto[]> = {};
        await Promise.all(data.map(async (s) => {
          const photos = await approvalService.getStudentPhotos(s.id);
          photoMap[s.id] = photos;
        }));
        setPendingPhotos(photoMap);
      } else if (selectedClass) {
        data = await classService.getClassStudents(selectedClass.id);
      }

      setStudents(data);
    } catch (error) {
      console.error('Failed to load students', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, filterType]);

  const handleApprove = async (studentId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Approve Enrollment\nThis will enable AI recognition for this student. Proceed?');
      if (confirmed) {
        setProcessingId(studentId);
        try {
          await approvalService.approveStudent(studentId, profile?.id);
          setStudents(prev => prev.filter(s => s.id !== studentId));
          window.alert('✅ Approved: Student enrollment approved successfully.');
        } catch (e: any) {
          console.error('Approval error:', JSON.stringify(e));
          window.alert(`Error: Failed to approve: ${e?.message || JSON.stringify(e)}`);
        } finally {
          setProcessingId(null);
        }
      }
      return;
    }

    Alert.alert(
      'Approve Enrollment',
      'This will enable AI recognition for this student. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(studentId);
            try {
              await approvalService.approveStudent(studentId, profile?.id);
              setStudents(prev => prev.filter(s => s.id !== studentId));
              Alert.alert('✅ Approved', 'Student enrollment approved successfully.');
            } catch (e: any) {
              console.error('Approval error:', JSON.stringify(e));
              Alert.alert('Error', `Failed to approve: ${e?.message || JSON.stringify(e)}`);
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const handleReject = async (studentId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Reject Enrollment\nThis will delete the student\'s enrollment photos. Proceed?');
      if (confirmed) {
        setProcessingId(studentId);
        try {
          await approvalService.rejectStudent(studentId, profile?.id);
          setStudents(prev => prev.filter(s => s.id !== studentId));
          window.alert('Done: Student enrollment rejected.');
        } catch (e: any) {
          console.error('Rejection error:', JSON.stringify(e));
          window.alert(`Error: Failed to reject: ${e?.message || JSON.stringify(e)}`);
        } finally {
          setProcessingId(null);
        }
      }
      return;
    }

    Alert.alert(
      'Reject Enrollment',
      'This will delete the student\'s enrollment photos. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(studentId);
            try {
              await approvalService.rejectStudent(studentId, profile?.id);
              setStudents(prev => prev.filter(s => s.id !== studentId));
              Alert.alert('Done', 'Student enrollment rejected.');
            } catch (e: any) {
              console.error('Rejection error:', JSON.stringify(e));
              Alert.alert('Error', `Failed to reject: ${e?.message || JSON.stringify(e)}`);
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = students.filter(s =>
    (s.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (s.roll_no || '').includes(search)
  );

  const renderClassSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.label}>Select Class</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowClassSelector(!showClassSelector)}
      >
        <Text style={styles.selectorText}>{selectedClass?.name || "Loading..."}</Text>
        <ChevronDown size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      {showClassSelector && (
        <View style={styles.dropdown}>
          {classes.map(cls => (
            <TouchableOpacity
              key={cls.id}
              style={[
                styles.dropdownItem,
                cls.id === selectedClass?.id && styles.dropdownItemActive
              ]}
              onPress={() => {
                setSelectedClass(cls);
                setShowClassSelector(false);
              }}
            >
              <Text style={[
                styles.dropdownText,
                cls.id === selectedClass?.id && styles.dropdownTextActive
              ]}>
                {cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Students Directory</Text>
        <Text style={styles.subtitle}>Manage and view student lists</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
            All Students
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filterType === 'pending' && styles.filterTabActive]}
          onPress={() => setFilterType('pending')}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.filterTabText, filterType === 'pending' && styles.filterTabTextActive]}>
              Pending Approvals
            </Text>
            {/* Show badge if pending students exist */}
            {filterType !== 'pending' && students.some(s => s.enrollment_status === 'pending') && (
              <View style={styles.badge} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Class Selector Section - Only show when "All" is selected */}
      {filterType === 'all' && renderClassSelector()}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={COLORS.text.light} />
          <TextInput
            style={styles.searchInput}
            placeholder={filterType === 'all' ? `Search in ${selectedClass?.name || 'class'}...` : "Search pending..."}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.text.light}
          />
        </View>
      </View>

      {/* Student List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {search ? "No matches found" : filterType === 'pending' ? "No pending enrollments" : "No students in this class"}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => {
                setSelectedStudentDetails(item);
                setStudentModalVisible(true);
              }}
            >
              <Card style={[styles.studentCard, filterType === 'pending' && styles.pendingCard]}>
                <View style={styles.cardHeader}>
                <View style={[styles.avatar, item.avatar_url ? {} : styles.avatarPlaceholder]}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <User size={20} color={COLORS.text.light} />
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.full_name || 'Unknown Name'}</Text>
                  <View style={styles.row}>
                    <Text style={styles.details}>Roll No: {item.roll_no || 'N/A'}</Text>
                    {item.enrollment_status && (
                      <>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={[
                          styles.statusText,
                          item.enrollment_status === 'approved' && { color: COLORS.success },
                          item.enrollment_status === 'pending' && { color: COLORS.warning },
                        ]}>
                          {item.enrollment_status.toUpperCase()}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {filterType === 'pending' && (
                <View style={styles.approvalSection}>
                  <Text style={styles.approvalLabel}>Enrollment Photos (5)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                    {pendingPhotos[item.id]?.map((p, idx) => (
                      <View key={p.id} style={styles.thumbnailWrapper}>
                        <Image source={{ uri: p.photo_url }} style={styles.thumbnail} />
                      </View>
                    ))}
                    {!pendingPhotos[item.id] && <ActivityIndicator size="small" />}
                  </ScrollView>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(item.id)}
                      disabled={processingId === item.id}
                    >
                      <CheckCircle size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleReject(item.id)}
                      disabled={processingId === item.id}
                    >
                      <XCircle size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Student Details Modal */}
      {selectedStudentDetails && (
        <Modal
          visible={studentModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setStudentModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary }}>Student Details</Text>
                <TouchableOpacity onPress={() => setStudentModalVisible(false)}>
                  <XCircle size={24} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
                <View style={[styles.avatar, { width: 80, height: 80 }, selectedStudentDetails.avatar_url ? {} : styles.avatarPlaceholder]}>
                  {selectedStudentDetails.avatar_url ? (
                    <Image source={{ uri: selectedStudentDetails.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <User size={40} color={COLORS.text.light} />
                  )}
                </View>
                <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: SPACING.sm }}>
                  {selectedStudentDetails.full_name}
                </Text>
                <Text style={{ fontSize: 16, color: COLORS.text.secondary }}>
                  {selectedStudentDetails.email}
                </Text>
              </View>

              <View style={{ gap: SPACING.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.xs }}>
                  <Text style={{ color: COLORS.text.secondary }}>Roll Number:</Text>
                  <Text style={{ fontWeight: '600' }}>{selectedStudentDetails.roll_no || 'N/A'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.xs }}>
                  <Text style={{ color: COLORS.text.secondary }}>Department:</Text>
                  <Text style={{ fontWeight: '600' }}>{selectedStudentDetails.department || 'N/A'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: SPACING.xs }}>
                  <Text style={{ color: COLORS.text.secondary }}>Status:</Text>
                  <Text style={[{ fontWeight: 'bold' }, 
                    selectedStudentDetails.enrollment_status === 'approved' && { color: COLORS.success },
                    selectedStudentDetails.enrollment_status === 'pending' && { color: COLORS.warning }
                  ]}>{selectedStudentDetails.enrollment_status?.toUpperCase() || 'N/A'}</Text>
                </View>
              </View>

            </View>
          </View>
        </Modal>
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
  selectorContainer: {
    padding: SPACING.md,
    zIndex: 10, // Ensure dropdown floats above list
  },
  label: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  selectorText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
    position: 'absolute',
    top: 70,
    left: SPACING.md,
    right: SPACING.md,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.input,
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownText: {
    fontSize: 16,
    color: COLORS.text.primary,
  },
  dropdownTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 48,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    height: '100%',
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: 0,
    gap: SPACING.sm,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentCard: {
    padding: SPACING.md,
  },
  pendingCard: {
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    backgroundColor: '#f1f5f9',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  details: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bullet: {
    marginHorizontal: 6,
    color: COLORS.text.light,
  },
  approvalSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.input,
  },
  approvalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  photoList: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginRight: SPACING.sm,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.danger,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: 16,
  },
});
