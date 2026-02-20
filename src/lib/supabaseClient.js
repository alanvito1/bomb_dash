import { createClient } from '@supabase/supabase-js';

// Access environment variables safely for both Vite and Jest/Node environments
const getEnv = (key) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key] || import.meta.env[`VITE_${key}`];
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || process.env[`REACT_APP_${key}`];
    }
    return '';
};

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase Client initialized with missing keys. Database connections will fail.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
