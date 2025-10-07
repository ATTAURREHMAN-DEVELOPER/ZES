import { createClient } from '@supabase/supabase-js';

// Always use hardcoded values for now to ensure Supabase works
const SUPABASE_URL = 'https://twmucucpykikevsouhwf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bXVjdWNweWtpa2V2c291aHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3Nzg0MTcsImV4cCI6MjA3NTM1NDQxN30.9hM4fyNfoLkQlfYIqlotJpYF3044nNAyYlibLG6lILo';

console.log('🔧 Supabase client initialized with:', { 
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY 
});

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


