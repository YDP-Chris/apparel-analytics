'use client';

// /compare - Brand-vs-brand side-by-side comparison.
//
// Pure frontend. Pulls from existing /pulse/* endpoints and stacks two
// brands as columns across every dimension we capture (mix, prices, promo,
// sentiment, complaints, customer voice, launches, trademarks).
//
// Defaults to Gymreapers vs Vuori for the apparel-tier strategic frame.
// Selection persists in localStorage under `ydp_compare_brands`.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const COMPARE_LS_KEY = 'ydp_compare_brands';

// ---------------------------------------------------------------------------
// Types (loose - we only consume what the panels render)
// ---------------------------------------------------------------------------

interface CompetitiveBrand {
  name?: string;
  slug?: string;
  total?: number;
  uniqueStyles?: number;
  categories?: Record<string, number>;
  subcategories?: Record<string, number>;
  priceRange?: { min: number; max: number; avg: number } | null;
}

interface CompetitiveMix {
  totalProducts?: number;
  categoryMix?: Record<string, number>;
  pricePositioning?: Record<string, { avg?: number; min?: number; max?: number; count?: number }> | null;
}

interface CompetitivePayload {
  brand_order?: string[];
  brand_names?: Record<string, string>;
  brands?: Record<string, CompetitiveBrand>;
  bySubcategory?: Record<string, Record<string, number>>;
  mix?: Record<string, CompetitiveMix>;
  launchesSection?: {
    summary?: Record<string, { last_7d?: number; last_14d?: number; last_30d?: number }>;
    recentDrops?: Array<{
      brand?: string;
      brandName?: string;
      product_name?: string;
      url?: string;
      category?: string;
      subcategory?: string;
      first_seen?: string;
      date?: string;
    }>;
  };
}

interface PromoEvent {
  brand_slug?: string;
  product_title?: string;
  category?: string;
  discount_pct?: number | null;
  baseline_price?: number | null;
  sale_price?: number | null;
}

interface PromoPayload {
  available?: boolean;
  today_events?: PromoEvent[];
  brand_names?: Record<string, string>;
}

interface ThemeRow {
  brand_slug: string;
  theme: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  post_count: number;
}

interface ThemesPayload {
  themes?: ThemeRow[];
}

interface ComplaintBrandRow {
  brand_slug: string;
  total_complaints: number;
  top_kinds: Array<{ kind: string; count: number; pct: number }>;
}

interface ComplaintsPayload {
  available?: boolean;
  by_brand?: ComplaintBrandRow[];
}

interface VoiceSample {
  voice_signature?: string;
  quoted_phrase?: string;
  life_context?: string[];
  product_relationship?: string;
  rating?: number | null;
  product_name?: string | null;
}

interface PersonasPayload {
  available?: boolean;
  by_brand?: Array<{ brand_slug: string; sample_size: number }>;
  voice_samples_by_brand?: Record<string, VoiceSample[]>;
  life_context_top_phrases?: Record<string, Array<{ phrase: string; count: number }>>;
}

interface TrademarkRow {
  serial_number?: string;
  mark_text?: string;
  filing_date?: string;
  status?: string;
  international_class?: string | null;
  source_url?: string;
}

interface TrademarksPayload {
  available?: boolean;
  filings?: TrademarkRow[];
}

interface GapsPayload {
  available?: boolean;
  gaps?: Array<{
    subcategory: string;
    per_brand?: Record<string, number>;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prettyName(slug: string, names: Record<string, string>): string {
  return names[slug] || slug.replace(/_/g, ' ');
}

function topEntries<T extends number>(obj: Record<string, T> | undefined | null, n = 5): Array<[string, T]> {
  if (!obj) return [];
  return Object.entries(obj)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, n) as Array<[string, T]>;
}

function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  return `$${Math.round(v)}`;
}

function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  return `${v.toFixed(digits)}%`;
}

function pretty(s: string): string {
  return s.replace(/_/g, ' ');
}

// Sentiment style swatches reused across panels.
const SENT_STYLES: Record<ThemeRow['sentiment'], string> = {
  positive: 'bg-gr-success/15 text-gr-success',
  negative: 'bg-gr-danger/15 text-gr-danger',
  mixed:    'bg-gr-accent-soft/40 text-gr-accent',
  neutral:  'bg-gr-raised text-gr-muted',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type PanelKey = 'mix' | 'pricing' | 'promo' | 'sentiment' | 'voice' | 'launches' | 'trademarks';

export default function ComparePage() {
  const [brandA, setBrandA] = useState<string>('gymreapers');
  const [brandB, setBrandB] = useState<string>('vuori');

  const [competitive, setCompetitive] = useState<CompetitivePayload | null>(null);
  const [promo, setPromo] = useState<PromoPayload | null>(null);
  const [themes, setThemes] = useState<ThemesPayload | null>(null);
  const [complaints, setComplaints] = useState<ComplaintsPayload | null>(null);
  const [personas, setPersonas] = useState<PersonasPayload | null>(null);
  const [tmA, setTmA] = useState<TrademarksPayload | null>(null);
  const [tmB, setTmB] = useState<TrademarksPayload | null>(null);
  const [gaps, setGaps] = useState<GapsPayload | null>(null);

  const [loading, setLoading] = useState<Record<PanelKey, boolean>>({
    mix: true, pricing: true, promo: true, sentiment: true,
    voice: true, launches: true, trademarks: true,
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // Restore saved selection on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COMPARE_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.a && typeof parsed.a === 'string') setBrandA(parsed.a);
        if (parsed?.b && typeof parsed.b === 'string') setBrandB(parsed.b);
      }
    } catch {
      /* ignore corrupt LS */
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_LS_KEY, JSON.stringify({ a: brandA, b: brandB }));
    } catch {
      /* quota / disabled - ignore */
    }
  }, [brandA, brandB]);

  // Fetch slow-changing brand-agnostic feeds once. Re-fire trademark fetch
  // separately when brand selection changes (trademarks supports ?brand=).
  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setAuthError('Sign in first.'); return; }
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const flagOff = (k: PanelKey) =>
      setLoading((prev) => ({ ...prev, [k]: false }));

    fetch(`${PULSE_API}/pulse/competitive`, auth)
      .then((r) => (r.ok ? r.json() : Promise.reject(`competitive HTTP ${r.status}`)))
      .then((j) => setCompetitive(j))
      .catch(() => setCompetitive(null))
      .finally(() => { flagOff('mix'); flagOff('pricing'); flagOff('launches'); });

    fetch(`${PULSE_API}/pulse/promo`, auth)
      .then((r) => (r.ok ? r.json() : Promise.reject(`promo HTTP ${r.status}`)))
      .then((j) => setPromo(j))
      .catch(() => setPromo(null))
      .finally(() => flagOff('promo'));

    Promise.all([
      fetch(`${PULSE_API}/pulse/themes`, auth).then((r) => (r.ok ? r.json() : { themes: [] })),
      fetch(`${PULSE_API}/pulse/voc-complaints`, auth).then((r) => (r.ok ? r.json() : { by_brand: [] })),
    ])
      .then(([t, c]) => { setThemes(t); setComplaints(c); })
      .catch(() => { setThemes(null); setComplaints(null); })
      .finally(() => flagOff('sentiment'));

    fetch(`${PULSE_API}/pulse/voc-personas`, auth)
      .then((r) => (r.ok ? r.json() : Promise.reject(`voc-personas HTTP ${r.status}`)))
      .then((j) => setPersonas(j))
      .catch(() => setPersonas(null))
      .finally(() => flagOff('voice'));

    fetch(`${PULSE_API}/pulse/gaps?tier=apparel`, auth)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setGaps(j))
      .catch(() => setGaps(null));
  }, []);

  // Per-brand trademark fetch (re-fires on brand swap).
  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    setLoading((prev) => ({ ...prev, trademarks: true }));
    Promise.all([
      fetch(`${PULSE_API}/pulse/trademarks?brand=${encodeURIComponent(brandA)}&days=90`, auth)
        .then((r) => (r.ok ? r.json() : { filings: [] })),
      fetch(`${PULSE_API}/pulse/trademarks?brand=${encodeURIComponent(brandB)}&days=90`, auth)
        .then((r) => (r.ok ? r.json() : { filings: [] })),
    ])
      .then(([a, b]) => { setTmA(a); setTmB(b); })
      .catch(() => { setTmA(null); setTmB(null); })
      .finally(() => setLoading((prev) => ({ ...prev, trademarks: false })));
  }, [brandA, brandB]);

  // Brand registry - prefer competitive's brand_names+brand_order, fall
  // back to promo's brand_names if competitive hasn't landed yet.
  const brandNames: Record<string, string> = competitive?.brand_names || promo?.brand_names || {};
  const brandList: string[] = useMemo(() => {
    if (competitive?.brand_order?.length) return competitive.brand_order;
    return Object.keys(brandNames).sort();
  }, [competitive?.brand_order, brandNames]);

  const swap = () => {
    setBrandA(brandB);
    setBrandB(brandA);
    trackEvent('click', { label: 'compare_swap', metadata: { from: brandA, to: brandB } });
  };

  // ------------------- DERIVED per-panel data --------------------

  // Mix
  const mixData = useMemo(() => {
    const out = (slug: string) => {
      const brand = competitive?.brands?.[slug];
      const cats = brand?.categories || {};
      const subsAllRaw = competitive?.bySubcategory || {};
      const subs: Record<string, number> = {};
      for (const [sub, byBrand] of Object.entries(subsAllRaw)) {
        if (byBrand[slug] && byBrand[slug] > 0) subs[sub] = byBrand[slug];
      }
      return {
        total: brand?.total || 0,
        uniqueStyles: brand?.uniqueStyles || 0,
        topCategories: topEntries(cats, 5),
        topSubcategories: topEntries(subs, 5),
      };
    };
    return { a: out(brandA), b: out(brandB) };
  }, [competitive, brandA, brandB]);

  // Pricing
  const pricingData = useMemo(() => {
    const out = (slug: string) => {
      const brand = competitive?.brands?.[slug];
      const range = brand?.priceRange || null;
      const mix = competitive?.mix?.[slug];
      const positioning = mix?.pricePositioning || null;
      const tiers: Array<[string, number]> = [];
      if (positioning) {
        for (const [tier, info] of Object.entries(positioning)) {
          const count = (info && typeof info === 'object' && 'count' in info) ? (info.count || 0) : 0;
          if (count > 0) tiers.push([tier, count as number]);
        }
        tiers.sort((a, b) => b[1] - a[1]);
      }
      return {
        avg: range?.avg ?? null,
        min: range?.min ?? null,
        max: range?.max ?? null,
        tiers,
      };
    };
    return { a: out(brandA), b: out(brandB) };
  }, [competitive, brandA, brandB]);

  // Promo
  const promoData = useMemo(() => {
    const out = (slug: string) => {
      const events = (promo?.today_events || []).filter((e) => e.brand_slug === slug);
      const discounts = events.map((e) => Number(e.discount_pct || 0)).filter((n) => n > 0);
      const avg = discounts.length ? discounts.reduce((s, n) => s + n, 0) / discounts.length : null;
      const max = discounts.length ? Math.max(...discounts) : null;
      const byCat: Record<string, number> = {};
      for (const e of events) {
        if (e.category) byCat[e.category] = (byCat[e.category] || 0) + 1;
      }
      return {
        count: events.length,
        avg,
        max,
        topCategories: topEntries(byCat, 5),
      };
    };
    return { a: out(brandA), b: out(brandB) };
  }, [promo, brandA, brandB]);

  // Sentiment + complaints
  const sentimentData = useMemo(() => {
    const themesList = themes?.themes || [];
    const complaintsList = complaints?.by_brand || [];
    const out = (slug: string) => {
      const brandThemes = themesList.filter((t) => t.brand_slug === slug);
      const positive = brandThemes.filter((t) => t.sentiment === 'positive').slice(0, 5);
      const negative = brandThemes.filter((t) => t.sentiment === 'negative').slice(0, 5);
      const cRow = complaintsList.find((r) => r.brand_slug === slug);
      return {
        positive,
        negative,
        complaintsTotal: cRow?.total_complaints || 0,
        topComplaints: cRow?.top_kinds || [],
      };
    };
    return { a: out(brandA), b: out(brandB) };
  }, [themes, complaints, brandA, brandB]);

  // Voice (persona)
  const voiceData = useMemo(() => {
    const out = (slug: string) => {
      const samples = personas?.voice_samples_by_brand?.[slug] || [];
      const lc = personas?.life_context_top_phrases?.[slug] || [];
      const sampleSize = personas?.by_brand?.find((r) => r.brand_slug === slug)?.sample_size || 0;
      return {
        samples: samples.slice(0, 3),
        lifeContext: lc.slice(0, 5),
        sampleSize,
      };
    };
    return { a: out(brandA), b: out(brandB) };
  }, [personas, brandA, brandB]);

  // Launches (last 7d)
  const launchData = useMemo(() => {
    const summary = competitive?.launchesSection?.summary || {};
    const drops = competitive?.launchesSection?.recentDrops || [];
    const out = (slug: string) => {
      const last7d = summary[slug]?.last_7d || 0;
      const recent = drops
        .filter((d) => d.brand === slug)
        .slice(0, 3)
        .map((d) => ({
          product_name: d.product_name || '-',
          url: d.url,
          date: d.date || (d.first_seen ? d.first_seen.slice(0, 10) : null),
          subcategory: d.subcategory,
        }));
      return { last7d, recent };
    };
    return { a: out(brandA), b: out(brandB) };
  }, [competitive, brandA, brandB]);

  // Trademarks (separate fetch since /pulse/trademarks?brand=)
  const tmData = useMemo(() => {
    const out = (payload: TrademarksPayload | null) => {
      const filings = payload?.filings || [];
      return {
        count: filings.length,
        top: filings.slice(0, 3),
      };
    };
    return { a: out(tmA), b: out(tmB) };
  }, [tmA, tmB]);

  // Verdict line - auto-generated
  const verdict = useMemo(() => {
    const aName = prettyName(brandA, brandNames);
    const bName = prettyName(brandB, brandNames);
    // Pick the most informative differentiator we have.
    if (promoData.a.count > 0 && promoData.b.count > 0 && promoData.a.avg !== null && promoData.b.avg !== null) {
      const aDeeper = promoData.a.avg > promoData.b.avg;
      const winnerName = aDeeper ? aName : bName;
      const loserName = aDeeper ? bName : aName;
      const winnerPct = aDeeper ? promoData.a.avg : promoData.b.avg;
      const loserPct = aDeeper ? promoData.b.avg : promoData.a.avg;
      return `Both brands run promotions today, but ${winnerName} discounts deeper (-${winnerPct.toFixed(0)}%) vs ${loserName} (-${loserPct.toFixed(0)}%).`;
    }
    if (promoData.a.count > 0 && promoData.b.count === 0) {
      return `${aName} is actively promoting today (${promoData.a.count} SKUs on sale); ${bName} is at full price.`;
    }
    if (promoData.b.count > 0 && promoData.a.count === 0) {
      return `${bName} is actively promoting today (${promoData.b.count} SKUs on sale); ${aName} is at full price.`;
    }
    if (mixData.a.total > 0 && mixData.b.total > 0) {
      const bigger = mixData.a.total > mixData.b.total ? aName : bName;
      const smaller = mixData.a.total > mixData.b.total ? bName : aName;
      const bigCount = Math.max(mixData.a.total, mixData.b.total);
      const smallCount = Math.min(mixData.a.total, mixData.b.total);
      return `${bigger} carries ${bigCount} SKUs vs ${smaller} at ${smallCount} - a ${((bigCount / Math.max(smallCount, 1))).toFixed(1)}x assortment gap.`;
    }
    return `Side-by-side view of ${aName} and ${bName}. Pick different brands to see where the gaps and moats are.`;
  }, [brandA, brandB, brandNames, promoData, mixData]);

  // -------------------- helper UI elements --------------------

  const indicator = (a: number, b: number, higherIsBetter = true): string => {
    if (a === b || (a === 0 && b === 0)) return '=';
    const aWins = higherIsBetter ? a > b : a < b;
    return aWins ? '<' : '>';
  };

  // -------------------- Render --------------------

  if (authError) {
    return <div className="text-center py-20 text-gr-danger">{authError}</div>;
  }

  const aName = prettyName(brandA, brandNames);
  const bName = prettyName(brandB, brandNames);

  return (
    <div className="space-y-10">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Brand vs Brand
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Side-by-side competitive view
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Pick any two brands. See every dimension we track in two columns. Defaults to Gymreapers vs the most-similar peer for the current strategic frame (apparel-tier).
        </p>
      </header>

      {/* Quick-link CTA strip */}
      <section className="flex flex-wrap gap-2">
        <Link
          href="/journey"
          className="px-3 py-1.5 rounded text-xs font-semibold bg-gr-raised text-gr-muted hover:text-gr-text hover:bg-gr-accent-soft transition"
        >
          Drill into customer journey
        </Link>
        <Link
          href="/apparel-entry-candidates"
          className="px-3 py-1.5 rounded text-xs font-semibold bg-gr-raised text-gr-muted hover:text-gr-text hover:bg-gr-accent-soft transition"
        >
          What to enter first
        </Link>
        <Link
          href="/for-product/gaps"
          className="px-3 py-1.5 rounded text-xs font-semibold bg-gr-raised text-gr-muted hover:text-gr-text hover:bg-gr-accent-soft transition"
        >
          Coverage gaps detail
        </Link>
      </section>

      {/* Brand picker */}
      <section className="sticky top-16 z-30 bg-gr-surface/95 backdrop-blur-md border border-gr-border rounded-md p-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
              Brand A
            </label>
            <select
              value={brandA}
              onChange={(e) => {
                const v = e.target.value;
                setBrandA(v);
                trackEvent('click', { label: 'compare_pick_a', metadata: { brand: v } });
              }}
              className="w-full bg-gr-bg border border-gr-border rounded px-3 py-2 text-sm text-gr-text"
            >
              {brandList.map((slug) => (
                <option key={slug} value={slug}>{prettyName(slug, brandNames)}</option>
              ))}
            </select>
          </div>
          <div className="flex sm:flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={swap}
              className="px-3 py-2 rounded text-xs font-bold uppercase tracking-wider bg-gr-accent text-gr-text hover:opacity-90 transition"
              title="Swap A and B"
            >
              Swap
            </button>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
              Brand B
            </label>
            <select
              value={brandB}
              onChange={(e) => {
                const v = e.target.value;
                setBrandB(v);
                trackEvent('click', { label: 'compare_pick_b', metadata: { brand: v } });
              }}
              className="w-full bg-gr-bg border border-gr-border rounded px-3 py-2 text-sm text-gr-text"
            >
              {brandList.map((slug) => (
                <option key={slug} value={slug}>{prettyName(slug, brandNames)}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Column header */}
      <section className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-1">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Brand A</div>
          <div className="text-2xl font-bold text-gr-text">{aName}</div>
        </div>
        <div className="text-gr-subtle text-xs uppercase tracking-widest">vs</div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Brand B</div>
          <div className="text-2xl font-bold text-gr-text">{bName}</div>
        </div>
      </section>

      {/* Panel 1: Product Mix */}
      <ComparePanel
        title="Product mix"
        subtitle="Total catalog + top categories and subcategories"
        confidence="brand_mix"
        loading={loading.mix}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <BrandColumn align="right">
            <BigStat label="Total SKUs" value={mixData.a.total.toLocaleString()} />
            <BigStat label="Unique styles" value={mixData.a.uniqueStyles.toLocaleString()} small />
            <ListBlock label="Top categories" rows={mixData.a.topCategories.map(([k, v]) => ({ key: pretty(k), value: String(v) }))} align="right" />
            <ListBlock label="Top subcategories" rows={mixData.a.topSubcategories.map(([k, v]) => ({ key: pretty(k), value: String(v) }))} align="right" />
          </BrandColumn>
          <Versus indicator={indicator(mixData.a.total, mixData.b.total)} caption="SKU count" />
          <BrandColumn>
            <BigStat label="Total SKUs" value={mixData.b.total.toLocaleString()} />
            <BigStat label="Unique styles" value={mixData.b.uniqueStyles.toLocaleString()} small />
            <ListBlock label="Top categories" rows={mixData.b.topCategories.map(([k, v]) => ({ key: pretty(k), value: String(v) }))} />
            <ListBlock label="Top subcategories" rows={mixData.b.topSubcategories.map(([k, v]) => ({ key: pretty(k), value: String(v) }))} />
          </BrandColumn>
        </div>
      </ComparePanel>

      {/* Panel 2: Pricing */}
      <ComparePanel
        title="Pricing"
        subtitle="Average, range, and tier distribution"
        confidence="shopify_catalog"
        loading={loading.pricing}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <BrandColumn align="right">
            <BigStat label="Avg price" value={fmtMoney(pricingData.a.avg)} />
            <Row label="Min" value={fmtMoney(pricingData.a.min)} align="right" />
            <Row label="Max" value={fmtMoney(pricingData.a.max)} align="right" />
            <ListBlock label="Price tier mix" rows={pricingData.a.tiers.map(([k, v]) => ({ key: pretty(k), value: String(v) }))} align="right" />
          </BrandColumn>
          <Versus indicator={indicator(pricingData.a.avg ?? 0, pricingData.b.avg ?? 0)} caption="Avg price" />
          <BrandColumn>
            <BigStat label="Avg price" value={fmtMoney(pricingData.b.avg)} />
            <Row label="Min" value={fmtMoney(pricingData.b.min)} />
            <Row label="Max" value={fmtMoney(pricingData.b.max)} />
            <ListBlock label="Price tier mix" rows={pricingData.b.tiers.map(([k, v]) => ({ key: pretty(k), value: String(v) }))} />
          </BrandColumn>
        </div>
      </ComparePanel>

      {/* Panel 3: Promo activity today */}
      <ComparePanel
        title="Promo activity today"
        subtitle="SKUs on sale, average discount, and top categories"
        confidence="promo_tracker"
        loading={loading.promo}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <BrandColumn align="right">
            <BigStat label="SKUs on sale" value={promoData.a.count.toLocaleString()} />
            <Row label="Avg discount" value={fmtPct(promoData.a.avg, 0)} align="right" />
            <Row label="Max discount" value={fmtPct(promoData.a.max, 0)} align="right" />
            <ListBlock label="Top categories on sale" rows={promoData.a.topCategories.map(([k, v]) => ({ key: pretty(k), value: String(v) }))} align="right" />
          </BrandColumn>
          <Versus indicator={indicator(promoData.a.count, promoData.b.count)} caption="Promo intensity" />
          <BrandColumn>
            <BigStat label="SKUs on sale" value={promoData.b.count.toLocaleString()} />
            <Row label="Avg discount" value={fmtPct(promoData.b.avg, 0)} />
            <Row label="Max discount" value={fmtPct(promoData.b.max, 0)} />
            <ListBlock label="Top categories on sale" rows={promoData.b.topCategories.map(([k, v]) => ({ key: pretty(k), value: String(v) }))} />
          </BrandColumn>
        </div>
      </ComparePanel>

      {/* Panel 4: Sentiment + complaints */}
      <ComparePanel
        title="Sentiment and complaints"
        subtitle="Top review themes and complaint distribution"
        confidence="review_themes"
        loading={loading.sentiment}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <BrandColumn align="right">
            <ThemesBlock title="Positive themes" rows={sentimentData.a.positive} align="right" />
            <ThemesBlock title="Negative themes" rows={sentimentData.a.negative} align="right" />
            <BigStat label="Complaints captured" value={sentimentData.a.complaintsTotal.toLocaleString()} small />
            <ListBlock
              label="Top complaint kinds"
              rows={sentimentData.a.topComplaints.map((c) => ({ key: pretty(c.kind), value: `${c.count} (${c.pct.toFixed(0)}%)` }))}
              align="right"
            />
          </BrandColumn>
          <Versus
            indicator={indicator(sentimentData.a.complaintsTotal, sentimentData.b.complaintsTotal, false)}
            caption="Fewer complaints wins"
          />
          <BrandColumn>
            <ThemesBlock title="Positive themes" rows={sentimentData.b.positive} />
            <ThemesBlock title="Negative themes" rows={sentimentData.b.negative} />
            <BigStat label="Complaints captured" value={sentimentData.b.complaintsTotal.toLocaleString()} small />
            <ListBlock
              label="Top complaint kinds"
              rows={sentimentData.b.topComplaints.map((c) => ({ key: pretty(c.kind), value: `${c.count} (${c.pct.toFixed(0)}%)` }))}
            />
          </BrandColumn>
        </div>
      </ComparePanel>

      {/* Panel 5: Customer voice (PERSONA) */}
      <ComparePanel
        title="Customer voice"
        subtitle="3 voice signatures + top life-context phrases"
        confidence="dtc_voc_personas"
        loading={loading.voice}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <BrandColumn align="right">
            <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
              Sample size: {voiceData.a.sampleSize}
            </div>
            <VoiceBlock samples={voiceData.a.samples} />
            <ListBlock
              label="Top life-context phrases"
              rows={voiceData.a.lifeContext.map((p) => ({ key: p.phrase, value: String(p.count) }))}
              align="right"
            />
          </BrandColumn>
          <Versus indicator="-" caption="Qualitative" />
          <BrandColumn>
            <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
              Sample size: {voiceData.b.sampleSize}
            </div>
            <VoiceBlock samples={voiceData.b.samples} />
            <ListBlock
              label="Top life-context phrases"
              rows={voiceData.b.lifeContext.map((p) => ({ key: p.phrase, value: String(p.count) }))}
            />
          </BrandColumn>
        </div>
      </ComparePanel>

      {/* Panel 6: Recent launches (7d) */}
      <ComparePanel
        title="Recent launches (last 7d)"
        subtitle="New product drops detected from sitemap diffs"
        confidence="launches"
        loading={loading.launches}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <BrandColumn align="right">
            <BigStat label="Drops last 7d" value={launchData.a.last7d.toLocaleString()} />
            <LaunchesBlock rows={launchData.a.recent} align="right" />
          </BrandColumn>
          <Versus indicator={indicator(launchData.a.last7d, launchData.b.last7d)} caption="Launch velocity" />
          <BrandColumn>
            <BigStat label="Drops last 7d" value={launchData.b.last7d.toLocaleString()} />
            <LaunchesBlock rows={launchData.b.recent} />
          </BrandColumn>
        </div>
      </ComparePanel>

      {/* Panel 7: TM filings (90d) */}
      <ComparePanel
        title="Trademark filings (last 90d)"
        subtitle="USPTO filings - early signal on upcoming product or brand moves"
        confidence="uspto_trademarks"
        loading={loading.trademarks}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <BrandColumn align="right">
            <BigStat label="Filings 90d" value={tmData.a.count.toLocaleString()} />
            <TmBlock rows={tmData.a.top} align="right" />
          </BrandColumn>
          <Versus indicator={indicator(tmData.a.count, tmData.b.count)} caption="TM activity" />
          <BrandColumn>
            <BigStat label="Filings 90d" value={tmData.b.count.toLocaleString()} />
            <TmBlock rows={tmData.b.top} />
          </BrandColumn>
        </div>
      </ComparePanel>

      {/* Panel 8: Verdict */}
      <section className="bg-gr-accent-soft/30 border border-gr-accent/40 rounded-md p-5">
        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-accent mb-2">Verdict</div>
        <p className="text-gr-text text-lg leading-relaxed">{verdict}</p>
        {gaps && (
          <p className="text-gr-subtle text-xs mt-3">
            Apparel-tier coverage gaps loaded: {(gaps.gaps || []).length} subcategories tracked.
          </p>
        )}
      </section>
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

interface ComparePanelProps {
  title: string;
  subtitle?: string;
  confidence: React.ComponentProps<typeof ConfidenceBadge>['source'];
  loading?: boolean;
  children: React.ReactNode;
}

function ComparePanel({ title, subtitle, confidence, loading, children }: ComparePanelProps) {
  return (
    <section className="bg-gr-surface border border-gr-border rounded-md p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gr-text tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-gr-subtle mt-0.5">{subtitle}</p>}
        </div>
        <ConfidenceBadge source={confidence} />
      </div>
      {loading ? (
        <div className="text-center py-12 text-gr-subtle text-sm">Loading...</div>
      ) : (
        children
      )}
    </section>
  );
}

function BrandColumn({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <div className={`space-y-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </div>
  );
}

function BigStat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">{label}</div>
      <div className={`font-bold text-gr-text tabular-nums ${small ? 'text-xl' : 'text-3xl'}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <div className={`flex items-baseline gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      <span className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle">{label}</span>
      <span className="text-sm text-gr-text tabular-nums">{value}</span>
    </div>
  );
}

interface ListRow { key: string; value: string }

function ListBlock({ label, rows, align = 'left' }: { label: string; rows: ListRow[]; align?: 'left' | 'right' }) {
  if (!rows.length) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">{label}</div>
        <div className="text-xs text-gr-subtle italic">No data</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">{label}</div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.key}
            className={`flex items-baseline gap-2 text-sm ${align === 'right' ? 'justify-end' : 'justify-start'}`}
          >
            {align === 'right' ? (
              <>
                <span className="text-gr-muted tabular-nums">{r.value}</span>
                <span className="text-gr-text capitalize">{r.key}</span>
              </>
            ) : (
              <>
                <span className="text-gr-text capitalize">{r.key}</span>
                <span className="text-gr-muted tabular-nums">{r.value}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Versus({ indicator, caption }: { indicator: string; caption: string }) {
  // Indicator is one of: '<', '>', '=', '-'
  // '<' means Brand A wins (left), '>' means Brand B wins, '=' tie, '-' no comparison
  let symbol = '-';
  let cls = 'text-gr-subtle';
  if (indicator === '<') { symbol = 'A'; cls = 'text-gr-accent'; }
  else if (indicator === '>') { symbol = 'B'; cls = 'text-gr-accent'; }
  else if (indicator === '=') { symbol = '='; cls = 'text-gr-muted'; }
  return (
    <div className="flex flex-col items-center justify-center min-w-[60px] py-4">
      <div className={`w-8 h-8 rounded-full bg-gr-raised border border-gr-border flex items-center justify-center font-bold text-sm ${cls}`}>
        {symbol}
      </div>
      <div className="text-[9px] uppercase tracking-wider font-bold text-gr-subtle mt-1 text-center max-w-[80px] leading-tight">
        {caption}
      </div>
    </div>
  );
}

function ThemesBlock({ title, rows, align = 'left' }: { title: string; rows: ThemeRow[]; align?: 'left' | 'right' }) {
  if (!rows.length) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">{title}</div>
        <div className="text-xs text-gr-subtle italic">No themes captured</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">{title}</div>
      <div className={`flex flex-wrap gap-1.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {rows.map((t) => (
          <span
            key={`${t.brand_slug}-${t.theme}`}
            className={`inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${SENT_STYLES[t.sentiment]}`}
            title={`${t.post_count} posts`}
          >
            <span>{t.theme}</span>
            <span className="opacity-70 tabular-nums">{t.post_count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function VoiceBlock({ samples }: { samples: VoiceSample[] }) {
  if (!samples.length) {
    return <div className="text-xs text-gr-subtle italic">No voice samples</div>;
  }
  return (
    <div className="space-y-3">
      {samples.map((s, i) => (
        <div key={i} className="bg-gr-raised/40 border border-gr-border rounded p-3 text-left">
          {s.voice_signature && (
            <div className="text-xs text-gr-accent font-semibold uppercase tracking-wider mb-1">
              {s.voice_signature}
            </div>
          )}
          {s.quoted_phrase && (
            <div className="text-sm text-gr-text italic mb-2">&ldquo;{s.quoted_phrase}&rdquo;</div>
          )}
          {s.product_relationship && (
            <div className="inline-flex px-1.5 py-0.5 rounded bg-gr-accent-soft text-gr-accent text-[10px] font-bold uppercase tracking-wider">
              {s.product_relationship}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LaunchesBlock({ rows, align = 'left' }: { rows: Array<{ product_name: string; url?: string; date?: string | null; subcategory?: string }>; align?: 'left' | 'right' }) {
  if (!rows.length) {
    return <div className="text-xs text-gr-subtle italic">No recent drops</div>;
  }
  return (
    <ul className={`space-y-2 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {rows.map((r, i) => (
        <li key={i} className="text-sm">
          {r.url ? (
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-gr-text hover:text-gr-accent underline-offset-2 hover:underline">
              {r.product_name}
            </a>
          ) : (
            <span className="text-gr-text">{r.product_name}</span>
          )}
          <span className="text-[11px] text-gr-subtle ml-2 tabular-nums">{r.date || '-'}</span>
          {r.subcategory && (
            <span className="text-[11px] text-gr-muted ml-2 capitalize">{pretty(r.subcategory)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function TmBlock({ rows, align = 'left' }: { rows: TrademarkRow[]; align?: 'left' | 'right' }) {
  if (!rows.length) {
    return <div className="text-xs text-gr-subtle italic">No filings</div>;
  }
  return (
    <ul className={`space-y-2 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {rows.map((r, i) => (
        <li key={r.serial_number || i} className="text-sm">
          {r.source_url ? (
            <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-gr-text hover:text-gr-accent underline-offset-2 hover:underline">
              {r.mark_text || r.serial_number || '-'}
            </a>
          ) : (
            <span className="text-gr-text">{r.mark_text || r.serial_number || '-'}</span>
          )}
          <span className="text-[11px] text-gr-subtle ml-2 tabular-nums">{r.filing_date || '-'}</span>
          {r.international_class && (
            <span className="text-[11px] text-gr-muted ml-2">cls {r.international_class}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
