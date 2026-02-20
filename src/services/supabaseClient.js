import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase Client Initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase Client:', error);
  }
} else {
  console.warn(
    '⚠️ Supabase credentials missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Realtime features disabled.'
  );
}

export default supabase;
