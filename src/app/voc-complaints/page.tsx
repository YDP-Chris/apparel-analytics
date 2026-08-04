'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

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

interface BrandRow {
  brand_slug: string;
  total_complaints: number;
  top_kinds: Array<{ kind: ComplaintKind; count: number; pct: number }>;
}

interface KindRow {
  kind: ComplaintKind;
  count: number;
  top_brands: Array<{ slug: string; count: number }>;
}

interface DrillRow {
  source_id: number;
  brand_slug: string;
  kind: ComplaintKind;
  severity: 'low' | 'medium' | 'high';
  snippet: string;
  product_name?: string | null;
  product_url?: string | null;
  rating?: number | null;
}

interface SampleRow {
  brand: string;
  kind: ComplaintKind;
  severity: 'low' | 'medium' | 'high';
  snippet: string;
  product_name?: string | null;
  rating?: number | null;
}

interface VocPayload {
  available: boolean;
  total_rows: number;
  by_brand: BrandRow[];
  by_kind: KindRow[];
  drill: DrillRow[];
  sample_evidence: SampleRow[];
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

const SEVERITY_STYLES: Record<DrillRow['severity'], { bg: string; text: string }> = {
  high: { bg: 'bg-gr-danger/15', text: 'text-gr-danger' },
  medium: { bg: 'bg-gr-accent-soft/40', text: 'text-gr-accent' },
  low: { bg: 'bg-gr-raised', text: 'text-gr-muted' },
};

function HeatCell({ pct }: { pct: number }) {
  // Map 0-100% to a single accent ramp. Empty cells stay neutral.
  if (!pct || pct <= 0) {
    return <td className="px-2 py-1.5 text-center text-gr-subtle text-[10px]">·</td>;
  }
  // Tailwind opacity buckets - keep small so we don't blow up the CSS.
  const intensity =
    pct >= 40 ? 'bg-gr-accent text-gr-bg' :
    pct >= 25 ? 'bg-gr-accent/70 text-gr-bg' :
    pct >= 15 ? 'bg-gr-accent/45 text-gr-text' :
    pct >= 8  ? 'bg-gr-accent/25 text-gr-text' :
                'bg-gr-accent/10 text-gr-muted';
  return (
    <td className={`px-2 py-1.5 text-center text-[11px] tabular-nums font-semibold ${intensity}`}>
      {pct.toFixed(0)}%
    </td>
  );
}

export default function VocComplaintsPage() {
  const [data, setData] = useState<VocPayload | null>(null);
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
    fetch(`${PULSE_API}/pulse/voc-complaints${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: VocPayload) => {
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

  // Cell lookup for the heatmap: pct[brand][kind]
  const heatmap = useMemo(() => {
    if (!data) return { brands: [] as string[], kinds: [] as ComplaintKind[], pct: {} as Record<string, Record<string, number>> };
    const brands = data.by_brand.map((b) => b.brand_slug);
    const kinds = data.kinds_taxonomy;
    const pct: Record<string, Record<string, number>> = {};
    for (const b of data.by_brand) {
      pct[b.brand_slug] = {};
      for (const k of b.top_kinds) {
        pct[b.brand_slug][k.kind] = k.pct;
      }
    }
    return { brands, kinds, pct };
  }, [data]);

  const gymreapersPeerCompare = useMemo(() => {
    if (!data) return null;
    const gr = data.by_brand.find((b) => b.brand_slug === 'gymreapers');
    if (!gr) return null;
    const peers = data.by_brand.filter((b) => b.brand_slug !== 'gymreapers');
    if (!peers.length) return null;
    const kinds = data.kinds_taxonomy;
    const out = kinds.map((k) => {
      const grPct = gr.top_kinds.find((tk) => tk.kind === k)?.pct ?? 0;
      const peerPcts = peers
        .map((p) => p.top_kinds.find((tk) => tk.kind === k)?.pct ?? 0)
        .filter((v) => Number.isFinite(v));
      const peerAvg = peerPcts.length ? peerPcts.reduce((a, b) => a + b, 0) / peerPcts.length : 0;
      return { kind: k, gr: grPct, peer: peerAvg, delta: grPct - peerAvg };
    });
    out.sort((a, b) => b.delta - a.delta);
    return out;
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading complaints...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data || data.total_rows === 0) {
    return (
      <div className="space-y-12">
        <HubTabs hub="voc" />
      <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Product · VoC Complaints
            </p>
            <ConfidenceBadge source="dtc_voc_complaints" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            What customers complain about, by brand
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            No data yet
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The classifier has not run yet, or no negative reviews have been processed. Once it
            runs you will see brand x kind distribution, evidence quotes, and a Gymreapers vs peer
            comparison.
          </p>
        </section>
      </div>
    );
  }

  const brandLabel = (slug: string) => data.brand_names[slug] || slug;
  const totalAcrossBrands = data.by_brand.reduce((a, b) => a + b.total_complaints, 0);

  return (
    <div className="space-y-12">
      <HubTabs hub="voc" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product · VoC Complaints
          </p>
          <ConfidenceBadge source="dtc_voc_complaints" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What customers complain about, by brand
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Claude reads every negative D2C review (rating 3 or lower, plus reviews that contain
          gripe keywords) and tags it against a fixed complaint taxonomy. Use this to spot product
          opportunities (what peers do badly) and own weaknesses (what we should fix).
        </p>
      </header>

      <SectionExplainer
        what="Each negative review is multi-label-tagged against ten complaint kinds (fit, durability, material, shipping, service, price/value, wrong item, comfort, support, listing mismatch). The heatmap below shows the share of each brand's complaints that fall into each kind."
        howToRead="Darker cells mean a bigger share of that brand's complaints. Compare across columns (kinds) to spot a brand-specific weakness. Compare across rows to spot which kinds are universal industry problems."
        whatToDo="If a peer has a dark cell that Gymreapers doesn't, you have a positioning opportunity (we don't have that problem). If Gymreapers has a dark cell, prioritise that fix on the next product spec review."
      />

      {/* Filters */}
      <section className="flex flex-wrap gap-3 items-center text-xs">
        <span className="font-bold text-gr-subtle uppercase tracking-[0.2em]">Filter</span>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { setBrandFilter(null); trackEvent('click', { label: 'voc_filter_brand', metadata: { brand: 'all' } }); }}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold ${!brandFilter ? 'bg-gr-accent text-gr-bg' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
          >
            All brands
          </button>
          {heatmap.brands.map((b) => (
            <button
              key={b}
              onClick={() => { setBrandFilter(b === brandFilter ? null : b); trackEvent('click', { label: 'voc_filter_brand', metadata: { brand: b } }); }}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${brandFilter === b ? 'bg-gr-accent text-gr-bg' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
            >
              {brandLabel(b)}
            </button>
          ))}
        </div>
        <span className="text-gr-subtle">·</span>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => { setKindFilter(null); trackEvent('click', { label: 'voc_filter_kind', metadata: { kind: 'all' } }); }}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold ${!kindFilter ? 'bg-gr-accent text-gr-bg' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
          >
            All kinds
          </button>
          {data.kinds_taxonomy.map((k) => (
            <button
              key={k}
              onClick={() => { setKindFilter(k === kindFilter ? null : k); trackEvent('click', { label: 'voc_filter_kind', metadata: { kind: k } }); }}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${kindFilter === k ? 'bg-gr-accent text-gr-bg' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
            >
              {KIND_LABELS[k] || k}
            </button>
          ))}
        </div>
      </section>

      {/* 2x2 panel grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1 - Heatmap */}
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <h2 className="text-sm font-bold text-gr-text uppercase tracking-[0.15em] mb-1">
            Brand x complaint heatmap
          </h2>
          <p className="text-xs text-gr-muted mb-4">
            Share of each brand&apos;s complaints by kind. {totalAcrossBrands} total complaint rows.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-gr-subtle uppercase tracking-wider">
                  <th className="text-left py-1.5 pr-3">Brand</th>
                  {heatmap.kinds.map((k) => (
                    <th key={k} className="px-1.5 py-1.5 text-center whitespace-nowrap font-semibold">
                      {KIND_LABELS[k] || k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.brands.map((b) => (
                  <tr key={b} className="border-t border-gr-border/40">
                    <td className="text-left py-1 pr-3 text-gr-text font-semibold whitespace-nowrap">
                      {brandLabel(b)}
                      <span className="ml-1.5 text-gr-subtle font-normal">
                        ({data.by_brand.find((x) => x.brand_slug === b)?.total_complaints ?? 0})
                      </span>
                    </td>
                    {heatmap.kinds.map((k) => (
                      <HeatCell key={k} pct={heatmap.pct[b]?.[k] ?? 0} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 2 - Top kind per brand */}
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <h2 className="text-sm font-bold text-gr-text uppercase tracking-[0.15em] mb-1">
            Top complaint per brand
          </h2>
          <p className="text-xs text-gr-muted mb-4">
            The single biggest gripe driving each brand&apos;s negative reviews.
          </p>
          <div className="space-y-2">
            {data.by_brand.map((b) => {
              const top = b.top_kinds[0];
              if (!top) return null;
              return (
                <div key={b.brand_slug} className="flex items-center justify-between gap-3 py-1.5 px-3 bg-gr-bg rounded">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gr-text truncate">{brandLabel(b.brand_slug)}</div>
                    <div className="text-[11px] text-gr-subtle">{b.total_complaints} complaint rows</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gr-accent-soft text-gr-accent uppercase tracking-wider">
                      {KIND_LABELS[top.kind] || top.kind}
                    </span>
                    <span className="text-xs text-gr-muted tabular-nums">{top.pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel 3 - Gymreapers vs peer average */}
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <h2 className="text-sm font-bold text-gr-text uppercase tracking-[0.15em] mb-1">
            Gymreapers vs peer average
          </h2>
          <p className="text-xs text-gr-muted mb-4">
            Positive delta = we are over-indexed on this complaint vs peers. Negative = we are doing
            better than peers here.
          </p>
          {!gymreapersPeerCompare ? (
            <p className="text-xs text-gr-subtle italic">
              No Gymreapers complaint data yet - the classifier needs to process Gymreapers reviews first.
            </p>
          ) : (
            <div className="space-y-1.5">
              {gymreapersPeerCompare
                .filter((r) => r.gr > 0 || r.peer > 0)
                .map((r) => {
                  const maxAbs = Math.max(...gymreapersPeerCompare.map((x) => Math.max(x.gr, x.peer)));
                  const grW = maxAbs ? (r.gr / maxAbs) * 100 : 0;
                  const peerW = maxAbs ? (r.peer / maxAbs) * 100 : 0;
                  const sign = r.delta >= 0 ? '+' : '-';
                  return (
                    <div key={r.kind} className="text-xs">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className="text-gr-text font-semibold">{KIND_LABELS[r.kind] || r.kind}</span>
                        <span className={`tabular-nums ${r.delta >= 0 ? 'text-gr-danger' : 'text-gr-success'}`}>
                          {sign}{Math.abs(r.delta).toFixed(1)}pp
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-2 bg-gr-raised rounded relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-gr-accent" style={{ width: `${grW}%` }} title={`GR ${r.gr.toFixed(1)}%`} />
                        </div>
                        <span className="w-10 text-right text-gr-muted tabular-nums">GR {r.gr.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-2 bg-gr-raised rounded relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-gr-subtle" style={{ width: `${peerW}%` }} title={`peer ${r.peer.toFixed(1)}%`} />
                        </div>
                        <span className="w-10 text-right text-gr-muted tabular-nums">peer {r.peer.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Panel 4 - Sample evidence */}
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <h2 className="text-sm font-bold text-gr-text uppercase tracking-[0.15em] mb-1">
            Sample evidence
          </h2>
          <p className="text-xs text-gr-muted mb-4">
            One quote per (brand, kind) - high-severity first. Useful for sourcing competitor swipe.
          </p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {data.sample_evidence.length === 0 ? (
              <p className="text-xs text-gr-subtle italic">No evidence quotes captured yet.</p>
            ) : (
              data.sample_evidence.map((s, i) => {
                const sev = SEVERITY_STYLES[s.severity];
                return (
                  <div key={i} className="bg-gr-bg rounded p-3 border border-gr-border/60">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] font-bold text-gr-text uppercase tracking-wider">
                        {brandLabel(s.brand)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gr-accent-soft text-gr-accent uppercase tracking-wider">
                        {KIND_LABELS[s.kind] || s.kind}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sev.bg} ${sev.text} uppercase tracking-wider`}>
                        {s.severity}
                      </span>
                      {s.rating !== null && s.rating !== undefined && (
                        <span className="text-[10px] text-gr-subtle">★ {s.rating.toFixed(1)}</span>
                      )}
                    </div>
                    <p className="text-xs text-gr-muted italic leading-snug">&ldquo;{s.snippet}&rdquo;</p>
                    {s.product_name && (
                      <p className="text-[10px] text-gr-subtle mt-1 truncate">{s.product_name}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Drill-in table */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-5">
        <h2 className="text-sm font-bold text-gr-text uppercase tracking-[0.15em] mb-1">
          Drill-in - latest tagged complaints
        </h2>
        <p className="text-xs text-gr-muted mb-4">
          Most recently classified rows. Filter above to narrow down.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gr-subtle uppercase tracking-wider">
              <tr>
                <th className="text-left py-2 pr-3 font-semibold">Brand</th>
                <th className="text-left py-2 pr-3 font-semibold">Kind</th>
                <th className="text-left py-2 pr-3 font-semibold">Severity</th>
                <th className="text-left py-2 pr-3 font-semibold">Rating</th>
                <th className="text-left py-2 pr-3 font-semibold">Quote</th>
                <th className="text-left py-2 font-semibold">Product</th>
              </tr>
            </thead>
            <tbody>
              {data.drill.slice(0, 80).map((d) => {
                const sev = SEVERITY_STYLES[d.severity];
                return (
                  <tr key={`${d.source_id}-${d.kind}`} className="border-t border-gr-border/40">
                    <td className="py-2 pr-3 font-semibold text-gr-text whitespace-nowrap">
                      {brandLabel(d.brand_slug)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gr-accent-soft text-gr-accent uppercase tracking-wider">
                        {KIND_LABELS[d.kind] || d.kind}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sev.bg} ${sev.text} uppercase tracking-wider`}>
                        {d.severity}
                      </span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-gr-muted">
                      {d.rating !== null && d.rating !== undefined ? d.rating.toFixed(1) : '-'}
                    </td>
                    <td className="py-2 pr-3 text-gr-muted italic max-w-md">
                      &ldquo;{d.snippet}&rdquo;
                    </td>
                    <td className="py-2 text-gr-muted">
                      {d.product_url ? (
                        <a
                          href={d.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('outbound', { label: 'voc_product_link', metadata: { brand: d.brand_slug } })}
                          className="hover:text-gr-accent truncate inline-block max-w-[200px] align-bottom"
                        >
                          {d.product_name || 'view'}
                        </a>
                      ) : (
                        <span className="truncate inline-block max-w-[200px]">{d.product_name || '-'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="text-xs text-gr-subtle">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.review_complaints</code> ·
        Classified by Claude Sonnet 4.6 · Run via /mnt/data/agents/voc-complaint-classifier
      </div>
    </div>
  );
}
