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

interface VuoriScorecard {
  leading: ScorecardItem[];
  lagging: ScorecardItem[];
  alerts: Alert[];
}

interface DashboardData {
  brands: Record<string, BrandData>;
  totals: {
    products: number;
    brands: number;
    categories: number;
    subcategories: number;
  };
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
    blue: number;
    navy: number;
    green: number;
    heather: number;
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
  const COLOR_ORDER = ['black', 'white', 'gray', 'blue', 'navy', 'green', 'heather', 'other'] as const;
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
        blue: Math.round(((brand.colors['blue'] || 0) / total) * 1000) / 10,
        navy: Math.round(((brand.colors['navy'] || 0) / total) * 1000) / 10,
        green: Math.round(((brand.colors['green'] || 0) / total) * 1000) / 10,
        heather: Math.round(((brand.colors['heather'] || 0) / total) * 1000) / 10,
        other: Math.round((otherTotal / total) * 1000) / 10,
      };
    });

  // Calculate totals
  const totalProducts = Object.values(brands).reduce((sum, b) => sum + b.total, 0);

  // Generate insights
  const insights = generateInsights(brands, byCategory, bySubcategory, totalProducts);

  // Generate Vuori scorecard
  const vuoriScorecard = generateVuoriScorecard(brands, bySubcategory);

  return {
    brands,
    totals: {
      products: totalProducts,
      brands: Object.keys(brands).length,
      categories: allCategories.size,
      subcategories: allSubcategories.size,
    },
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

function generateInsights(
  brands: Record<string, BrandData>,
  byCategory: Record<string, Record<string, number>>,
  bySubcategory: Record<string, Record<string, number>>,
  totalProducts: number
): Insight[] {
  const insights: Insight[] = [];
  const brandCount = Object.keys(brands).length;

  // Find leaders by subcategory
  const keySubcategories = ['shorts', 'leggings', 'joggers', 'hoodies', 'tanks'];
  for (const subcat of keySubcategories) {
    const counts = bySubcategory[subcat] || {};
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [leader, count] = sorted[0];
      const brandData = brands[leader];
      const pctOfCatalog = Math.round((count / brandData.total) * 1000) / 10;

      // Calculate market average
      const totalInSubcat = Object.values(counts).reduce((s, c) => s + c, 0);
      const avgCount = totalInSubcat / brandCount;
      const indexVsMarket = Math.round((count / avgCount) * 100);

      if (indexVsMarket > 120) {
        insights.push({
          type: 'leader',
          metric: subcat,
          brand: brandData.name,
          value: count,
          text: `${brandData.name} leads ${subcat} with ${count} products (${pctOfCatalog}% of catalog, ${indexVsMarket}% vs market avg)`,
        });
      }
    }
  }

  // Find gaps (brands under-indexing)
  for (const [slug, brand] of Object.entries(brands)) {
    // Check for tennis dresses
    const dressCount = brand.subcategories['dresses'] || 0;
    const tennisDressCount = brand.subcategories['tennis_dresses'] || 0;

    if (brand.total > 500 && tennisDressCount < 10) {
      insights.push({
        type: 'gap',
        metric: 'tennis_dresses',
        brand: brand.name,
        value: tennisDressCount,
        text: `${brand.name} has minimal tennis dress presence (${tennisDressCount} products, ${Math.round((tennisDressCount / brand.total) * 1000) / 10}%)`,
      });
    }
  }

  // Find catalog size comparisons
  const sortedBySize = Object.entries(brands).sort((a, b) => b[1].total - a[1].total);
  const largest = sortedBySize[0];
  const smallest = sortedBySize[sortedBySize.length - 1];

  insights.push({
    type: 'comparison',
    metric: 'catalog_size',
    text: `${largest[1].name} has ${Math.round(largest[1].total / smallest[1].total)}x the catalog of ${smallest[1].name} (${largest[1].total.toLocaleString()} vs ${smallest[1].total.toLocaleString()} products)`,
  });

  // Bottoms-focused brands
  for (const [slug, brand] of Object.entries(brands)) {
    const bottomsPct = ((brand.categories['bottoms'] || 0) / brand.total) * 100;
    if (bottomsPct > 40) {
      insights.push({
        type: 'trend',
        metric: 'bottoms_focus',
        brand: brand.name,
        value: Math.round(bottomsPct),
        text: `${brand.name} is bottoms-focused: ${Math.round(bottomsPct)}% of catalog in bottoms category`,
      });
    }
  }

  return insights.slice(0, 8); // Limit to top 8 insights
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
    return { leading, lagging, alerts };
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

  // Limit outputs
  return {
    leading: leading.slice(0, 5),
    lagging: lagging.slice(0, 4),
    alerts: alerts.slice(0, 5),
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
