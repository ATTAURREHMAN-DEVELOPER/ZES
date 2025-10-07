import { createClient } from '@supabase/supabase-js';

// Try multiple ways to get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Fallback to hardcoded values if env vars are not available
const SUPABASE_URL = supabaseUrl || 'https://twmucucpykikevsouhwf.supabase.co';
const SUPABASE_ANON_KEY = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXVjdWNweWtpa2V2c291aHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3Nzg0MTcsImV4cCI6MjA3NTM1NDQxN30.9hM4fyNfoLkQlfYIqlotJpYF3044nNAyYlibLG6lILo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


