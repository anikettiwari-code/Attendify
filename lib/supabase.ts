import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
// Service role key – bypasses RLS for privileged teacher operations
// Fallback hardcoded so it's always available in Expo bundle (non-EXPO_PUBLIC_ vars are not inlined)
const supabaseServiceKey =
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY ||
  '***REMOVED_SECRET***';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Admin client that bypasses RLS — used only for teacher-side writes
// (approving/rejecting students, inserting lectures)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Tells Supabase Auth to refresh the session when the app comes back to the foreground
if (typeof AppState !== 'undefined' && AppState) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
