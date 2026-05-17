'use client';

/**
 * /reposition-radar — for each existing Gymreapers SKU, the recommended
 * rename / remerchandise / rephotograph / rebundle / reprice / journey
 * action to better align with the voice cluster actually buying it.
 *
 * "Free revenue" — the SKU and inventory exist; the customer already wants it;
 * we just have it shelved or named in a way that hides it from the cluster
 * that buys it.
 */

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface RepositionEvidence {
  quotes?: string[];
  affinity_review_count?: number;
  affinity_avg_rating?: number;
  sample_review_ids?: (number | string)[];
}

interface Recommendation {
  id: number;
  sku_id: string | null;
  sku_title: string | null;
  sku_url: string | null;
  current_category: string | null;
  current_subcategory: string | null;
  current_product_type: string | null;
  current_tags: string[];
  current_min_price: number | null;
  current_max_price: number | null;
  recommended_category: string | null;
  recommended_subcategory: string | null;
  recommended_title: string | null;
  reposition_type: string;
  target_cluster_id: number | null;
  target_cluster_label: string | null;
  target_cluster_brand_slug: string | null;
  journey_stage: string | null;
  rationale: string | null;
  evidence: RepositionEvidence;
  review_count_signal: number | null;
  avg_rating_signal: number | null;
  impact_score: number;
  confidence: string | null;
  computed_at: string | null;
}

interface Payload {
  available: boolean;
  reason?: string;
  iteration?: number;
  recommendations: Recommendation[];
  kpis?: {
    total: number;
    by_type: Record<string, number>;
    by_journey: Record<string, number>;
    top_score: number;
    high_confidence_count: number;
  };
  computed_at?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  rename: 'Rename',
  remerchandise: 'Re-merchandise',
  rephotograph: 'Re-photograph',
  rebundle: 'Re-bundle',
  reprice: 'Re-price',
  reposition_journey: 'Move journey stage',
  no_change: 'No change',
};

const TYPE_BLURB: Record<string, string> = {
  rename: 'Current title hides what customers actually use this for. Rename to expose the use case.',
  remerchandise: 'Shelved in the wrong category. Move it to where the buying cluster shops.',
  rephotograph: 'Title is fine. The lifestyle context the cluster cares about is missing from imagery.',
  rebundle: 'This SKU converts harder when bundled with the things this cluster already buys.',
  reprice: 'Price band is misaligned for the cluster (too high vs voice signals, or too low vs perceived value).',
  reposition_journey: 'Currently targets the wrong journey stage. The cluster uses it in a different moment.',
  no_change: 'SKU is already optimally positioned.',
};

function typePillClass(t: string): string {
  switch ((t || '').toLowerCase()) {
    case 'rename': return 'bg-blue-500/15 text-blue-300';
    case 'remerchandise': return 'bg-purple-500/15 text-purple-300';
    case 'rephotograph': return 'bg-amber-500/15 text-amber-300';
    case 'rebundle': return 'bg-emerald-500/15 text-emerald-300';
    case 'reprice': return 'bg-rose-500/15 text-rose-300';
    case 'reposition_journey': return 'bg-cyan-500/15 text-cyan-300';
    default: return 'bg-gr-border/40 text-gr-muted';
  }
}

function confidencePillClass(c: string | null): string {
  switch ((c || '').toLowerCase()) {
    case 'high': return 'text-emerald-300';
    case 'medium': return 'text-amber-300';
    case 'low': return 'text-gr-subtle';
    default: return 'text-gr-subtle';
  }
}

export default function RepositionRadarPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/sku-reposition`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => setData(d as Payload))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data?.recommendations) return [];
    if (typeFilter === 'all') return data.recommendations;
    return data.recommendations.filter((r) => r.reposition_type === typeFilter);
  }, [data, typeFilter]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading reposition radar...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data || !data.available) {
    return (
      <div className="text-center py-20 text-gr-subtle">
        {data?.reason || 'Reposition radar unavailable.'}
      </div>
    );
  }

  const kpis = data.kpis;
  const types = Object.keys(kpis?.by_type || {});

  return (
    <div className="space-y-8">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product &middot; Reposition Radar
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gr-text mb-2">
          Free revenue inside the catalog
        </h1>
        <p className="text-gr-muted leading-relaxed max-w-3xl">
          Every recommendation here is a SKU that already exists, has inventory, and has customers buying it.
          The only thing wrong is how it&apos;s shelved, named, photographed, bundled, or priced for the
          voice cluster doing the buying. One re-merchandise pass can move volume without launching anything new.
        </p>
        {data.iteration && (
          <p className="mt-3 text-xs text-gr-subtle">
            Iteration <span className="font-semibold text-gr-text tabular-nums">{data.iteration}</span>
            {data.computed_at && (
              <span> &middot; {new Date(data.computed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            )}
          </p>
        )}
      </header>

      {/* KPI strip */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-gr-border bg-gr-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">SKUs analyzed</p>
            <p className="text-2xl font-bold text-gr-text tabular-nums mt-1">{kpis.total}</p>
          </div>
          <div className="rounded-lg border border-gr-border bg-gr-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">High confidence</p>
            <p className="text-2xl font-bold text-emerald-300 tabular-nums mt-1">{kpis.high_confidence_count}</p>
          </div>
          <div className="rounded-lg border border-gr-border bg-gr-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">Top impact score</p>
            <p className="text-2xl font-bold text-gr-text tabular-nums mt-1">{Math.round(kpis.top_score)}</p>
          </div>
          <div className="rounded-lg border border-gr-border bg-gr-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">Action types</p>
            <p className="text-2xl font-bold text-gr-text tabular-nums mt-1">{types.length}</p>
          </div>
        </div>
      )}

      <SectionExplainer
        what="Each row is one Gymreapers SKU with affinity signal (reviews tied to a voice cluster). The recommendation is a single high-impact action: rename, re-merchandise, re-photograph, re-bundle, re-price, or move journey stage."
        howToRead="Sort defaults to impact_score desc. High-confidence rows have >=10 reviews tied to a single cluster. Click a row to see the customer voice quotes and supporting affinity data."
        whatToDo="Pick the top 3-5 high-confidence rows for the next merchandising sprint. Rename + re-merchandise actions ship in days; re-photograph needs creative work; re-bundle can roll into a promo."
      />

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter('all')}
          className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded transition ${
            typeFilter === 'all'
              ? 'bg-gr-accent text-gr-bg'
              : 'bg-gr-border/40 text-gr-muted hover:text-gr-text'
          }`}
        >
          All ({kpis?.total || 0})
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded transition ${
              typeFilter === t
                ? 'bg-gr-accent text-gr-bg'
                : `${typePillClass(t)} hover:brightness-125`
            }`}
          >
            {TYPE_LABELS[t] || t} ({kpis?.by_type[t] || 0})
          </button>
        ))}
      </div>

      {/* Recommendations list */}
      <div className="space-y-3">
        {filtered.map((r) => {
          const isOpen = expanded === r.id;
          const priceLabel = r.current_min_price != null && r.current_max_price != null
            ? r.current_min_price === r.current_max_price
              ? `$${r.current_min_price.toFixed(2)}`
              : `$${r.current_min_price.toFixed(2)}-$${r.current_max_price.toFixed(2)}`
            : null;
          return (
            <article
              key={r.id}
              className="rounded-lg border border-gr-border bg-gr-card overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="w-full text-left p-5 hover:bg-gr-bg/30 transition"
              >
                <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${typePillClass(r.reposition_type)}`}
                    >
                      {TYPE_LABELS[r.reposition_type] || r.reposition_type}
                    </span>
                    {r.confidence && (
                      <span className={`text-[10px] uppercase tracking-wider font-bold ${confidencePillClass(r.confidence)}`}>
                        {r.confidence} conf.
                      </span>
                    )}
                    {r.journey_stage && (
                      <span className="text-[10px] uppercase tracking-wider text-gr-subtle">
                        {r.journey_stage}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gr-text tabular-nums leading-none">{Math.round(r.impact_score)}</p>
                    <p className="text-[9px] uppercase tracking-wider text-gr-subtle">impact</p>
                  </div>
                </div>
                <h3 className="text-base font-bold text-gr-text leading-snug mb-1.5">{r.sku_title}</h3>
                <p className="text-sm text-gr-text leading-relaxed">{r.rationale}</p>
                {r.recommended_title && (
                  <p className="mt-2 text-[12px] text-emerald-300">
                    <span className="font-bold uppercase tracking-wider text-[10px] mr-1">Recommended title</span>
                    {r.recommended_title}
                  </p>
                )}
                {(r.recommended_category || r.recommended_subcategory) && (
                  <p className="mt-1 text-[12px] text-purple-300">
                    <span className="font-bold uppercase tracking-wider text-[10px] mr-1">Recommended shelf</span>
                    {r.recommended_category || '-'}
                    {r.recommended_subcategory && ` / ${r.recommended_subcategory}`}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gr-subtle">
                  <span>
                    Currently: <span className="text-gr-muted">{r.current_category || '-'}{r.current_subcategory ? ` / ${r.current_subcategory}` : ''}</span>
                  </span>
                  {priceLabel && <span>{priceLabel}</span>}
                  {r.target_cluster_label && (
                    <span>
                      Target voice: <span className="text-gr-text font-semibold">{r.target_cluster_label}</span>
                    </span>
                  )}
                  {r.review_count_signal != null && (
                    <span>
                      Reviews: <span className="tabular-nums">{r.review_count_signal}</span>
                      {r.avg_rating_signal != null && (
                        <span> @ {r.avg_rating_signal.toFixed(2)}/5</span>
                      )}
                    </span>
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gr-border/60 bg-gr-bg/30 p-5 space-y-4">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle">
                    Why this action: {TYPE_BLURB[r.reposition_type] || ''}
                  </p>
                  {r.evidence?.quotes && r.evidence.quotes.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-gr-accent mb-2">
                        Customer voice quotes
                      </p>
                      <ul className="space-y-2">
                        {r.evidence.quotes.map((q, i) => (
                          <li key={i} className="text-[13px] text-gr-text italic border-l-2 border-gr-accent/40 pl-3">
                            &ldquo;{q}&rdquo;
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.current_tags && r.current_tags.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Current tags</p>
                      <div className="flex flex-wrap gap-1">
                        {r.current_tags.slice(0, 12).map((t) => (
                          <span key={t} className="text-[10px] text-gr-muted bg-gr-border/30 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.sku_url && (
                    <a
                      href={r.sku_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-[11px] font-semibold uppercase tracking-wider text-gr-accent hover:text-gr-accent-hover"
                    >
                      Open product page {'->'}
                    </a>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-gr-subtle text-center py-12">No SKUs match the current filter.</p>
        )}
      </div>
    </div>
  );
}
