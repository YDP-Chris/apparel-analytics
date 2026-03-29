// Supabase client for ai_intel_briefs and other ai_ prefixed tables (ValleySomm project)
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

export interface BriefClaim {
  id: number;
  brief_date: string;
  section: string;
  claim_text: string;
  claim_type: string;
  subject_brand: string | null;
  subject_category: string | null;
  keywords: string[];
  outcome_status: string;
  outcome_evidence: string | null;
  outcome_date: string | null;
  days_to_outcome: number | null;
}

export interface TrendTimeline {
  id: number;
  keyword: string;
  keyword_type: string;
  first_mention_date: string;
  mention_count: number;
  mention_dates: string[];
  initial_search_value: number | null;
  peak_search_value: number | null;
  search_growth_pct: number | null;
  lead_time_days: number | null;
}

export interface BrandMention {
  id: number;
  brief_date: string;
  brand_id: string;
  section: string;
  sentiment: string;
  context_snippet: string;
}

export interface BriefRollup {
  id: number;
  period_type: string;
  period_start: string;
  period_end: string;
  brief_count: number;
  article_count_total: number;
  executive_summary: string | null;
  top_threats: string | null;
  key_trends: string | null;
  notable_launches: string | null;
  recommended_actions: string | null;
}
