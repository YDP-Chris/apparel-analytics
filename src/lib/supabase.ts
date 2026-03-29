import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
