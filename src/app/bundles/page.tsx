'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface SampleBundle {
  title: string;
  price: number | null;
  compare_at_price: number | null;
  category: string | null;
  url: string;
}

interface BundleBrand {
  brand_slug: string;
  brand_name: string;
  total_products: number;
  bundle_products: number;
  bundle_pct: number;
  bundle_avg_price: number | null;
  single_avg_price: number | null;
  bundle_categories: string[];
  sample_bundles: SampleBundle[];
}

interface BundlesResponse {
  available: boolean;
  snapshot_date: string;
  brands: BundleBrand[];
}

function fmtPrice(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return '-';
  return `$${p.toFixed(2)}`;
}

function fmtPct(p: number | null | undefined, digits = 1): string {
  if (p == null || isNaN(p)) return '-';
  return `${p.toFixed(digits)}%`;
}

function fmtMultiple(bundle: number | null | undefined, single: number | null | undefined): string {
  if (bundle == null || single == null || !single || isNaN(bundle) || isNaN(single)) return '-';
  return `${(bundle / single).toFixed(2)}x`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function BundlesPage() {
  const [data, setData] = useState<BundlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/bundles`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: BundlesResponse) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Sort brands by bundle SKU count desc, then derive KPI inputs.
  const { sortedBrands, kpi } = useMemo(() => {
    if (!data || !data.brands) {
      return {
        sortedBrands: [] as BundleBrand[],
        kpi: {
          activeBrands: 0,
          totalBundleSkus: 0,
          grPct: null as number | null,
          grRank: null as number | null,
          peerCount: 0,
          topBrand: null as BundleBrand | null,
        },
      };
    }
    const sorted = [...data.brands].sort((a, b) => (b.bundle_products || 0) - (a.bundle_products || 0));
    const activeBrands = sorted.filter((b) => (b.bundle_products || 0) > 0).length;
    const totalBundleSkus = sorted.reduce((s, b) => s + (b.bundle_products || 0), 0);

    // GR pct rank ordering by bundle_pct desc among brands that have any catalog data.
    const ranked = [...sorted]
      .filter((b) => (b.total_products || 0) > 0)
      .sort((a, b) => (b.bundle_pct || 0) - (a.bundle_pct || 0));
    const grIdx = ranked.findIndex((b) => b.brand_slug === 'gymreapers');
    const gr = sorted.find((b) => b.brand_slug === 'gymreapers') || null;
    const grPct = gr ? gr.bundle_pct : null;
    const grRank = grIdx >= 0 ? grIdx + 1 : null;
    const peerCount = ranked.length;

    const topBrand = ranked[0] || null;

    return {
      sortedBrands: sorted,
      kpi: { activeBrands, totalBundleSkus, grPct, grRank, peerCount, topBrand },
    };
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading bundles...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Product &middot; Bundles
            </p>
            <ConfidenceBadge source="promo_tracker" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            Bundle strategy across brands
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Bundle detection is still warming up
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The price-snapshots pipeline needs at least one cycle before this page renders.
            Daily run lands 5:35 AM ET.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product &middot; Bundles
          </p>
          <ConfidenceBadge source="promo_tracker" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Bundle strategy across brands
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Which brands push multi-pack and bundle SKUs, and how aggressively. Bundle products are
          detected by title keywords (bundle, pack, kit, combo, set, N-pack). Compare bundle pricing
          to single-SKU pricing to see margin lever vs starter offer.
        </p>
      </header>

      <SectionExplainer
        what="Sorted by bundle SKU count. Higher means the brand treats bundles as a strategic line, not a once-off SKU."
        howToRead="Bundle pct is share of catalog that's a bundle. Bundle avg price + single avg price let you see the price-anchoring play (e.g. 3-pack at 2.5x single = 17% discount as a starter offer)."
        whatToDo="If Gymreapers' bundle_pct is below peer median, marketing has a quick win (bundle existing top SKUs). If bundle avg price is high but conversion is low, repackage."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Brands running bundles</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpi.activeBrands}</div>
          <div className="text-xs text-gr-muted mt-1">at least one bundle SKU today</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Total bundle SKUs</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpi.totalBundleSkus}</div>
          <div className="text-xs text-gr-muted mt-1">across the brand set</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Gymreapers bundle pct</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{fmtPct(kpi.grPct)}</div>
          <div className="text-xs text-gr-muted mt-1">
            {kpi.grRank && kpi.peerCount
              ? `${ordinal(kpi.grRank)} of ${kpi.peerCount} brands by share`
              : 'not in current set'}
          </div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Highest bundle share</div>
          <div className="text-xl font-bold text-gr-text leading-tight">
            {kpi.topBrand ? kpi.topBrand.brand_name : '-'}
          </div>
          <div className="text-xs text-gr-muted mt-1 tabular-nums">
            {kpi.topBrand ? `${fmtPct(kpi.topBrand.bundle_pct)} of catalog` : 'no bundles detected'}
          </div>
        </div>
      </section>

      {/* Per-brand cards */}
      {sortedBrands.length === 0 ? (
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-sm text-gr-muted">No brand data captured for today&apos;s snapshot.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedBrands.map((b) => {
            const isGR = b.brand_slug === 'gymreapers';
            const cardClasses = `bg-gr-surface rounded-md border border-gr-border p-6 ${
              isGR ? 'ring-2 ring-gr-accent' : ''
            }`;
            const samples = (b.sample_bundles || []).slice(0, 3);
            return (
              <div key={b.brand_slug} className={cardClasses}>
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="text-xl font-bold text-gr-text tracking-tight">{b.brand_name}</h2>
                  {isGR && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-accent/15 text-gr-accent">
                      Focus brand
                    </span>
                  )}
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Total products</div>
                    <div className="text-lg font-bold text-gr-text tabular-nums">{b.total_products}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Bundle SKUs</div>
                    <div className="text-lg font-bold text-gr-text tabular-nums">{b.bundle_products}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Bundle pct</div>
                    <div className="text-lg font-bold text-gr-accent tabular-nums">{fmtPct(b.bundle_pct)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Bundle avg price</div>
                    <div className="text-lg font-bold text-gr-text tabular-nums">{fmtPrice(b.bundle_avg_price)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Single avg price</div>
                    <div className="text-lg font-bold text-gr-text tabular-nums">{fmtPrice(b.single_avg_price)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Price multiple</div>
                    <div className="text-lg font-bold text-gr-text tabular-nums">
                      {fmtMultiple(b.bundle_avg_price, b.single_avg_price)}
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-5">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Bundle categories</div>
                  {b.bundle_categories && b.bundle_categories.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {b.bundle_categories.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded text-[11px] font-medium capitalize bg-gr-bg text-gr-muted border border-gr-border"
                        >
                          {c.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gr-subtle">No bundle categories detected.</p>
                  )}
                </div>

                {/* Sample bundles */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Top sample bundles</div>
                  {samples.length === 0 ? (
                    <p className="text-xs text-gr-subtle">No sample bundles available.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {samples.map((s, i) => (
                        <li key={`${s.url || s.title}-${i}`} className="text-sm">
                          <a
                            href={s.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackEvent('outbound', {
                              label: 'bundle_link',
                              metadata: { brand_slug: b.brand_slug, href: (s.url || '').slice(0, 200) },
                            })}
                            className="flex items-baseline justify-between gap-3 text-gr-muted hover:text-gr-accent transition"
                          >
                            <span className="flex-1 truncate" title={s.title}>{s.title}</span>
                            <span className="tabular-nums text-gr-text font-medium whitespace-nowrap">
                              {fmtPrice(s.price)}
                              {s.compare_at_price != null && s.price != null && s.compare_at_price > s.price && (
                                <span className="ml-1.5 line-through text-gr-subtle text-xs font-normal">
                                  {fmtPrice(s.compare_at_price)}
                                </span>
                              )}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="text-xs text-gr-subtle">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.price_snapshots</code>.
        Bundle detection uses title-keyword regex (bundle/pack/kit/combo/set/N-pack); some bundles may
        be missed when title doesn&apos;t include a keyword. Updated daily 5:35 AM ET.
      </div>
    </div>
  );
}
