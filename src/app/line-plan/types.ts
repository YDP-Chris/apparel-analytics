// Types mirror the JSON files written by scripts/parse_line_plan.py and
// scripts/aggregate_competitor_depth.py. Kept narrow on purpose: only the
// fields the page actually renders.

export type MonthlySeries = {
  Jan?: number | null;
  Feb?: number | null;
  Mar?: number | null;
  Apr?: number | null;
  May?: number | null;
  "Jun (partial)"?: number | null;
  Jun?: number | null;
};

export type CategoryRow = {
  category: string;
  h1_actual: number | null;
  h1_target: number | null;
  var_dollars: number | null;
  var_pct: number | null;
  title_count: number | null;
  color_count: number | null;
  avg_dollars_per_title: number | null;
  months: {
    net_sales: MonthlySeries;
    units?: MonthlySeries;
    var_dollars?: MonthlySeries;
  };
};

export type TitleRow = {
  category: string;
  sub_category: string;
  title: string;
  h1_net_sales: number | null;
  h1_target: number | null;
  var_dollars: number | null;
  var_pct: number | null;
  pct_total_revenue: number | null;
  pct_category_revenue: number | null;
  h1_units: number | null;
  asp: number | null;
  discount_rate: number | null;
  return_rate: number | null;
  msrp: number | null;
  abc_rank: string | null;
  status: string | null;
  color_count: number | null;
  color_list: string[];
  monthly: MonthlySeries;
};

export type CompetitorDepthEntry = {
  title_count: number;
  color_count: number;
  sku_count: number;
  msrp_min: number | null;
  msrp_max: number | null;
  msrp_avg: number | null;
  top_colors: string[];
};

export type GrActual = {
  sku_count: number;
  title_count: number;
  color_count: number;
  colors?: string[];
  msrp_avg: number | null;
  status_mix: Record<string, number>;
};

export type SubcategoryDepth = {
  gr_actual: GrActual | null;
  competitors: Record<string, CompetitorDepthEntry>;
};

export type CompetitorDepthData = {
  generated_at: string;
  brands_apparel: string[];
  brands_strength: string[];
  brands_womens_direct?: string[];
  by_gr_subcategory: Record<string, SubcategoryDepth>;
};

export type LinePlanMeta = {
  parsed_at: string;
  sources: { line_plan: string; by_channel: string; sku_master: string };
  totals: {
    categories: number;
    titles: number;
    title_channel_rows: number;
    sku_buckets: number;
    total_skus: number;
  };
  demo_mode?: boolean;
};
