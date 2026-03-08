import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, LogOut, User, CheckCircle2, Trash2, Plus } from 'lucide-react-native';
import { useEnrollment } from '../../hooks/useEnrollment';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { enrollmentService } from '../../services/enrollmentService';

const PHOTO_LABELS: Record<number, string> = {
  1: 'Front-facing',
  2: 'Slight left',
  3: 'Slight right',
  4: 'Glasses/Alt',
  5: 'Alt lighting',
};

export default function StudentProfile() {
  const { profile, signOut } = useAuth();
  const { enrolledPhotos, enrollmentStatus, loading, fetchEnrolledPhotos, uploadPhoto, removePhoto, submitForApproval } = useEnrollment();
  const [permissionResponse, requestPermission] = ImagePicker.useCameraPermissions();

  useEffect(() => {
    if (profile?.id) {
      fetchEnrolledPhotos(profile.id);
    }
  }, [profile, fetchEnrolledPhotos]);

  const handlePickImage = async (index: number) => {
    if (!profile?.id || enrollmentStatus === 'pending' || enrollmentStatus === 'approved') return;

    if (!permissionResponse?.granted) {
      const permission = await requestPermission();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to take photos for enrollment.');
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // Full quality for initial picker, we'll compress manually
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        // Architecture Rule: Minimum 480x480, max 2MB, compression to ≤ 500 KB
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 640, height: 640 } }], // Secure minimum 480x480
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        await uploadPhoto(profile.id, manipulated.uri, index, manipulated.base64);
        // Note: Automatic sync-to-backend removed in favor of teacher approval flow
      } catch (e) {
        Alert.alert('Upload Error', 'Failed to process or upload image.');
        console.error(e);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (!profile?.id || enrollmentStatus === 'pending' || enrollmentStatus === 'approved') return;

    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this enrollment photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removePhoto(profile.id, index)
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!profile?.id || !profile.class_id) {
      Alert.alert('Error', 'Missing profile information.');
      return;
    }

    Alert.alert(
      'Submit for Approval',
      'Are you sure you want to submit your photos for teacher approval? You won\'t be able to edit them until reviewed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            const success = await submitForApproval(profile.id, profile.class_id!);
            if (success) {
              Alert.alert('Success', 'Your enrollment photos have been submitted for approval.');
            } else {
              Alert.alert('Error', 'Failed to submit photos. Please try again.');
            }
          }
        },
      ]
    );
  };

  const enrollmentCount = enrolledPhotos.length;
  const isComplete = enrollmentCount === 5;
  const isLocked = enrollmentStatus === 'pending' || enrollmentStatus === 'approved';

  const getStatusColor = () => {
    switch (enrollmentStatus) {
      case 'approved': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'rejected': return COLORS.danger;
      default: return enrollmentCount >= 3 ? COLORS.primary : COLORS.danger;
    }
  };

  const getStatusText = () => {
    switch (enrollmentStatus) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending Review';
      case 'rejected': return 'Rejected';
      default: return enrollmentCount >= 5 ? 'Ready to Submit' : 'Incomplete';
    }
  };

  const renderPhotoSlot = (index: number) => {
    const photo = enrolledPhotos.find(p => p.photo_index === index);

    return (
      <View key={index} style={styles.photoSlot}>
        {photo ? (
          <View style={styles.photoWrapper}>
            <Image source={{ uri: photo.photo_url }} style={styles.photo} />
            {!isLocked && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemovePhoto(index)}
              >
                <Trash2 size={14} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={styles.indexBadge}>
              <CheckCircle2 size={12} color={COLORS.success} />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addBtn, isLocked && { opacity: 0.5 }]}
            onPress={() => handlePickImage(index)}
            disabled={loading || isLocked}
          >
            {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Plus size={24} color={COLORS.text.light} />}
            <Text style={styles.addText}>{PHOTO_LABELS[index] || `Slot ${index}`}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <User size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.name}>{profile?.full_name}</Text>
          <Text style={styles.role}>{profile?.role?.toUpperCase()}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          {profile?.roll_no && (
            <Text style={styles.rollNo}>Roll No: {profile.roll_no}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Face Enrollment</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionDesc}>
            Upload exactly 5 clear photos of your face from different angles for teacher verification.
          </Text>

          <View style={styles.photoGrid}>
            {[1, 2, 3, 4, 5].map(renderPhotoSlot)}
          </View>

          {enrollmentStatus === 'rejected' && (
            <View style={[styles.statusBox, styles.errorBox]}>
              <Text style={styles.statusBoxText}>
                Your photos were rejected. Please upload 5 clear, high-quality photos and re-submit.
              </Text>
            </View>
          )}

          {enrollmentStatus === 'pending' && (
            <View style={[styles.statusBox, styles.infoBox]}>
              <Text style={styles.statusBoxText}>
                Your photos are currently being reviewed by a teacher. You will be notified once approved.
              </Text>
            </View>
          )}

          {!isLocked && isComplete && (
            <Button
              label="Submit for Approval"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />
          )}

          {!isLocked && !isComplete && (
            <View style={styles.warningBox}>
              <Camera size={20} color={COLORS.warning} />
              <Text style={styles.warningText}>
                You must upload all 5 photos to submit for approval.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Button
            label="Sign Out"
            variant="outline"
            onPress={signOut}
            icon={<LogOut size={18} color={COLORS.danger} />}
            style={styles.signOutBtn}
            textStyle={{ color: COLORS.danger }}
          />
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
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  role: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },
  email: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  rollNo: {
    fontSize: 14,
    color: COLORS.text.light,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  photoSlot: {
    width: '28%',
    aspectRatio: 1,
    marginBottom: SPACING.sm,
  },
  photoWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.sm,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(244, 63, 94, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  indexBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 2,
  },
  addBtn: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  addText: {
    fontSize: 10,
    color: COLORS.text.light,
    marginTop: 4,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  statusBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  statusBoxText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: SPACING.lg,
  },
  footer: {
    marginTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  signOutBtn: {
    marginTop: SPACING.md,
  },
});
