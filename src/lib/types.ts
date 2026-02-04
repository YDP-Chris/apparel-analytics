export interface BrandData {
  name: string;
  slug: string;
  total: number;
  categories: Record<string, number>;
  subcategories: Record<string, number>;
  genders: Record<string, number>;
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

export interface DashboardData {
  brands: Record<string, BrandData>;
  totals: {
    products: number;
    brands: number;
    categories: number;
    subcategories: number;
  };
  byCategory: Record<string, Record<string, number>>;
  bySubcategory: Record<string, Record<string, number>>;
  categoryMix: CategoryMixRow[];
  insights: Insight[];
  generated_at: string;
}

export const BRAND_COLORS: Record<string, string> = {
  vuori: 'cyan',
  lululemon: 'rose',
  alo: 'violet',
  gymshark: 'amber',
  outdoor_voices: 'emerald',
  tenthousand: 'blue',
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

export const BRAND_ORDER = ['gymshark', 'alo', 'vuori', 'lululemon', 'outdoor_voices', 'tenthousand'];
