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

// Amazon BSR section — populated by agents/amazon-bsr
export interface AmazonProduct {
  rank: number | null;
  asin: string;
  title: string;
  price: number | null;
  reviews: number | null;
  rating: number | null;
  bought_past_month_label?: string | null;
  bought_past_month_est?: number | null;
  url: string;
}

export interface AmazonBrandShare {
  brand: string;
  count: number;
  share_pct: number;
}

export interface AmazonGymreapersPosition {
  present: boolean;
  top_rank: number | null;
  asin?: string;
  title?: string;
  price?: number | null;
  reviews?: number | null;
  url?: string;
}

export interface AmazonCategoryRollup {
  slug: string;
  name: string;
  keyword: string;
  organic_count: number;
  gymreapers: AmazonGymreapersPosition;
  brand_share_top30: AmazonBrandShare[];
  top_5: AmazonProduct[];
  diff?: {
    movers_up: Array<{ asin: string; title: string; rank_prev: number; rank_curr: number; delta: number; url: string }>;
    movers_down: Array<{ asin: string; title: string; rank_prev: number; rank_curr: number; delta: number; url: string }>;
    new_entrants: Array<{ asin: string; title: string; rank: number; price: number | null; reviews: number | null; url: string }>;
  } | null;
}

export interface AmazonOpportunity {
  query: string;
  category_slug: string;
  category_name: string;
  top_n_size: number;
  gymreapers_present: boolean;
  total_reviews_in_top_n: number;
  avg_price: number | null;
  price_range: { min: number | null; max: number | null };
  top_brands: AmazonBrandShare[];
  concentration_hhi: number;
  opportunity_score: number;
  leaders: AmazonProduct[];
}

export interface AmazonSection {
  lastUpdated?: string;
  totals?: {
    categories_tracked?: number;
    categories_with_gymreapers?: number;
    whitespace_queries_run?: number;
    whitespace_gaps?: number;
  };
  categories?: AmazonCategoryRollup[];
  topOpportunities?: AmazonOpportunity[];
  whitespaceByCategory?: Array<{
    slug: string;
    name: string;
    queries_run: number;
    gaps: number;
    opportunities: AmazonOpportunity[];
  }>;
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
  amazon?: AmazonSection;
}
