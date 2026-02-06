/**
 * Data preprocessing script
 * Transforms competitive-intel state.json into optimized dashboard format
 *
 * Run with: npx tsx scripts/prepare-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface Product {
  url: string;
  first_seen: string;
  gender: string;
  category: string;
  subcategory: string;
  color?: string;
  color_family?: string;
  product_name?: string;
}

interface StateJson {
  sitemap_products: Record<string, Record<string, Product>>;
}

interface BrandData {
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

interface Insight {
  type: 'leader' | 'gap' | 'trend' | 'comparison';
  metric: string;
  text: string;
  brand?: string;
  value?: number;
}

interface ScorecardItem {
  metric: string;
  value: string;
  comparison: string;
}

interface Alert {
  severity: 'high' | 'medium' | 'low';
  message: string;
}

interface HeadToHead {
  category: string;
  vuori: number;
  competitor: number;
  winner: 'vuori' | 'competitor' | 'tie';
}

interface VuoriScorecard {
  leading: ScorecardItem[];
  lagging: ScorecardItem[];
  alerts: Alert[];
  vsLululemon: HeadToHead[];
  vsAlo: HeadToHead[];
}

interface LaunchData {
  date: string;
  brand: string;
  brandSlug: string;
  count: number;
  products: Array<{
    name: string;
    url: string;
    category: string;
    gender: string;
  }>;
}

interface DashboardData {
  brands: Record<string, BrandData>;
  totals: {
    products: number;
    brands: number;
    categories: number;
    subcategories: number;
  };
  recentLaunches: LaunchData[];
  launchVelocity: Record<string, Record<string, number>>; // brand -> date -> count
  byCategory: Record<string, Record<string, number>>;
  bySubcategory: Record<string, Record<string, number>>;
  byColor: Record<string, Record<string, number>>;
  categoryMix: Array<{
    brand: string;
    bottoms: number;
    tops: number;
    outerwear: number;
    dresses: number;
    sports_bras: number;
    accessories: number;
    other: number;
  }>;
  colorMix: Array<{
    brand: string;
    black: number;
    white: number;
    gray: number;
    navy: number;
    blue: number;
    green: number;
    khaki: number;
    brown: number;
    purple: number;
    pink: number;
    orange: number;
    red: number;
    yellow: number;
    other: number;
  }>;
  insights: Insight[];
  vuoriScorecard: VuoriScorecard;
  generated_at: string;
}

const BRAND_NAMES: Record<string, string> = {
  vuori: 'Vuori',
  lululemon: 'Lululemon',
  alo: 'Alo Yoga',
  gymshark: 'Gymshark',
  outdoor_voices: 'Outdoor Voices',
  tenthousand: 'Ten Thousand',
  on_running: 'On Running',
};

const CATEGORY_ORDER = ['bottoms', 'tops', 'outerwear', 'dresses', 'sports_bras', 'accessories', 'other'];

function loadStateJson(): StateJson {
  const statePath = path.join(__dirname, '../../..', 'competitive-intel/data/state.json');
  console.log(`Loading state from: ${statePath}`);
  const content = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(content);
}

function processProducts(state: StateJson): DashboardData {
  const brands: Record<string, BrandData> = {};
  const byCategory: Record<string, Record<string, number>> = {};
  const bySubcategory: Record<string, Record<string, number>> = {};
  const byColor: Record<string, Record<string, number>> = {};
  const allCategories = new Set<string>();
  const allSubcategories = new Set<string>();

  // Process each brand
  for (const [brandSlug, products] of Object.entries(state.sitemap_products)) {
    const brandName = BRAND_NAMES[brandSlug] || brandSlug;
    // Filter out gift cards
    const productList = Object.values(products).filter(p => {
      const url = p.url.toLowerCase();
      return !(url.includes('gift') && url.includes('card')) && !url.includes('giftcard');
    });

    const categories: Record<string, number> = {};
    const subcategories: Record<string, number> = {};
    const genders: Record<string, number> = {};
    const colors: Record<string, number> = {};
    const styleColors: Record<string, Set<string>> = {}; // product_name -> colors

    let productsWithColor = 0;

    for (const product of productList) {
      const cat = product.category || 'other';
      const subcat = product.subcategory || 'other';
      const gender = product.gender || 'unisex';
      const colorFamily = product.color_family || null;
      const productName = product.product_name || null;

      categories[cat] = (categories[cat] || 0) + 1;
      subcategories[subcat] = (subcategories[subcat] || 0) + 1;
      genders[gender] = (genders[gender] || 0) + 1;

      // Track colors
      if (colorFamily) {
        productsWithColor++;
        colors[colorFamily] = (colors[colorFamily] || 0) + 1;

        // Aggregate by color
        if (!byColor[colorFamily]) byColor[colorFamily] = {};
        byColor[colorFamily][brandSlug] = (byColor[colorFamily][brandSlug] || 0) + 1;
      }

      // Track colors per style
      if (productName && colorFamily) {
        if (!styleColors[productName]) styleColors[productName] = new Set();
        styleColors[productName].add(colorFamily);
      }

      allCategories.add(cat);
      allSubcategories.add(subcat);

      // Aggregate by category
      if (!byCategory[cat]) byCategory[cat] = {};
      byCategory[cat][brandSlug] = (byCategory[cat][brandSlug] || 0) + 1;

      // Aggregate by subcategory
      if (!bySubcategory[subcat]) bySubcategory[subcat] = {};
      bySubcategory[subcat][brandSlug] = (bySubcategory[subcat][brandSlug] || 0) + 1;
    }

    // Calculate color depth metrics
    const uniqueStyles = Object.keys(styleColors).length;
    const totalColors = Object.values(styleColors).reduce((sum, s) => sum + s.size, 0);
    const avgColorsPerStyle = uniqueStyles > 0 ? Math.round((totalColors / uniqueStyles) * 10) / 10 : 0;
    const colorCoverage = productList.length > 0 ? Math.round((productsWithColor / productList.length) * 1000) / 10 : 0;

    brands[brandSlug] = {
      name: brandName,
      slug: brandSlug,
      total: productList.length,
      categories,
      subcategories,
      genders,
      colors,
      colorCoverage,
      avgColorsPerStyle,
      uniqueStyles,
    };
  }

  // Calculate category mix (percentages)
  const categoryMix = Object.entries(brands)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([slug, brand]) => {
      const total = brand.total;
      const mix: Record<string, number> = { brand: brand.name } as any;
      for (const cat of CATEGORY_ORDER) {
        mix[cat] = Math.round(((brand.categories[cat] || 0) / total) * 1000) / 10;
      }
      return mix as any;
    });

  // Calculate color mix (percentages)
  const COLOR_ORDER = ['black', 'white', 'gray', 'navy', 'blue', 'green', 'khaki', 'brown', 'purple', 'pink', 'orange', 'red', 'yellow', 'other'] as const;
  const colorMix = Object.entries(brands)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([slug, brand]) => {
      const total = brand.total;
      const knownColors = COLOR_ORDER.filter(c => c !== 'other');
      const knownTotal = knownColors.reduce((sum, c) => sum + (brand.colors[c] || 0), 0);
      const otherTotal = Object.values(brand.colors).reduce((sum, c) => sum + c, 0) - knownTotal;

      return {
        brand: brand.name,
        black: Math.round(((brand.colors['black'] || 0) / total) * 1000) / 10,
        white: Math.round(((brand.colors['white'] || 0) / total) * 1000) / 10,
        gray: Math.round(((brand.colors['gray'] || 0) / total) * 1000) / 10,
        navy: Math.round(((brand.colors['navy'] || 0) / total) * 1000) / 10,
        blue: Math.round(((brand.colors['blue'] || 0) / total) * 1000) / 10,
        green: Math.round(((brand.colors['green'] || 0) / total) * 1000) / 10,
        khaki: Math.round(((brand.colors['khaki'] || 0) / total) * 1000) / 10,
        brown: Math.round(((brand.colors['brown'] || 0) / total) * 1000) / 10,
        purple: Math.round(((brand.colors['purple'] || 0) / total) * 1000) / 10,
        pink: Math.round(((brand.colors['pink'] || 0) / total) * 1000) / 10,
        orange: Math.round(((brand.colors['orange'] || 0) / total) * 1000) / 10,
        red: Math.round(((brand.colors['red'] || 0) / total) * 1000) / 10,
        yellow: Math.round(((brand.colors['yellow'] || 0) / total) * 1000) / 10,
        other: Math.round((otherTotal / total) * 1000) / 10,
      };
    });

  // Calculate totals
  const totalProducts = Object.values(brands).reduce((sum, b) => sum + b.total, 0);

  // Generate insights
  const insights = generateInsights(brands, byCategory, bySubcategory, totalProducts);

  // Generate Vuori scorecard
  const vuoriScorecard = generateVuoriScorecard(brands, bySubcategory);

  // Extract launch data from first_seen dates
  const { recentLaunches, launchVelocity } = extractLaunchData(state, BRAND_NAMES);

  return {
    brands,
    totals: {
      products: totalProducts,
      brands: Object.keys(brands).length,
      categories: allCategories.size,
      subcategories: allSubcategories.size,
    },
    recentLaunches,
    launchVelocity,
    byCategory,
    bySubcategory,
    byColor,
    categoryMix,
    colorMix,
    insights,
    vuoriScorecard,
    generated_at: new Date().toISOString(),
  };
}

function extractLaunchData(
  state: StateJson,
  brandNames: Record<string, string>
): { recentLaunches: LaunchData[]; launchVelocity: Record<string, Record<string, number>> } {
  const launchVelocity: Record<string, Record<string, number>> = {};
  const launchsByDateBrand: Record<string, Record<string, Product[]>> = {};

  // For each brand, find their earliest tracking date (initial load)
  const brandEarliestDates: Record<string, string> = {};
  for (const [brandSlug, products] of Object.entries(state.sitemap_products)) {
    let earliest = '9999-99-99';
    for (const product of Object.values(products)) {
      const date = product.first_seen?.split('T')[0];
      if (date && date < earliest) {
        earliest = date;
      }
    }
    brandEarliestDates[brandSlug] = earliest;
  }

  // Group products by date and brand
  for (const [brandSlug, products] of Object.entries(state.sitemap_products)) {
    launchVelocity[brandSlug] = {};
    const brandInitialDate = brandEarliestDates[brandSlug];

    for (const product of Object.values(products)) {
      const date = product.first_seen?.split('T')[0];
      if (!date) continue;

      // Track velocity (include all dates)
      launchVelocity[brandSlug][date] = (launchVelocity[brandSlug][date] || 0) + 1;

      // Skip this brand's initial bulk load date for "recent launches"
      if (date === brandInitialDate) continue;

      // Group for recent launches
      if (!launchsByDateBrand[date]) launchsByDateBrand[date] = {};
      if (!launchsByDateBrand[date][brandSlug]) launchsByDateBrand[date][brandSlug] = [];
      launchsByDateBrand[date][brandSlug].push(product);
    }
  }

  // Build recent launches (last 14 days, excluding initial load)
  const recentLaunches: LaunchData[] = [];
  const sortedDates = Object.keys(launchsByDateBrand).sort().reverse().slice(0, 14);

  for (const date of sortedDates) {
    for (const [brandSlug, products] of Object.entries(launchsByDateBrand[date])) {
      if (products.length === 0) continue;

      recentLaunches.push({
        date,
        brand: brandNames[brandSlug] || brandSlug,
        brandSlug,
        count: products.length,
        products: products.slice(0, 10).map(p => ({
          name: p.product_name || p.url.split('/products/')[1]?.split('?')[0] || 'Unknown',
          url: p.url,
          category: p.category || 'other',
          gender: p.gender || 'unisex',
        })),
      });
    }
  }

  // Sort by date desc, then by count desc
  recentLaunches.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.count - a.count;
  });

  return { recentLaunches, launchVelocity };
}

function generateInsights(
  brands: Record<string, BrandData>,
  byCategory: Record<string, Record<string, number>>,
  bySubcategory: Record<string, Record<string, number>>,
  totalProducts: number
): Insight[] {
  const insights: Insight[] = [];
  const vuori = brands['vuori'];
  const lululemon = brands['lululemon'];

  if (!vuori) return insights;

  // --- VUORI-FOCUSED STRATEGIC INSIGHTS ---

  // 1. Gender balance advantage
  const vuoriWomensPct = Math.round(((vuori.genders['womens'] || 0) / vuori.total) * 100);
  const vuoriMensPct = Math.round(((vuori.genders['mens'] || 0) / vuori.total) * 100);
  const aloWomensPct = Math.round(((brands['alo']?.genders['womens'] || 0) / (brands['alo']?.total || 1)) * 100);
  const gymsharkMensPct = Math.round(((brands['gymshark']?.genders['mens'] || 0) / (brands['gymshark']?.total || 1)) * 100);

  insights.push({
    type: 'leader',
    metric: 'gender_balance',
    brand: 'Vuori',
    text: `Vuori is uniquely balanced: ${vuoriWomensPct}% women's / ${vuoriMensPct}% men's. Alo skews ${aloWomensPct}% women's, Gymshark ${gymsharkMensPct}% men's.`,
  });

  // 2. Earth tone positioning (California aesthetic)
  const earthFamilies = ['brown', 'khaki', 'green', 'rust'];
  const vuoriEarthCount = earthFamilies.reduce((s, c) => s + (vuori.colors[c] || 0), 0);
  const vuoriEarthPct = Math.round((vuoriEarthCount / vuori.total) * 100);
  const industryEarthAvg = Math.round(Object.entries(brands)
    .filter(([s]) => s !== 'vuori')
    .reduce((sum, [_, b]) => {
      const earth = earthFamilies.reduce((s, c) => s + (b.colors[c] || 0), 0);
      return sum + (earth / b.total) * 100;
    }, 0) / (Object.keys(brands).length - 1));

  insights.push({
    type: 'trend',
    metric: 'earth_tones',
    brand: 'Vuori',
    value: vuoriEarthPct,
    text: `Vuori's earth tone palette (${vuoriEarthPct}%) is ${vuoriEarthPct - industryEarthAvg > 0 ? '+' : ''}${vuoriEarthPct - industryEarthAvg}% vs industry avg—reinforcing California lifestyle positioning.`,
  });

  // 3. Lululemon head-to-head comparison
  if (lululemon) {
    const vuoriJoggers = vuori.subcategories['joggers'] || 0;
    const luluJoggers = lululemon.subcategories['joggers'] || 0;
    const joggerGap = vuoriJoggers - luluJoggers;

    insights.push({
      type: 'comparison',
      metric: 'joggers_vs_lulu',
      text: `Jogger battle: Vuori (${vuoriJoggers}) vs Lululemon (${luluJoggers}). ${joggerGap > 0 ? `Vuori leads by ${joggerGap}` : `Gap of ${Math.abs(joggerGap)} to close`}.`,
    });

    // Leggings opportunity
    const vuoriLeggings = vuori.subcategories['leggings'] || 0;
    const luluLeggings = lululemon.subcategories['leggings'] || 0;
    if (luluLeggings > vuoriLeggings) {
      insights.push({
        type: 'gap',
        metric: 'leggings',
        brand: 'Vuori',
        value: luluLeggings - vuoriLeggings,
        text: `Leggings opportunity: Lululemon has ${luluLeggings} vs Vuori's ${vuoriLeggings}. Gap of ${luluLeggings - vuoriLeggings} SKUs.`,
      });
    }
  }

  // 4. Color strategy insight
  const neutrals = ['black', 'white', 'gray', 'navy'];
  const vuoriNeutralPct = Math.round(neutrals.reduce((s, c) => s + (vuori.colors[c] || 0), 0) / vuori.total * 100);

  insights.push({
    type: 'trend',
    metric: 'neutrals',
    brand: 'Vuori',
    value: vuoriNeutralPct,
    text: `Neutrals (black/white/gray/navy) = ${vuoriNeutralPct}% of Vuori's palette. Core basics that drive repeat purchases.`,
  });

  // 5. Men's category strength
  const vuoriMensProducts = vuori.genders['mens'] || 0;
  const luluMensProducts = lululemon?.genders['mens'] || 0;
  if (vuoriMensProducts > luluMensProducts) {
    insights.push({
      type: 'leader',
      metric: 'mens_catalog',
      brand: 'Vuori',
      value: vuoriMensProducts,
      text: `Vuori leads Lululemon in men's: ${vuoriMensProducts} vs ${luluMensProducts} products. A ${Math.round((vuoriMensProducts / luluMensProducts - 1) * 100)}% advantage.`,
    });
  }

  // 6. Shorts leadership check
  const shortsRanking = Object.entries(brands)
    .map(([slug, b]) => ({ slug, name: b.name, shorts: b.subcategories['shorts'] || 0 }))
    .sort((a, b) => b.shorts - a.shorts);
  const vuoriShortsRank = shortsRanking.findIndex(b => b.slug === 'vuori') + 1;

  if (vuoriShortsRank <= 3) {
    const vuoriShorts = vuori.subcategories['shorts'] || 0;
    insights.push({
      type: 'leader',
      metric: 'shorts',
      brand: 'Vuori',
      value: vuoriShorts,
      text: `Vuori ranks #${vuoriShortsRank} in shorts with ${vuoriShorts} products. ${vuoriShortsRank === 1 ? 'Category leader.' : `Behind ${shortsRanking[0].name} (${shortsRanking[0].shorts}).`}`,
    });
  }

  // 7. Outerwear position
  const vuoriOuterwear = vuori.categories['outerwear'] || 0;
  const luluOuterwear = lululemon?.categories['outerwear'] || 0;
  const outerwearComparison = lululemon
    ? `vs Lululemon's ${luluOuterwear}`
    : '';

  insights.push({
    type: 'comparison',
    metric: 'outerwear',
    text: `Outerwear depth: Vuori has ${vuoriOuterwear} products ${outerwearComparison}. Key for cooler weather expansion.`,
  });

  // 8. Size of opportunity
  const totalCompetitors = Object.values(brands)
    .filter(b => b.slug !== 'vuori')
    .reduce((s, b) => s + b.total, 0);

  insights.push({
    type: 'comparison',
    metric: 'market_landscape',
    text: `Market context: ${totalCompetitors.toLocaleString()} competitor products tracked. Vuori's ${vuori.total.toLocaleString()} = ${Math.round(vuori.total / totalProducts * 100)}% share of tracked catalog.`,
  });

  return insights.slice(0, 8);
}

function generateVuoriScorecard(
  brands: Record<string, BrandData>,
  bySubcategory: Record<string, Record<string, number>>
): VuoriScorecard {
  const leading: ScorecardItem[] = [];
  const lagging: ScorecardItem[] = [];
  const alerts: Alert[] = [];

  const vuori = brands['vuori'];
  if (!vuori) {
    return { leading, lagging, alerts, vsLululemon: [], vsAlo: [] };
  }

  const brandCount = Object.keys(brands).length;

  // --- HEATHER/PERFORMANCE FABRICS ---
  const vuoriHeatherPct = (vuori.colors['heather'] || 0) / vuori.total * 100;
  const otherHeatherPcts = Object.entries(brands)
    .filter(([slug]) => slug !== 'vuori')
    .map(([_, b]) => (b.colors['heather'] || 0) / b.total * 100);
  const avgHeatherPct = otherHeatherPcts.reduce((s, p) => s + p, 0) / otherHeatherPcts.length;

  if (vuoriHeatherPct > avgHeatherPct * 1.5) {
    leading.push({
      metric: 'Performance Fabrics (Heather)',
      value: `${vuoriHeatherPct.toFixed(0)}% of products`,
      comparison: `Industry avg: ${avgHeatherPct.toFixed(0)}%`,
    });
  }

  // --- COLOR DEPTH ---
  const vuoriColorDepth = vuori.avgColorsPerStyle;
  const otherDepths = Object.entries(brands)
    .filter(([slug]) => slug !== 'vuori' && brands[slug].uniqueStyles > 0)
    .map(([_, b]) => b.avgColorsPerStyle);
  const avgColorDepth = otherDepths.reduce((s, d) => s + d, 0) / otherDepths.length;
  const maxColorDepth = Math.max(...otherDepths);
  const depthLeader = Object.entries(brands).find(([_, b]) => b.avgColorsPerStyle === maxColorDepth);

  if (vuoriColorDepth >= avgColorDepth) {
    leading.push({
      metric: 'Color Depth',
      value: `${vuoriColorDepth.toFixed(1)} colors/style`,
      comparison: `+${(vuoriColorDepth - avgColorDepth).toFixed(1)} vs industry avg`,
    });
  } else {
    lagging.push({
      metric: 'Color Depth',
      value: `${vuoriColorDepth.toFixed(1)} colors/style`,
      comparison: `${depthLeader ? depthLeader[1].name : 'Leader'} has ${maxColorDepth.toFixed(1)}`,
    });
  }

  // --- EARTH TONES (CA AESTHETIC) ---
  const earthFamilies = ['brown', 'rust', 'khaki', 'green'];
  const vuoriEarthCount = earthFamilies.reduce((s, c) => s + (vuori.colors[c] || 0), 0);
  const vuoriEarthPct = (vuoriEarthCount / vuori.total) * 100;

  const otherEarthPcts = Object.entries(brands)
    .filter(([slug]) => slug !== 'vuori')
    .map(([_, b]) => {
      const earthCount = earthFamilies.reduce((s, c) => s + (b.colors[c] || 0), 0);
      return (earthCount / b.total) * 100;
    });
  const avgEarthPct = otherEarthPcts.reduce((s, p) => s + p, 0) / otherEarthPcts.length;

  if (vuoriEarthPct > avgEarthPct) {
    leading.push({
      metric: 'Earth Tone Palette (CA Aesthetic)',
      value: `${vuoriEarthPct.toFixed(0)}% earth tones`,
      comparison: `Industry avg: ${avgEarthPct.toFixed(0)}%`,
    });
  }

  // --- GENDER BALANCE ---
  const vuoriWomens = vuori.genders['womens'] || 0;
  const vuoriMens = vuori.genders['mens'] || 0;
  const vuoriGendered = vuoriWomens + vuoriMens;

  if (vuoriGendered > 100) {
    const balance = Math.min(vuoriWomens, vuoriMens) / Math.max(vuoriWomens, vuoriMens);

    // Check if Vuori is most balanced
    let isMostBalanced = true;
    for (const [slug, brand] of Object.entries(brands)) {
      if (slug === 'vuori') continue;
      const w = brand.genders['womens'] || 0;
      const m = brand.genders['mens'] || 0;
      if (w > 100 && m > 100) {
        const otherBalance = Math.min(w, m) / Math.max(w, m);
        if (otherBalance > balance) isMostBalanced = false;
      }
    }

    if (balance >= 0.3) {
      leading.push({
        metric: 'Gender Balance',
        value: `${Math.round((vuoriWomens / vuoriGendered) * 100)}% W / ${Math.round((vuoriMens / vuoriGendered) * 100)}% M`,
        comparison: isMostBalanced ? 'Most balanced lifestyle brand' : 'Strong balance',
      });
    }
  }

  // --- CATEGORY GAPS ---
  // Find subcategories Vuori is missing that competitors have
  const vuoriSubcats = new Set(Object.keys(vuori.subcategories).filter(s => vuori.subcategories[s] > 0));

  for (const [subcat, counts] of Object.entries(bySubcategory)) {
    if (subcat === 'other') continue;

    const vuoriCount = counts['vuori'] || 0;
    const totalOthers = Object.entries(counts)
      .filter(([slug]) => slug !== 'vuori')
      .reduce((sum, [_, c]) => sum + c, 0);

    if (vuoriCount === 0 && totalOthers >= 20) {
      lagging.push({
        metric: subcat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value: '0 products',
        comparison: `Competitors have ${totalOthers} products`,
      });
    }
  }

  // --- VELOCITY ALERTS ---
  // Check for brands with significantly larger catalogs
  for (const [slug, brand] of Object.entries(brands)) {
    if (slug === 'vuori') continue;

    if (brand.total > vuori.total * 1.5) {
      alerts.push({
        severity: brand.total > vuori.total * 2 ? 'high' : 'medium',
        message: `${brand.name} has ${Math.round(brand.total / vuori.total)}x Vuori's catalog size`,
      });
    }
  }

  // --- HEAD-TO-HEAD VS LULULEMON ---
  const vsLululemon: HeadToHead[] = [];
  const lululemon = brands['lululemon'];

  if (lululemon) {
    const compareSubcats = ['joggers', 'leggings', 'shorts', 'hoodies', 'tanks', 'tees'];
    for (const subcat of compareSubcats) {
      const vuoriCount = vuori.subcategories[subcat] || 0;
      const luluCount = lululemon.subcategories[subcat] || 0;
      vsLululemon.push({
        category: subcat.charAt(0).toUpperCase() + subcat.slice(1),
        vuori: vuoriCount,
        competitor: luluCount,
        winner: vuoriCount > luluCount ? 'vuori' : vuoriCount < luluCount ? 'competitor' : 'tie',
      });
    }

    vsLululemon.push({
      category: "Men's Products",
      vuori: vuori.genders['mens'] || 0,
      competitor: lululemon.genders['mens'] || 0,
      winner: (vuori.genders['mens'] || 0) > (lululemon.genders['mens'] || 0) ? 'vuori' : 'competitor',
    });

    vsLululemon.push({
      category: "Women's Products",
      vuori: vuori.genders['womens'] || 0,
      competitor: lululemon.genders['womens'] || 0,
      winner: (vuori.genders['womens'] || 0) > (lululemon.genders['womens'] || 0) ? 'vuori' : 'competitor',
    });
  }

  // --- HEAD-TO-HEAD VS ALO YOGA ---
  const vsAlo: HeadToHead[] = [];
  const alo = brands['alo'];

  if (alo) {
    const compareSubcats = ['joggers', 'leggings', 'shorts', 'hoodies', 'tanks', 'tees'];
    for (const subcat of compareSubcats) {
      const vuoriCount = vuori.subcategories[subcat] || 0;
      const aloCount = alo.subcategories[subcat] || 0;
      vsAlo.push({
        category: subcat.charAt(0).toUpperCase() + subcat.slice(1),
        vuori: vuoriCount,
        competitor: aloCount,
        winner: vuoriCount > aloCount ? 'vuori' : vuoriCount < aloCount ? 'competitor' : 'tie',
      });
    }

    vsAlo.push({
      category: "Men's Products",
      vuori: vuori.genders['mens'] || 0,
      competitor: alo.genders['mens'] || 0,
      winner: (vuori.genders['mens'] || 0) > (alo.genders['mens'] || 0) ? 'vuori' : 'competitor',
    });

    vsAlo.push({
      category: "Women's Products",
      vuori: vuori.genders['womens'] || 0,
      competitor: alo.genders['womens'] || 0,
      winner: (vuori.genders['womens'] || 0) > (alo.genders['womens'] || 0) ? 'vuori' : 'competitor',
    });
  }

  // Limit outputs
  return {
    leading: leading.slice(0, 5),
    lagging: lagging.slice(0, 4),
    alerts: alerts.slice(0, 5),
    vsLululemon,
    vsAlo,
  };
}

function main() {
  console.log('Preparing dashboard data...\n');

  const state = loadStateJson();
  const data = processProducts(state);

  // Log summary
  console.log(`\n=== Summary ===`);
  console.log(`Total products: ${data.totals.products.toLocaleString()}`);
  console.log(`Brands: ${data.totals.brands}`);
  console.log(`Categories: ${data.totals.categories}`);
  console.log(`Subcategories: ${data.totals.subcategories}`);
  console.log(`\nInsights generated: ${data.insights.length}`);

  // Write output
  const outputPath = path.join(__dirname, '../data/products.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nData written to: ${outputPath}`);
}

main();
