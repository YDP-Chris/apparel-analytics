'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Cluster {
  id: number;
  brand_slug: string;
  cluster_label: string;
  cluster_description: string | null;
  distinctive_phrases: string[] | null;
  sample_size: number;
}

interface Overlap {
  cluster_a_id: number;
  cluster_b_id: number;
  brand_a: string;
  brand_b: string;
  similarity_score: number;
  similarity_kind: 'strong' | 'moderate' | 'weak';
  shared_phrases: string[] | null;
  reasoning: string | null;
}

interface Payload {
  available: boolean;
  min_score: number;
  clusters: Cluster[];
  overlaps: Overlap[];
  brand_names: Record<string, string>;
}

const BRAND_ORDER = ['gymreapers', 'harbinger', 'sbd', 'vuori', 'gymshark', 'alo'];

function scoreColor(s: number): string {
  if (s >= 0.7) return 'bg-gr-success/70 text-white';
  if (s >= 0.5) return 'bg-gr-success/45 text-gr-text';
  if (s >= 0.4) return 'bg-gr-accent/35 text-gr-text';
  if (s >= 0.3) return 'bg-gr-accent/15 text-gr-text';
  return 'bg-gr-bg text-gr-subtle';
}

function shortLabel(s: string): string {
  return s.length <= 28 ? s : s.slice(0, 26).trim() + '...';
}

export default function ClusterMatrixPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0.3);
  const [selectedPair, setSelectedPair] = useState<{ a: Cluster; b: Cluster; ov: Overlap } | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    setLoading(true);
    fetch(`${PULSE_API}/pulse/cluster-matrix?min_score=${minScore}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [minScore]);

  const byBrand = useMemo(() => {
    const m: Record<string, Cluster[]> = {};
    for (const c of data?.clusters || []) {
      (m[c.brand_slug] ??= []).push(c);
    }
    for (const slug in m) m[slug].sort((a, b) => b.sample_size - a.sample_size);
    return m;
  }, [data]);

  const overlapKey = (aId: number, bId: number) => `${Math.min(aId, bId)}|${Math.max(aId, bId)}`;
  const overlapMap = useMemo(() => {
    const m = new Map<string, Overlap>();
    for (const ov of data?.overlaps || []) {
      m.set(overlapKey(ov.cluster_a_id, ov.cluster_b_id), ov);
    }
    return m;
  }, [data]);

  const clustersOrdered = useMemo(() => {
    const out: Cluster[] = [];
    for (const slug of BRAND_ORDER) for (const c of byBrand[slug] || []) out.push(c);
    return out;
  }, [byBrand]);

  const topPairs = useMemo(() => {
    return [...(data?.overlaps || [])]
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 15);
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading cluster matrix...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data?.available) return <div className="text-center py-20 text-gr-subtle">Cluster matrix feed unavailable.</div>;

  return (
    <div className="space-y-12">
      <HubTabs hub="voc" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing + Product &middot; Cluster Matrix
          </p>
          <ConfidenceBadge source="voice_clusters" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Where customer voices overlap across brands
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Pairwise similarity between every emergent customer voice cluster across brands. Cells in green mean
          Brand A&apos;s cluster and Brand B&apos;s cluster describe nearly the same customer. Click any cell for
          the shared phrases and the reasoning behind the match. Strong overlap means a single marketing message
          could resonate with both.
        </p>
      </header>

      <SectionExplainer
        what={`${data.clusters.length} clusters across ${Object.keys(byBrand).length} brands. ${data.overlaps.length} pairs scored above ${data.min_score}.`}
        howToRead='Color intensity is the similarity score. Diagonal cells (same brand) are blank. Use the score-floor slider to surface only the strongest matches.'
        whatToDo="Strong overlap pairs are exactly where you can borrow positioning - the same hook resonates with both brand customer bases. Weaker overlaps reveal where customer types are distinct enough that you need bespoke messaging."
      />

      <section className="flex items-center gap-4 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-gr-subtle font-bold">Score floor</span>
        <div className="inline-flex gap-1 rounded-md border border-gr-border bg-gr-surface p-0.5">
          {[0.3, 0.4, 0.5, 0.7].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setMinScore(s);
                trackEvent('change', { label: 'cluster_matrix_min_score', metadata: { min_score: s } });
              }}
              className={`px-3 py-1 text-xs font-bold rounded ${
                minScore === s ? 'bg-gr-accent text-white' : 'text-gr-muted hover:text-gr-text'
              }`}
            >
              {s.toFixed(1)}+
            </button>
          ))}
        </div>
        <span className="text-xs text-gr-subtle italic">
          {data.overlaps.length} pair{data.overlaps.length === 1 ? '' : 's'} at this threshold
        </span>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gr-text tracking-tight mb-4">
          Top 15 strongest cross-brand overlaps
        </h2>
        <div className="space-y-2">
          {topPairs.map((ov, i) => {
            const a = data.clusters.find((c) => c.id === ov.cluster_a_id);
            const b = data.clusters.find((c) => c.id === ov.cluster_b_id);
            if (!a || !b) return null;
            return (
              <button
                key={`${ov.cluster_a_id}-${ov.cluster_b_id}`}
                type="button"
                onClick={() => {
                  setSelectedPair({ a, b, ov });
                  trackEvent('click', { label: 'cluster_pair_row', metadata: { a_id: a.id, b_id: b.id } });
                }}
                className="w-full text-left bg-gr-surface border border-gr-border rounded-md p-4 hover:border-gr-accent transition"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-gr-accent font-mono font-bold text-sm tabular-nums w-8">#{i + 1}</span>
                      <span className="font-bold text-gr-text truncate">{a.cluster_label}</span>
                      <span className="text-gr-subtle text-xs uppercase">{data.brand_names[a.brand_slug] || a.brand_slug}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-gr-subtle font-mono text-sm w-8">vs</span>
                      <span className="font-bold text-gr-text truncate">{b.cluster_label}</span>
                      <span className="text-gr-subtle text-xs uppercase">{data.brand_names[b.brand_slug] || b.brand_slug}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded text-sm font-bold tabular-nums shrink-0 ${scoreColor(ov.similarity_score)}`}>
                    {ov.similarity_score.toFixed(2)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gr-text tracking-tight mb-4">Full overlap matrix</h2>
        <div className="bg-gr-surface border border-gr-border rounded-md overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gr-surface border-b border-r border-gr-border p-2"></th>
                {clustersOrdered.map((c) => (
                  <th
                    key={c.id}
                    className="border-b border-gr-border p-1 align-bottom"
                    style={{ height: '160px' }}
                  >
                    <div className="rotate-[-60deg] origin-bottom-left whitespace-nowrap text-[10px] text-gr-muted font-semibold pl-3" title={c.cluster_label}>
                      <span className="text-[9px] text-gr-subtle uppercase">{c.brand_slug.slice(0, 3)}</span>{' '}
                      {shortLabel(c.cluster_label)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clustersOrdered.map((rowC) => (
                <tr key={rowC.id}>
                  <th className="sticky left-0 z-10 bg-gr-surface border-r border-gr-border p-2 text-right align-middle text-[11px] font-semibold text-gr-muted whitespace-nowrap" title={rowC.cluster_label}>
                    <span className="text-[9px] text-gr-subtle uppercase">{rowC.brand_slug.slice(0, 3)}</span>{' '}
                    {shortLabel(rowC.cluster_label)}
                  </th>
                  {clustersOrdered.map((colC) => {
                    if (rowC.id === colC.id) {
                      return <td key={colC.id} className="border border-gr-border/40 bg-gr-bg p-1 w-8 h-8"></td>;
                    }
                    if (rowC.brand_slug === colC.brand_slug) {
                      return <td key={colC.id} className="border border-gr-border/40 bg-gr-bg/50 p-1 w-8 h-8"></td>;
                    }
                    const ov = overlapMap.get(overlapKey(rowC.id, colC.id));
                    if (!ov) return <td key={colC.id} className="border border-gr-border/40 bg-gr-bg p-1 w-8 h-8 text-gr-subtle text-[9px] text-center">.</td>;
                    return (
                      <td key={colC.id} className={`border border-gr-border/40 p-0 w-8 h-8 ${scoreColor(ov.similarity_score)}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedPair({ a: rowC, b: colC, ov })}
                          className="w-full h-full text-[10px] font-bold tabular-nums"
                          title={`${rowC.cluster_label} vs ${colC.cluster_label} - ${ov.similarity_score.toFixed(2)}`}
                        >
                          {Math.round(ov.similarity_score * 100)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPair && (
        <section className="bg-gr-surface border border-gr-accent rounded-md p-6">
          <header className="flex items-baseline justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-gr-text">Pair detail</h3>
            <button
              type="button"
              onClick={() => setSelectedPair(null)}
              className="text-xs text-gr-muted hover:text-gr-text underline"
            >
              close
            </button>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[selectedPair.a, selectedPair.b].map((c, i) => (
              <div key={c.id} className="bg-gr-bg rounded p-4 border border-gr-border/60">
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
                  {data.brand_names[c.brand_slug] || c.brand_slug} &middot; n={c.sample_size}
                </div>
                <h4 className="font-bold text-gr-text mt-1">{c.cluster_label}</h4>
                {c.cluster_description && (
                  <p className="text-sm text-gr-muted mt-2 leading-relaxed">{c.cluster_description}</p>
                )}
                {Array.isArray(c.distinctive_phrases) && c.distinctive_phrases.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {c.distinctive_phrases.map((p, j) => (
                      <span key={j} className="px-1.5 py-0.5 rounded text-[10px] bg-gr-surface text-gr-text border border-gr-border/60">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Similarity</div>
              <div className={`inline-block px-3 py-1 rounded font-bold tabular-nums ${scoreColor(selectedPair.ov.similarity_score)}`}>
                {selectedPair.ov.similarity_score.toFixed(2)} ({selectedPair.ov.similarity_kind})
              </div>
            </div>
            {selectedPair.ov.reasoning && (
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Reasoning</div>
                <p className="text-sm text-gr-text leading-relaxed">{selectedPair.ov.reasoning}</p>
              </div>
            )}
          </div>
          {Array.isArray(selectedPair.ov.shared_phrases) && selectedPair.ov.shared_phrases.length > 0 && (
            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Shared phrases</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPair.ov.shared_phrases.map((p, j) => (
                  <span key={j} className="px-2 py-1 rounded text-xs bg-gr-accent-soft text-gr-accent">{p}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="text-xs text-gr-subtle">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.cluster_overlap</code>
        {' '}joined to <code className="bg-gr-bg px-1.5 py-0.5 rounded">voice_clusters</code>.
        Pairwise scores written by Claude Sonnet 4.6 from label + description + distinctive_phrases.
      </div>
    </div>
  );
}
