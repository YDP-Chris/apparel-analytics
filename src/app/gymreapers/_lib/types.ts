// Shared types for the protected /gymreapers section
// Mirrors the JSON shape produced by competitive-intel/gymreapers_report.py

export interface BrandBlock {
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
  source?: string;
  priceRange?: { min: number; max: number; avg: number };
}

export interface NewsItem {
  title: string;
  url: string;
  date?: string;
  company?: string;
  company_id?: string;
}

export interface TrendBrand {
  keyword?: string;
  current?: number;
  wow_change?: number;
  mom_change?: number;
  updated_at?: string;
}

export interface MixBrand {
  totalProducts: number;
  categoryMix: Record<string, number>;
  genderSplit: Record<string, number>;
  colorDepth: {
    avgColorsPerStyle: number;
    uniqueColors: number;
    palette: Record<string, number>;
  } | null;
  sizeRange: {
    extendedSizesPct: number;
    sizesOffered: string[];
  } | null;
  pricePositioning: Record<string, { min: number; avg: number; max: number; count: number }> | null;
  source: 'scraped' | 'sitemap';
}

export interface LaunchDrop {
  brand: string;
  brandName: string;
  first_seen: string;
  date: string;
  product_name: string;
  url: string;
  category: string;
  subcategory: string;
  gender: string;
}

export interface LaunchesSection {
  velocity: Record<string, Record<string, number>>;
  summary: Record<string, { last_7d: number; last_14d: number; last_30d: number }>;
  recentDrops: LaunchDrop[];
  baselineDates: Record<string, string>;
}

export interface RedditPost {
  title?: string;
  subreddit?: string;
  url?: string;
  score?: number;
  brand?: string;
  brands?: string[];
  created_at?: string;
  date?: string;
  sentiment?: string;
  source?: string;
}

export interface RedditVelocity {
  mentions_7d?: number;
  mentions_per_day?: number;
  positive?: number;
  negative?: number;
  positive_pct?: number;
}

export interface SocialSection {
  redditVelocity: Record<string, RedditVelocity | null>;
  redditPosts: RedditPost[];
  redditTotalMatched?: number;
  grokMentions: Record<string, number | null>;
  grokThemes: Record<string, number>;
  lastUpdated?: string;
}

export interface JobPosting {
  title: string;
  department?: string;
  location?: string;
  url?: string;
  posted_at?: string;
  category?: string;
  seniority?: string;
}

export interface JobsBrandData {
  name?: string;
  platform?: string;
  total_jobs?: number;
  change_from_last?: number;
  departments?: Record<string, number>;
  seniority?: Record<string, number>;
  locations?: string[];
  jobs?: JobPosting[];
  checked_at?: string;
}

export interface GymreapersReport {
  generated_at: string;
  focus_brand: string;
  brand_order: string[];
  brand_names: Record<string, string>;
  brands: Record<string, BrandBlock>;
  totals: {
    products: number;
    brands: number;
    gymreapers_products: number;
    competitor_products: number;
    gymreapers_share_pct: number;
  };
  newProductsToday: Record<string, number>;
  byCategory: Record<string, Record<string, number>>;
  bySubcategory: Record<string, Record<string, number>>;
  byColor: Record<string, Record<string, number>>;
  news: NewsItem[];
  launches: unknown[];
  trends: Record<string, TrendBrand>;
  jobs: Record<string, JobsBrandData>;
  mix: Record<string, MixBrand>;
  launchesSection: LaunchesSection;
  social: SocialSection;
}
