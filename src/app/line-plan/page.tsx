'use client';

/**
 * /line-plan — Roc + Kalina line plan vs FP&A with competitor depth overlay.
 *
 * Data flow: fetched from the Pi's /pulse/line-plan endpoint (admin auth
 * required). The raw JSON contains FP&A targets, actuals, and the full SKU
 * master with COGS — it must never enter the public static export.
 * SiteAuthProvider (root layout) already enforces login at the page render
 * layer; the API call additionally rejects unauthenticated bearer tokens.
 *
 * Page reads as one narrative top-to-bottom — the same way Roc and
 * Kalina would read it together in a meeting:
 *  1. Headline KPIs (FP&A topline)
 *  2. Category x Sub-Category FP&A heatmap (Kalina's playbook color coding)
 *  3. Competitor depth panel (drilled-down per selected sub-cat)
 */

import { useEffect, useMemo, useState } from 'react';
import type {
  CategoryRow,
  TitleRow,
  CompetitorDepthData,
  LinePlanMeta,
} from './types';
import {
  brandName,
  fmtMoney,
  fmtNum,
  fmtPct,
  varBucket,
  varBucketClasses,
} from './utils';
import type { MonthlySeries } from './types';

function sumMonths(m: MonthlySeries | undefined): number | null {
  if (!m) return null;
  const total = Object.values(m).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  return total > 0 ? total : null;
}

type Loading = { state: 'loading' };
type Loaded = {
  state: 'loaded';
  categories: CategoryRow[];
  titles: TitleRow[];
  depth: CompetitorDepthData;
  meta: LinePlanMeta;
};
type LoadError = { state: 'error'; message: string };
type PageData = Loading | Loaded | LoadError;

// Mirror the env + token keys used by GymreapersProvider so one login covers
// both /gymreapers and /line-plan.
const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const TOKEN_EXPIRY_KEY = 'ydp_pulse_token_expires';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = sessionStorage.getItem(TOKEN_KEY);
  const exp = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!t || !exp) return null;
  if (Date.now() > parseInt(exp, 10)) return null;
  return t;
}

export default function LinePlanPage() {
  const [data, setData] = useState<PageData>({ state: 'loading' });
  const [selectedSubcat, setSelectedSubcat] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    if (!token) {
      // SiteAuthProvider should have intercepted before this renders; if we
      // somehow get here without one, fail loud rather than silently fetch.
      setData({ state: 'error', message: 'Not signed in. Reload the page to log in again.' });
      return;
    }
    fetch(`${PULSE_API}/pulse/line-plan`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) throw new Error('Session expired. Reload the page to log in again.');
        if (r.status === 404) throw new Error('Line plan data not yet generated on the Pi.');
        if (!r.ok) throw new Error(`Failed to load (HTTP ${r.status})`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (!json.available) {
          setData({ state: 'error', message: json.error || 'Line plan unavailable' });
          return;
        }
        setData({
          state: 'loaded',
          categories: json.categories,
          titles: json.titles,
          depth: json.competitor_depth,
          // Stash the API-level demo flag on meta so the view can render
          // the banner without a separate prop chain.
          meta: { ...json.meta, demo_mode: json.demo_mode === true },
        });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setData({ state: 'error', message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (data.state === 'loading') return <div className="text-center py-20 text-gr-subtle">Loading line plan…</div>;
  if (data.state === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Could not load line plan</h1>
        <p className="text-gr-muted">{data.message}</p>
      </div>
    );
  }

  return (
    <LinePlanView
      categories={data.categories}
      titles={data.titles}
      depth={data.depth}
      meta={data.meta}
      selectedSubcat={selectedSubcat}
      onSelectSubcat={setSelectedSubcat}
    />
  );
}

function LinePlanView({
  categories,
  titles,
  depth,
  meta,
  selectedSubcat,
  onSelectSubcat,
}: {
  categories: CategoryRow[];
  titles: TitleRow[];
  depth: CompetitorDepthData;
  meta: LinePlanMeta;
  selectedSubcat: string | null;
  onSelectSubcat: (s: string | null) => void;
}) {
  const totals = useMemo(() => {
    const actual = categories.reduce((s, c) => s + (c.h1_actual || 0), 0);
    const target = categories.reduce((s, c) => s + (c.h1_target || 0), 0);
    const varD = actual - target;
    const varPct = target > 0 ? varD / target : null;
    return { actual, target, varD, varPct };
  }, [categories]);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Line Plan
        </p>
        <h1 className="text-4xl font-bold tracking-tight">H1 2026 Line Plan vs FP&amp;A</h1>
        <p className="text-gr-muted mt-3 max-w-3xl text-lg leading-relaxed">
          Where Gymreapers is hitting and missing the financial plan, by category and sub-category, with side-by-side
          assortment depth against {depth.brands_apparel.length - 1} apparel competitors and {depth.brands_strength.length} strength peers.
        </p>
        <p className="text-xs text-gr-subtle mt-2 font-mono uppercase tracking-wider">
          Source: {meta.sources.line_plan} · {meta.totals.titles} titles · {meta.totals.total_skus.toLocaleString()} SKUs · refreshed {new Date(meta.parsed_at).toLocaleDateString()}
        </p>
      </header>

      {meta.demo_mode && (
        <div className="bg-gr-accent-soft border border-gr-accent/30 rounded-md p-4 flex items-start gap-3">
          <div className="text-gr-accent text-xl mt-0.5">•</div>
          <div>
            <p className="text-sm font-bold text-gr-text">Demo dollar values</p>
            <p className="text-xs text-gr-muted mt-0.5">
              All $ figures are scaled by a constant for sharing. Variance %, # titles, # colors, status mix, MSRP, and competitor depth are exact. Real numbers stay on the Pi.
            </p>
          </div>
        </div>
      )}

      {/* Headline KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <KPI label="H1 Actual" value={fmtMoney(totals.actual, { compact: true })} context="net sales through Jun 19" />
        <KPI label="H1 FP&A Target" value={fmtMoney(totals.target, { compact: true })} context="prorated category targets" />
        <KPI
          label="Variance"
          value={fmtMoney(totals.varD, { compact: true })}
          context={fmtPct(totals.varPct)}
          accent={varBucket(totals.varPct)}
        />
        <KPI label="Active Titles" value={meta.totals.titles.toLocaleString()} context="across 4 categories" />
      </section>

      {/* Section 1: FP&A heatmap */}
      <section className="bg-gr-surface rounded-md border border-gr-border">
        <div className="p-6 border-b border-gr-border">
          <h2 className="text-xl font-bold text-gr-text">Category × Sub-Category Heatmap</h2>
          <p className="text-sm text-gr-muted mt-1">
            Color coding follows Kalina&apos;s playbook: <span className="text-gr-success">green &gt;-5%</span>,{' '}
            <span className="text-yellow-400">amber -5 to -20%</span>,{' '}
            <span className="text-gr-danger">red &lt;-20%</span>. Click any sub-category to see competitor depth.
          </p>
        </div>
        <HeatmapTable
          categories={categories}
          titles={titles}
          selectedSubcat={selectedSubcat}
          onSelectSubcat={onSelectSubcat}
        />
      </section>

      {/* Section 2: Competitor depth (visible when a sub-cat is selected) */}
      {selectedSubcat && (
        <CompetitorDepthPanel
          subcatKey={selectedSubcat}
          depth={depth}
          onClose={() => onSelectSubcat(null)}
          titles={titles.filter((t) => `${t.category}|${t.sub_category}` === selectedSubcat)}
        />
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  context,
  accent,
}: {
  label: string;
  value: string;
  context?: string;
  accent?: 'green' | 'amber' | 'red' | 'neutral';
}) {
  const accentClass = accent
    ? varBucketClasses(accent).text
    : 'text-gr-text';
  return (
    <div className="bg-gr-surface rounded-md p-6 border border-gr-border">
      <p className="text-sm text-gr-subtle font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accentClass}`}>{value}</p>
      {context && <p className="text-xs text-gr-subtle mt-1">{context}</p>}
    </div>
  );
}

function HeatmapTable({
  categories,
  titles,
  selectedSubcat,
  onSelectSubcat,
}: {
  categories: CategoryRow[];
  titles: TitleRow[];
  selectedSubcat: string | null;
  onSelectSubcat: (s: string | null) => void;
}) {
  // Build per-sub-category rollups from titles. We don't have FP&A targets at
  // sub-cat granularity in the workbook (only category-level and title-level),
  // so we roll title-level actuals + prorated targets up by sub-cat.
  const subcatRollup = useMemo(() => {
    const map = new Map<
      string,
      {
        category: string;
        sub_category: string;
        h1_actual: number;
        h1_target: number;
        titleCount: number;
        colorSum: number;
        unitsSum: number;
        msrpSum: number;
        msrpCount: number;
      }
    >();
    for (const t of titles) {
      if (!t.category || !t.sub_category) continue;
      const key = `${t.category}|${t.sub_category}`;
      const row =
        map.get(key) ??
        {
          category: t.category,
          sub_category: t.sub_category,
          h1_actual: 0,
          h1_target: 0,
          titleCount: 0,
          colorSum: 0,
          unitsSum: 0,
          msrpSum: 0,
          msrpCount: 0,
        };
      row.h1_actual += t.h1_net_sales ?? 0;
      row.h1_target += t.h1_target ?? 0;
      row.titleCount += 1;
      row.colorSum += t.color_count ?? 0;
      row.unitsSum += t.h1_units ?? 0;
      if (t.msrp) {
        row.msrpSum += t.msrp;
        row.msrpCount += 1;
      }
      map.set(key, row);
    }
    return Array.from(map.values()).map((r) => ({
      ...r,
      var_dollars: r.h1_actual - r.h1_target,
      var_pct: r.h1_target > 0 ? (r.h1_actual - r.h1_target) / r.h1_target : null,
      msrp_avg: r.msrpCount > 0 ? r.msrpSum / r.msrpCount : null,
    }));
  }, [titles]);

  // Group by category; sort sub-cats within each by h1_actual desc.
  const byCategory = useMemo(() => {
    const cats: Record<string, typeof subcatRollup> = {};
    for (const r of subcatRollup) {
      (cats[r.category] ??= []).push(r);
    }
    for (const cat of Object.keys(cats)) {
      cats[cat].sort((a, b) => b.h1_actual - a.h1_actual);
    }
    return cats;
  }, [subcatRollup]);

  const categoryOrder = useMemo(
    () => [...categories].sort((a, b) => (b.h1_actual ?? 0) - (a.h1_actual ?? 0)).map((c) => c.category),
    [categories]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gr-border text-gr-muted text-left text-xs uppercase tracking-wider">
            <th className="py-3 px-4 font-medium">Category / Sub-Category</th>
            <th className="py-3 px-2 text-right font-medium">H1 Actual</th>
            <th className="py-3 px-2 text-right font-medium">H1 Target</th>
            <th className="py-3 px-2 text-right font-medium">Var %</th>
            <th className="py-3 px-2 text-right font-medium">Var $</th>
            <th className="py-3 px-2 text-right font-medium"># Titles</th>
            <th className="py-3 px-2 text-right font-medium">Avg MSRP</th>
            <th className="py-3 px-2 text-right font-medium">Units</th>
          </tr>
        </thead>
        <tbody>
          {categoryOrder.map((catName) => {
            const cat = categories.find((c) => c.category === catName);
            const subs = byCategory[catName] || [];
            if (!cat) return null;
            const catBucket = varBucket(cat.var_pct);
            const catClasses = varBucketClasses(catBucket);
            return (
              <CategoryGroup
                key={catName}
                cat={cat}
                catClasses={catClasses}
                catBucket={catBucket}
                subs={subs}
                selectedSubcat={selectedSubcat}
                onSelectSubcat={onSelectSubcat}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CategoryGroup({
  cat,
  catClasses,
  catBucket,
  subs,
  selectedSubcat,
  onSelectSubcat,
}: {
  cat: CategoryRow;
  catClasses: { bg: string; text: string; border: string };
  catBucket: ReturnType<typeof varBucket>;
  subs: Array<{
    category: string;
    sub_category: string;
    h1_actual: number;
    h1_target: number;
    var_dollars: number;
    var_pct: number | null;
    titleCount: number;
    unitsSum: number;
    msrp_avg: number | null;
  }>;
  selectedSubcat: string | null;
  onSelectSubcat: (s: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <>
      <tr
        className={`border-b border-gr-border bg-gr-bg cursor-pointer hover:bg-gr-raised ${catClasses.bg}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-4 font-bold text-gr-text">
          <span className="inline-block w-4 text-gr-muted">{expanded ? '▾' : '▸'}</span>
          {cat.category}
        </td>
        <td className="py-3 px-2 text-right font-bold text-gr-text">{fmtMoney(cat.h1_actual, { compact: true })}</td>
        <td className="py-3 px-2 text-right text-gr-muted">{fmtMoney(cat.h1_target, { compact: true })}</td>
        <td className={`py-3 px-2 text-right font-bold ${catClasses.text}`}>{fmtPct(cat.var_pct)}</td>
        <td className={`py-3 px-2 text-right ${catClasses.text}`}>{fmtMoney(cat.var_dollars, { compact: true })}</td>
        <td className="py-3 px-2 text-right text-gr-muted">{fmtNum(cat.title_count)}</td>
        <td className="py-3 px-2 text-right text-gr-muted">
          {cat.avg_dollars_per_title ? fmtMoney(cat.avg_dollars_per_title, { compact: true }) : '—'}
        </td>
        <td className="py-3 px-2 text-right text-gr-muted">{fmtNum(sumMonths(cat.months?.units))}</td>
      </tr>
      {expanded &&
        subs.map((s) => {
          const key = `${s.category}|${s.sub_category}`;
          const b = varBucket(s.var_pct);
          const cls = varBucketClasses(b);
          const isSelected = selectedSubcat === key;
          return (
            <tr
              key={key}
              className={`border-b border-gr-border cursor-pointer hover:bg-gr-raised transition-colors ${
                isSelected ? 'bg-gr-accent-soft' : ''
              }`}
              onClick={() => onSelectSubcat(isSelected ? null : key)}
            >
              <td className="py-2 pl-12 pr-4 text-gr-text">
                {s.sub_category}
                {isSelected && (
                  <span className="ml-2 text-xs text-gr-accent font-bold tracking-wider uppercase">
                    ← viewing
                  </span>
                )}
              </td>
              <td className="py-2 px-2 text-right text-gr-text">{fmtMoney(s.h1_actual, { compact: true })}</td>
              <td className="py-2 px-2 text-right text-gr-muted">{fmtMoney(s.h1_target, { compact: true })}</td>
              <td className={`py-2 px-2 text-right font-semibold ${cls.text}`}>
                <span className={`inline-block px-2 py-0.5 rounded ${cls.bg} ${cls.border} border`}>
                  {fmtPct(s.var_pct)}
                </span>
              </td>
              <td className={`py-2 px-2 text-right ${cls.text}`}>{fmtMoney(s.var_dollars, { compact: true })}</td>
              <td className="py-2 px-2 text-right text-gr-muted">{s.titleCount}</td>
              <td className="py-2 px-2 text-right text-gr-muted">{fmtMoney(s.msrp_avg, { compact: true })}</td>
              <td className="py-2 px-2 text-right text-gr-muted">{fmtNum(s.unitsSum)}</td>
            </tr>
          );
        })}
    </>
  );
}

function CompetitorDepthPanel({
  subcatKey,
  depth,
  titles,
  onClose,
}: {
  subcatKey: string;
  depth: CompetitorDepthData;
  titles: TitleRow[];
  onClose: () => void;
}) {
  const sub = depth.by_gr_subcategory[subcatKey];
  const [category, subCategory] = subcatKey.split('|');
  const gr = sub?.gr_actual;
  const competitors = sub?.competitors || {};

  // Sort competitors by title count desc
  const ranked = Object.entries(competitors)
    .map(([brand, m]) => ({ brand, ...m }))
    .sort((a, b) => b.title_count - a.title_count);

  // GR title count for relative-depth comparison. Prefer the line-plan title
  // count (only revenue-generating titles) over the SKU-master rollup (which
  // includes Discontinued + Limited).
  const grTitleCount = titles.length || gr?.title_count || 0;
  const maxTitles = Math.max(grTitleCount, ...ranked.map((r) => r.title_count), 1);

  return (
    <section className="bg-gr-surface rounded-md border border-gr-border">
      <div className="flex items-start justify-between p-6 border-b border-gr-border">
        <div>
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-1">
            Competitor Depth
          </p>
          <h2 className="text-2xl font-bold text-gr-text">
            {category} · {subCategory}
          </h2>
          <p className="text-sm text-gr-muted mt-1">
            Side-by-side assortment depth. Title counts come from current competitor catalogs (scraped); GR counts come from the H1 2026 line plan workbook (revenue-bearing titles only).
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gr-muted hover:text-gr-text text-2xl leading-none px-2"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <div className="p-6 space-y-3">
        <BrandDepthBar
          brand="gymreapers"
          label={brandName('gymreapers')}
          titleCount={grTitleCount}
          colorCount={gr?.color_count ?? 0}
          msrpAvg={gr?.msrp_avg ?? null}
          msrpMin={null}
          msrpMax={null}
          topColors={[]}
          isFocus
          maxTitles={maxTitles}
        />
        {ranked.length === 0 ? (
          <p className="text-gr-muted text-sm py-4 italic">
            No competitor data for this sub-category yet. (Either the competitor doesn&apos;t carry it, or our scraper hasn&apos;t classified it into this bucket.)
          </p>
        ) : (
          ranked.map((c) => (
            <BrandDepthBar
              key={c.brand}
              brand={c.brand}
              label={brandName(c.brand)}
              titleCount={c.title_count}
              colorCount={c.color_count}
              msrpAvg={c.msrp_avg}
              msrpMin={c.msrp_min}
              msrpMax={c.msrp_max}
              topColors={c.top_colors}
              maxTitles={maxTitles}
              depthMultiplier={grTitleCount > 0 ? c.title_count / grTitleCount : null}
            />
          ))
        )}
      </div>

      {gr && (
        <div className="p-6 border-t border-gr-border bg-gr-bg/50">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gr-muted mb-3">
            GR SKU Status Mix
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(gr.status_mix).map(([status, n]) => (
              <span
                key={status}
                className="text-xs px-3 py-1 rounded-full bg-gr-raised border border-gr-border text-gr-text"
              >
                <span className="font-semibold">{status}</span> · {n.toLocaleString()}
              </span>
            ))}
          </div>
          <p className="text-xs text-gr-subtle mt-3">
            From the SKU master ({gr.sku_count.toLocaleString()} total SKUs). High Discontinued share with active sales = candidates for retirement per Kalina&apos;s playbook.
          </p>
        </div>
      )}
    </section>
  );
}

function BrandDepthBar({
  brand,
  label,
  titleCount,
  colorCount,
  msrpAvg,
  msrpMin,
  msrpMax,
  topColors,
  maxTitles,
  isFocus,
  depthMultiplier,
}: {
  brand: string;
  label: string;
  titleCount: number;
  colorCount: number;
  msrpAvg: number | null;
  msrpMin: number | null;
  msrpMax: number | null;
  topColors: string[];
  maxTitles: number;
  isFocus?: boolean;
  depthMultiplier?: number | null;
}) {
  const width = (titleCount / maxTitles) * 100;
  const priceLabel = msrpMin && msrpMax ? `${fmtMoney(msrpMin, { compact: true })}–${fmtMoney(msrpMax, { compact: true })}` : msrpAvg ? fmtMoney(msrpAvg, { compact: true }) : '—';
  return (
    <div
      className={`p-4 rounded-md border ${
        isFocus
          ? 'bg-gradient-to-r from-gr-accent-soft to-gr-raised border-gr-accent-soft'
          : 'bg-gr-bg border-gr-border'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-40 flex-shrink-0">
          <span className={`font-bold ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
            {isFocus && '→ '}
            {label}
          </span>
          {depthMultiplier != null && depthMultiplier >= 2 && (
            <div className="text-[10px] font-bold text-gr-danger tracking-wider uppercase mt-0.5">
              {depthMultiplier.toFixed(1)}× GR depth
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-6 bg-gr-raised rounded overflow-hidden">
            <div
              className={`h-full ${isFocus ? 'bg-gradient-to-r from-gr-accent-hover to-gr-accent' : 'bg-gr-subtle'}`}
              style={{ width: `${width}%` }}
            />
          </div>
        </div>
        <div className="w-16 text-right">
          <div className={`text-lg font-bold ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
            {titleCount}
          </div>
          <div className="text-[10px] text-gr-subtle uppercase tracking-wider">titles</div>
        </div>
        <div className="w-16 text-right text-gr-muted">
          <div className="text-sm font-semibold">{colorCount}</div>
          <div className="text-[10px] text-gr-subtle uppercase tracking-wider">colors</div>
        </div>
        <div className="w-24 text-right text-gr-muted">
          <div className="text-sm font-semibold">{priceLabel}</div>
          <div className="text-[10px] text-gr-subtle uppercase tracking-wider">MSRP</div>
        </div>
      </div>
      {topColors.length > 0 && (
        <div className="mt-3 pl-44 flex flex-wrap gap-1.5">
          {topColors.slice(0, 6).map((c) => (
            <span
              key={c}
              className="text-[10px] px-2 py-0.5 rounded bg-gr-raised border border-gr-border text-gr-muted"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
