import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjpimrvemtmfwibzbsbr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcGltcnZlbXRtZndpYnpic2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMjU1MTAsImV4cCI6MjA1NzkwMTUxMH0.qVuV-TaDHAUlCrqLZLbK85iOYKHuArmviTJPHKMGZHc';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
