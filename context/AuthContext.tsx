import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { useRouter, useSegments } from 'expo-router';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInMock: (role: 'student' | 'teacher') => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => { },
  refreshProfile: async () => { },
  signInMock: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // MOCK DATA FOR BYPASSING LOGIN
  const signInMock = (role: 'student' | 'teacher') => {
    setIsLoading(true);
    const mockId = role === 'teacher'
      ? '00000000-0000-0000-0000-000000000001'
      : '00000000-0000-0000-0000-000000000002';

    const mockClassId = '00000000-0000-0000-0000-000000000003';

    const mockUser: User = {
      id: mockId,
      email: `${role}@example.com`,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: { full_name: `Test ${role}` },
      created_at: new Date().toISOString(),
    } as any;

    const mockSession: Session = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    } as any;

    const mockProfile: Profile = {
      id: mockId,
      email: `${role}@example.com`,
      full_name: `Test ${role}`,
      role: role,
      class_id: role === 'student' ? mockClassId : undefined,
    } as any;

    setSession(mockSession);
    setProfile(mockProfile);
    setIsLoading(false);
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    console.log('Fetching profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch error:', error.message);
        // If profile doesn't exist, we might want to alert or handle it
      }

      if (data) {
        console.log('Profile loaded successfully:', (data as Profile).role);
        setProfile(data as Profile);
      } else {
        console.warn('No profile data found for user ID:', userId);
      }
    } catch (e) {
      console.error('Unexpected error during fetchProfile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    router.replace('/(auth)/login');
  };

  // Protected Routes Logic
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] as string === '(auth)';
    const isRoot = (segments.length as number) === 0;

    if (!session && !inAuthGroup && !isRoot) {
      router.replace('/(auth)/login');
    } else if (session && profile) {
      if (inAuthGroup || isRoot) {
        if (profile.role === 'teacher') {
          router.replace('/(teacher)/dashboard');
        } else {
          router.replace('/(student)/dashboard');
        }
      }
    }
  }, [session, profile, segments, isLoading]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, isLoading, signOut, refreshProfile, signInMock } as any}>
      {children}
    </AuthContext.Provider>
  );
}
