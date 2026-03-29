// Supabase client for ai_intel_briefs and other ai_ prefixed tables
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Defer creation to avoid build-time errors when env vars aren't set
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not configured');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

export interface IntelBrief {
  id: number;
  date: string;
  generated_at: string;
  article_count: number;
  companies: string[];
  threats: string | null;
  trends: string | null;
  product_velocity: string | null;
  social_buzz: string | null;
  comebacks: string | null;
  actions: string | null;
}
