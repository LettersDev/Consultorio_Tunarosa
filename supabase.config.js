import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Supabase project credentials
const SUPABASE_URL = 'https://wlyosrmcffjvvespxaku.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseW9zcm1jZmZqdnZlc3B4YWt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzYzMDksImV4cCI6MjA4NTIxMjMwOX0.dt-aQhhTxe7NVp6xipB8XdrqzBRX2ZTQLJVyKVGm0mI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

