import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Mail, User, GraduationCap, Building2, ChevronDown } from 'lucide-react-native';
import { Class } from '../../types';

import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('');
  const [classId, setClassId] = useState('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const router = useRouter();
  const { signInMock } = useAuth() as any;

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    // Silent fail if supabase not ready
    try {
      const { data, error } = await supabase.from('classes').select('*');
      if (!error) setClasses(data || []);
    } catch (e) { }
  };

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (role === 'student' && (!rollNo || !classId)) {
      Alert.alert('Error', 'Students must provide roll number and class');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'http://localhost:8081/(auth)/login',
          data: {
            full_name: fullName,
            role: role,
            roll_no: rollNo,
            department: department,
            class_id: classId,
          },
        },
      });

      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else if (data.user) {
        Alert.alert('Success', 'Account created! You can now log in.');
        router.replace('/(auth)/login');
      }
    } catch (e) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectClass = (cls: Class) => {
    setClassId(cls.id);
    setSelectedClass(cls);
    setShowClassPicker(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Attendify today</Text>
        </View>

        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleOption, role === 'student' && styles.roleActive]}
            onPress={() => setRole('student')}
          >
            <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, role === 'teacher' && styles.roleActive]}
            onPress={() => setRole('teacher')}
          >
            <Text style={[styles.roleText, role === 'teacher' && styles.roleTextActive]}>Teacher</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <User size={20} color={COLORS.text.secondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Mail size={20} color={COLORS.text.secondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Lock size={20} color={COLORS.text.secondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {role === 'student' && (
            <>
              <View style={styles.inputGroup}>
                <GraduationCap size={20} color={COLORS.text.secondary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Roll Number"
                  value={rollNo}
                  onChangeText={setRollNo}
                />
              </View>

              <TouchableOpacity
                style={styles.inputGroup}
                onPress={() => setShowClassPicker(true)}
              >
                <Building2 size={20} color={COLORS.text.secondary} style={styles.icon} />
                <Text style={[styles.input, !selectedClass && { color: COLORS.text.light }]}>
                  {selectedClass ? selectedClass.name : 'Select Class'}
                </Text>
                <ChevronDown size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.inputGroup}>
            <Building2 size={20} color={COLORS.text.secondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Department (Optional)"
              value={department}
              onChangeText={setDepartment}
            />
          </View>

          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showClassPicker}
        transparent={true}
        animationType="slide"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClassPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Class</Text>
            <FlatList
              data={classes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.classOption}
                  onPress={() => selectClass(item)}
                >
                  <Text style={styles.classOptionText}>{item.name}</Text>
                  <Text style={styles.classOptionDept}>{item.department}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  roleActive: {
    backgroundColor: COLORS.primary,
  },
  roleText: {
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  roleTextActive: {
    color: '#fff',
  },
  form: {
    gap: SPACING.md,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 56,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  button: {
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  footerText: {
    color: COLORS.text.secondary,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  classOption: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  classOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  classOptionDept: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
});
