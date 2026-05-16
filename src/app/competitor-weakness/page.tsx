'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

type ComplaintKind =
  | 'fit_issue'
  | 'durability'
  | 'material_quality'
  | 'shipping_delivery'
  | 'customer_service'
  | 'price_value'
  | 'incorrect_product'
  | 'comfort_chafing'
  | 'support_protection'
  | 'description_mismatch';

type Severity = 'low' | 'medium' | 'high';

interface VulnerableSku {
  brand_slug: string;
  product_handle: string;
  product_name?: string | null;
  product_url?: string | null;
  complaint_breakdown: Record<string, number>;
  total_complaints: number;
  severities: Severity[];
  top_quotes: Array<{ kind: ComplaintKind; snippet: string }>;
  dominant_kind: ComplaintKind | null;
}

interface BrandSummary {
  brand_slug: string;
  vulnerable_sku_count: number;
  total_complaints: number;
  top_complaint_kind: ComplaintKind | null;
}

interface KindSummary {
  kind: ComplaintKind;
  count: number;
  sku_count: number;
  brand_count: number;
}

interface WeaknessPayload {
  available: boolean;
  vulnerable_skus: VulnerableSku[];
  by_brand_summary: BrandSummary[];
  by_kind_summary: KindSummary[];
  brand_names: Record<string, string>;
  kinds_taxonomy: ComplaintKind[];
  filters: { brand: string | null; kind: string | null };
  error?: string;
}

const KIND_LABELS: Record<ComplaintKind, string> = {
  fit_issue: 'Fit',
  durability: 'Durability',
  material_quality: 'Material',
  shipping_delivery: 'Shipping',
  customer_service: 'Service',
  price_value: 'Price / value',
  incorrect_product: 'Wrong item',
  comfort_chafing: 'Comfort',
  support_protection: 'Support',
  description_mismatch: 'Listing mismatch',
};

// Each kind gets a stable color band so the stacked bar reads at a glance.
// Tokens are gr-* tailwind utilities; the hex fallbacks render the actual fills.
const KIND_BAR_COLOR: Record<ComplaintKind, string> = {
  fit_issue: 'bg-gr-danger',
  material_quality: 'bg-orange-500',
  comfort_chafing: 'bg-yellow-500',
  durability: 'bg-purple-500',
  support_protection: 'bg-pink-500',
  description_mismatch: 'bg-blue-500',
  price_value: 'bg-teal-500',
  shipping_delivery: 'bg-cyan-500',
  customer_service: 'bg-indigo-500',
  incorrect_product: 'bg-gr-subtle',
};

const SEVERITY_STYLES: Record<Severity, { bg: string; text: string }> = {
  high: { bg: 'bg-gr-danger/15', text: 'text-gr-danger' },
  medium: { bg: 'bg-gr-accent-soft/40', text: 'text-gr-accent' },
  low: { bg: 'bg-gr-raised', text: 'text-gr-muted' },
};

// Attack angle copy keyed off the SKU's dominant complaint kind. Short, the
// kind of line a product marketer would actually paste into a brief.
const ATTACK_ANGLES: Record<ComplaintKind, string> = {
  fit_issue: 'emphasize precision sizing + true-to-size fit notes',
  material_quality: 'lead with squat-proof opacity claim + fabric weight spec',
  comfort_chafing: 'lead with no-chafe flatlock construction + gusset detail',
  durability: 'lead with reinforced stitching + wash-test guarantee',
  support_protection: 'lead with high-rise compression + secure pocket spec',
  description_mismatch: 'show real-customer photos + true measurements on PDP',
  price_value: 'frame value with cost-per-wear math + bundle savings',
  shipping_delivery: 'guarantee 3-day shipping + visible tracking',
  customer_service: 'lead with no-questions returns + human-reply SLA',
  incorrect_product: 'show pick-and-pack QA process + accurate variant photos',
};

function StackedBar({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  const entries = (Object.entries(breakdown) as Array<[ComplaintKind, number]>)
    .sort((a, b) => b[1] - a[1]);
  if (total <= 0) {
    return <div className="h-2 bg-gr-raised rounded" />;
  }
  return (
    <div className="h-2 flex rounded overflow-hidden bg-gr-raised">
      {entries.map(([kind, count]) => {
        const pct = (count / total) * 100;
        const cls = KIND_BAR_COLOR[kind] || 'bg-gr-subtle';
        return (
          <div
            key={kind}
            className={cls}
            style={{ width: `${pct}%` }}
            title={`${KIND_LABELS[kind] || kind}: ${count} (${pct.toFixed(0)}%)`}
          />
        );
      })}
    </div>
  );
}

export default function CompetitorWeaknessPage() {
  const [data, setData] = useState<WeaknessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<ComplaintKind | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (brandFilter) params.set('brand', brandFilter);
    if (kindFilter) params.set('kind', kindFilter);
    const qs = params.toString();
    fetch(`${PULSE_API}/pulse/competitor-weakness${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: WeaknessPayload) => {
        if (!j.available) {
          setError(j.error || 'Endpoint unavailable');
          return;
        }
        setData(j);
        setError(null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [brandFilter, kindFilter]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const totalSkus = data.vulnerable_skus.length;
    const topBrand = data.by_brand_summary[0] || null;
    const topKind = data.by_kind_summary[0] || null;
    const maxSku = data.vulnerable_skus[0] || null;
    return { totalSkus, topBrand, topKind, maxSku };
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading competitor weakness...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;

  const brandLabel = (slug: string) => (data?.brand_names?.[slug]) || slug;
  const hasData = data && data.vulnerable_skus.length > 0;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product · Competitor Weakness
          </p>
          <ConfidenceBadge source="dtc_voc_complaints" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Specific peer SKUs with concentrated customer pain
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Vulnerable competitor products ranked by complaint concentration. Each SKU shows the
          complaint breakdown by kind, severity mix, and verbatim quotes. These are the products
          Gymreapers can directly out-feature with claims like &ldquo;squat-proof&rdquo; or
          &ldquo;no roll-up&rdquo;.
        </p>
      </header>

      <SectionExplainer
        what="Every negative D2C review is tagged against a ten-kind complaint taxonomy. We then aggregate by (brand, product_handle) and keep any SKU with three or more tagged complaints. The result is a ranked list of competitor products whose own customers are flagging the same issues over and over again."
        howToRead="The stacked bar shows what each SKU's customers actually complain about - the widest segment is the dominant gripe. Severity pills tell you how loud those complaints are. The verbatim quotes are unedited - they are competitor-customer language Gymreapers can mirror or invert in PDP copy."
        whatToDo="Pick the highest-volume SKUs in categories where Gymreapers competes. For each, draft a Gymreapers counter-spec that explicitly fixes the dominant complaint. Ship as a head-to-head feature on the PDP or as a paid creative angle."
      />

      {!hasData ? (
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            No vulnerable SKUs yet
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            Either the classifier has not run or no SKU has crossed the three-complaint threshold.
            Once it has, this page surfaces the most concentrated peer weaknesses.
          </p>
        </section>
      ) : (
        <>
          {/* KPI strip */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gr-surface rounded-md border border-gr-border p-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                Vulnerable SKUs
              </div>
              <div className="text-3xl font-bold text-gr-text tabular-nums">
                {kpis?.totalSkus ?? 0}
              </div>
              <div className="text-[11px] text-gr-muted mt-0.5">3 plus tagged complaints</div>
            </div>
            <div className="bg-gr-surface rounded-md border border-gr-border p-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                Top brand by pain
              </div>
              <div className="text-3xl font-bold text-gr-text">
                {kpis?.topBrand ? brandLabel(kpis.topBrand.brand_slug) : '-'}
              </div>
              <div className="text-[11px] text-gr-muted mt-0.5">
                {kpis?.topBrand
                  ? `${kpis.topBrand.total_complaints} complaints across ${kpis.topBrand.vulnerable_sku_count} SKUs`
                  : ''}
              </div>
            </div>
            <div className="bg-gr-surface rounded-md border border-gr-border p-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                Top complaint kind
              </div>
              <div className="text-3xl font-bold text-gr-text">
                {kpis?.topKind ? (KIND_LABELS[kpis.topKind.kind] || kpis.topKind.kind) : '-'}
              </div>
              <div className="text-[11px] text-gr-muted mt-0.5">
                {kpis?.topKind
                  ? `${kpis.topKind.count} mentions across ${kpis.topKind.sku_count} SKUs`
                  : ''}
              </div>
            </div>
            <div className="bg-gr-surface rounded-md border border-gr-border p-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                Max single-SKU
              </div>
              <div className="text-3xl font-bold text-gr-text tabular-nums">
                {kpis?.maxSku?.total_complaints ?? 0}
              </div>
              <div className="text-[11px] text-gr-muted mt-0.5 truncate">
                {kpis?.maxSku ? `${brandLabel(kpis.maxSku.brand_slug)} · ${kpis.maxSku.product_handle.slice(0, 32)}` : ''}
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="flex flex-wrap gap-3 items-center text-xs">
            <span className="font-bold text-gr-subtle uppercase tracking-[0.2em]">Filter</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => {
                  setBrandFilter(null);
                  trackEvent('click', { label: 'cw_filter_brand', metadata: { brand: 'all' } });
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold ${!brandFilter ? 'bg-gr-accent text-gr-bg' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
              >
                All brands
              </button>
              {data!.by_brand_summary.map((b) => (
                <button
                  key={b.brand_slug}
                  onClick={() => {
                    const next = b.brand_slug === brandFilter ? null : b.brand_slug;
                    setBrandFilter(next);
                    trackEvent('click', { label: 'cw_filter_brand', metadata: { brand: next || 'all' } });
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold ${brandFilter === b.brand_slug ? 'bg-gr-accent text-gr-bg' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
                >
                  {brandLabel(b.brand_slug)}
                </button>
              ))}
            </div>
            <span className="text-gr-subtle">·</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => {
                  setKindFilter(null);
                  trackEvent('click', { label: 'cw_filter_kind', metadata: { kind: 'all' } });
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold ${!kindFilter ? 'bg-gr-accent text-gr-bg' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
              >
                All kinds
              </button>
              {data!.kinds_taxonomy.map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    const next = k === kindFilter ? null : k;
                    setKindFilter(next);
                    trackEvent('click', { label: 'cw_filter_kind', metadata: { kind: next || 'all' } });
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold ${kindFilter === k ? 'bg-gr-accent text-gr-bg' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
                >
                  {KIND_LABELS[k] || k}
                </button>
              ))}
            </div>
          </section>

          {/* Vulnerable SKU cards */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-gr-text uppercase tracking-[0.15em]">
                Vulnerable peer SKUs
              </h2>
              <span className="text-[11px] text-gr-subtle">
                {data!.vulnerable_skus.length} SKUs · sorted by total complaints
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {data!.vulnerable_skus.map((sku) => {
                const dominant = sku.dominant_kind;
                const angle = dominant ? ATTACK_ANGLES[dominant] : null;
                return (
                  <article
                    key={`${sku.brand_slug}::${sku.product_handle}`}
                    className="bg-gr-surface rounded-md border border-gr-border p-4 space-y-3"
                  >
                    {/* Header */}
                    <header className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
                          {brandLabel(sku.brand_slug)}
                        </div>
                        {sku.product_url ? (
                          <a
                            href={sku.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackEvent('outbound', {
                                label: 'cw_product_link',
                                metadata: {
                                  brand: sku.brand_slug,
                                  handle: sku.product_handle.slice(0, 120),
                                },
                              })
                            }
                            className="block text-sm font-semibold text-gr-text hover:text-gr-accent truncate"
                            title={sku.product_name || sku.product_handle}
                          >
                            {sku.product_name || sku.product_handle}
                          </a>
                        ) : (
                          <div
                            className="text-sm font-semibold text-gr-text truncate"
                            title={sku.product_handle}
                          >
                            {sku.product_name || sku.product_handle}
                          </div>
                        )}
                        <div className="text-[10px] text-gr-subtle truncate mt-0.5">
                          {sku.product_handle}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-gr-danger/15 text-gr-danger text-[11px] font-bold tabular-nums whitespace-nowrap">
                        {sku.total_complaints} complaints
                      </span>
                    </header>

                    {/* Stacked bar + legend */}
                    <div>
                      <StackedBar
                        breakdown={sku.complaint_breakdown}
                        total={sku.total_complaints}
                      />
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {(Object.entries(sku.complaint_breakdown) as Array<[ComplaintKind, number]>)
                          .sort((a, b) => b[1] - a[1])
                          .map(([kind, count]) => (
                            <span
                              key={kind}
                              className="inline-flex items-center gap-1 text-[10px] text-gr-muted"
                            >
                              <span
                                className={`inline-block w-2 h-2 rounded-sm ${KIND_BAR_COLOR[kind] || 'bg-gr-subtle'}`}
                              />
                              {KIND_LABELS[kind] || kind}
                              <span className="tabular-nums text-gr-subtle">{count}</span>
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Severity pills */}
                    {sku.severities.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">
                          Severity
                        </span>
                        {sku.severities.map((s) => {
                          const sev = SEVERITY_STYLES[s];
                          return (
                            <span
                              key={s}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sev.bg} ${sev.text}`}
                            >
                              {s}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Top quotes */}
                    {sku.top_quotes.length > 0 && (
                      <div className="space-y-1.5">
                        {sku.top_quotes.slice(0, 3).map((q, i) => (
                          <div key={i} className="text-xs">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gr-accent-soft text-gr-accent uppercase tracking-wider mr-2 align-middle">
                              {KIND_LABELS[q.kind] || q.kind}
                            </span>
                            <span className="text-gr-muted italic leading-snug">
                              &ldquo;{q.snippet}&rdquo;
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Attack angle */}
                    {dominant && angle && (
                      <div className="border-t border-gr-border/60 pt-2.5">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                          Attack angle
                        </div>
                        <div className="text-xs text-gr-text">
                          <span className="font-semibold">
                            Position against {KIND_LABELS[dominant] || dominant}
                          </span>
                          <span className="text-gr-muted"> · {angle}</span>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      <div className="text-xs text-gr-subtle">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.review_complaints</code> ·
        GROUP BY (brand, product_handle) HAVING SUM &gt;= 3 · Classified by Claude Sonnet 4.6
      </div>
    </div>
  );
}
