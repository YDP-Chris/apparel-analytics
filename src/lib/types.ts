export interface BrandData {
  name: string;
  slug: string;
  total: number;
  categories: Record<string, number>;
  subcategories: Record<string, number>;
  genders: Record<string, number>;
  colors: Record<string, number>;
  colorCoverage: number;
  avgColorsPerStyle: number;
  uniqueStyles: number;
}

export interface Insight {
  type: 'leader' | 'gap' | 'trend' | 'comparison';
  metric: string;
  text: string;
  brand?: string;
  value?: number;
}

export interface CategoryMixRow {
  brand: string;
  bottoms: number;
  tops: number;
  outerwear: number;
  dresses: number;
  sports_bras: number;
  accessories: number;
  other: number;
}

export interface ColorMixRow {
  brand: string;
  black: number;
  white: number;
  gray: number;
  blue: number;
  navy: number;
  green: number;
  heather: number;
  other: number;
}

export interface ScorecardItem {
  metric: string;
  value: string;
  comparison: string;
}

export interface Alert {
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface HeadToHead {
  category: string;
  vuori: number;
  competitor: number;
  winner: 'vuori' | 'competitor' | 'tie';
}

export interface VuoriScorecard {
  leading: ScorecardItem[];
  lagging: ScorecardItem[];
  alerts: Alert[];
  vsLululemon: HeadToHead[];
  vsAlo: HeadToHead[];
}

export interface LaunchProduct {
  name: string;
  url: string;
  category: string;
  gender: string;
}

export interface LaunchData {
  date: string;
  brand: string;
  brandSlug: string;
  count: number;
  products: LaunchProduct[];
}

export interface DashboardData {
  brands: Record<string, BrandData>;
  totals: {
    products: number;
    brands: number;
    categories: number;
    subcategories: number;
  };
  recentLaunches?: LaunchData[];
  launchVelocity?: Record<string, Record<string, number>>;
  byCategory: Record<string, Record<string, number>>;
  bySubcategory: Record<string, Record<string, number>>;
  byColor: Record<string, Record<string, number>>;
  categoryMix: CategoryMixRow[];
  colorMix: ColorMixRow[];
  insights: Insight[];
  vuoriScorecard: VuoriScorecard;
  generated_at: string;
}

export interface ComebackEntry {
  brand: string;
  url: string;
  product_name: string;
  category: string;
  subcategory: string;
  gender: string;
  first_seen: string;
  removed_at: string;
  returned_at: string;
  days_gone: number;
}

export interface ComebackData {
  comebacks: ComebackEntry[];
  summary: {
    total: number;
    by_brand: Record<string, number>;
    avg_days_gone: number;
  };
  generated_at: string | null;
}

export const BRAND_COLORS: Record<string, string> = {
  vuori: 'cyan',
  lululemon: 'rose',
  alo: 'violet',
  gymshark: 'amber',
  outdoor_voices: 'emerald',
  tenthousand: 'blue',
  on_running: 'orange',
};

export const CATEGORY_COLORS: Record<string, string> = {
  bottoms: 'blue',
  tops: 'emerald',
  outerwear: 'amber',
  dresses: 'rose',
  sports_bras: 'violet',
  accessories: 'gray',
  other: 'slate',
};

export const COLOR_FAMILY_COLORS: Record<string, string> = {
  black: '#1a1a2e',
  white: '#f8f9fa',
  gray: '#6c757d',
  blue: '#3b82f6',
  navy: '#1e3a5f',
  green: '#22c55e',
  heather: '#9ca3af',
  brown: '#92400e',
  rust: '#c2410c',
  khaki: '#d4b896',
  pink: '#ec4899',
  purple: '#8b5cf6',
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  multi: '#e056fd',
  print: '#a29bfe',
};

export const BRAND_ORDER = ['gymshark', 'on_running', 'alo', 'vuori', 'lululemon', 'outdoor_voices', 'tenthousand'];
