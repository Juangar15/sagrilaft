import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://acieyyyizotyyseavgaf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
    console.warn("Falta la variable VITE_SUPABASE_ANON_KEY en el frontend.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'dummy_key');
