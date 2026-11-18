import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://bnolwghgydybgfhwzpyn.supabase.co';
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJub2x3Z2hneWR5YmdmaHd6cHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTI0MDgsImV4cCI6MjEwMzQ4ODQwOH0.eWQHK4iRSxPjqNKYFxnWrqXc9sUOTnvAZEQp_d2IaxE';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

// Create client with reliable credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
