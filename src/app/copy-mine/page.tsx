'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface BrandPhrase {
  phrase: string;
  category: string;
  mention_count: number;
  sample_review_ids: number[];
}

interface CrossBrandEntry {
  phrase: string;
  counts: Record<string, number>;
  owned_by: string | null;
  total: number;
}

interface GrOpportunity {
  phrase: string;
  peer_count: number;
  gymreapers_count: number;
  top_peer: string | null;
  peer_breakdown: Record<string, number>;
}

interface Payload {
  available: boolean;
  by_brand: Record<string, BrandPhrase[]>;
  cross_brand_matrix: CrossBrandEntry[];
  gymreapers_opportunities: GrOpportunity[];
  brand_names: Record<string, string>;
  total_phrases: number;
}

const BRAND_ORDER = ['gymreapers', 'vuori', 'alo', 'gymshark', 'harbinger', 'sbd'];

const CATEGORY_STYLES: Record<string, string> = {
  experiential: 'bg-gr-accent-soft text-gr-accent',
  claim: 'bg-gr-success/15 text-gr-success',
  identity: 'bg-gr-warning/15 text-gr-warning',
  emotional: 'bg-gr-danger/10 text-gr-danger',
  comparison: 'bg-gr-raised text-gr-muted',
};

function cellShade(count: number, max: number, isOwner: boolean): string {
  if (count === 0) return 'bg-gr-bg/40 text-gr-subtle';
  if (isOwner) {
    if (count >= max * 0.66) return 'bg-gr-success/70 text-white font-bold';
    return 'bg-gr-success/40 text-gr-text font-bold';
  }
  if (max === 0) return 'bg-gr-bg/40 text-gr-subtle';
  const ratio = count / max;
  if (ratio >= 0.66) return 'bg-gr-accent/40 text-gr-text';
  if (ratio >= 0.33) return 'bg-gr-accent/20 text-gr-text';
  return 'bg-gr-accent/10 text-gr-muted';
}

export default function CopyMinePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/copy-mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const brandsWithData = useMemo(() => {
    if (!data) return [] as string[];
    const present = new Set(Object.keys(data.by_brand || {}));
    const ordered = BRAND_ORDER.filter((b) => present.has(b));
    for (const b of present) {
      if (!ordered.includes(b)) ordered.push(b);
    }
    return ordered;
  }, [data]);

  // Brand columns for the cross-brand matrix - use the same ordered list,
  // plus include every brand seen in any cross-brand entry.
  const matrixBrands = useMemo(() => {
    if (!data) return [] as string[];
    const seen = new Set<string>();
    for (const e of data.cross_brand_matrix || []) {
      for (const b of Object.keys(e.counts)) seen.add(b);
    }
    const ordered = BRAND_ORDER.filter((b) => seen.has(b));
    for (const b of seen) {
      if (!ordered.includes(b)) ordered.push(b);
    }
    return ordered;
  }, [data]);

  const kpi = useMemo(() => {
    if (!data) {
      return { uniquePhrases: 0, topPhrase: null as CrossBrandEntry | null, topOpp: null as GrOpportunity | null };
    }
    const uniquePhrases = new Set<string>();
    for (const list of Object.values(data.by_brand || {})) {
      for (const p of list) uniquePhrases.add(p.phrase);
    }
    const topPhrase = (data.cross_brand_matrix || [])[0] || null;
    const topOpp = (data.gymreapers_opportunities || [])[0] || null;
    return { uniquePhrases: uniquePhrases.size, topPhrase, topOpp };
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading copy mine...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data?.available) return <div className="text-center py-20 text-gr-subtle">Copy mine feed unavailable.</div>;

  const brandName = (slug: string) => data.brand_names[slug] || slug;

  return (
    <div className="space-y-12">
      <HubTabs hub="voc" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing &middot; Copy Mine
          </p>
          <ConfidenceBadge source="dtc_voc_personas" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Marketing copy your customers wrote for you
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Recurring verbatim phrases customers use about each brand. Reveals which hooks each brand &quot;owns&quot;
          and where Gymreapers has no claim yet. Use as a marketing copy bank, not strict guidance.
        </p>
      </header>

      <SectionExplainer
        what={`${kpi.uniquePhrases} unique customer-voice phrases mined across ${brandsWithData.length} brands. Each phrase was proposed by Claude from a sample of positive reviews, then verified by case-insensitive substring search against the full brand corpus. Counts shown are real corpus counts, not Claude estimates.`}
        howToRead="The cross-brand matrix shows how often each phrase appears in each brand's positive reviews. Green cells flag phrases where one brand has 5x+ the runner-up - that brand effectively owns the hook. Per-brand sections below show each brand's top phrases sized by mention count."
        whatToDo="If a peer owns a phrase Gymreapers has 0 mentions of, that is a vacancy. The Gymreapers Opportunities section ranks these. Borrow the language for ad copy, PDP bullets, and creative briefs - the customer wrote the line for you."
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gr-surface border border-gr-border rounded-md p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Phrases mined</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpi.uniquePhrases}</div>
          <div className="text-xs text-gr-muted mt-1">distinct verbatim phrases across {brandsWithData.length} brands</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Top phrase</div>
          {kpi.topPhrase ? (
            <>
              <div className="text-xl font-bold text-gr-text">&ldquo;{kpi.topPhrase.phrase}&rdquo;</div>
              <div className="text-xs text-gr-muted mt-1">
                {kpi.topPhrase.total} mentions across the set
                {kpi.topPhrase.owned_by ? ` - owned by ${brandName(kpi.topPhrase.owned_by)}` : ''}
              </div>
            </>
          ) : (
            <div className="text-gr-subtle">No data</div>
          )}
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
            Biggest Gymreapers opportunity
          </div>
          {kpi.topOpp ? (
            <>
              <div className="text-xl font-bold text-gr-accent">&ldquo;{kpi.topOpp.phrase}&rdquo;</div>
              <div className="text-xs text-gr-muted mt-1">
                {kpi.topOpp.peer_count} peer mentions, 0 in Gymreapers
                {kpi.topOpp.top_peer ? ` - led by ${brandName(kpi.topOpp.top_peer)}` : ''}
              </div>
            </>
          ) : (
            <div className="text-gr-subtle">No phrases peers own that Gymreapers does not</div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">Cross-brand phrase matrix</h2>
          <span className="text-xs text-gr-subtle">
            {data.cross_brand_matrix.length} phrases &middot; sorted by total mentions
          </span>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gr-bg/40 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-bold text-gr-subtle uppercase text-[10px] tracking-wider min-w-[240px]">
                  Phrase
                </th>
                {matrixBrands.map((b) => (
                  <th
                    key={b}
                    className="px-2 py-2 font-bold text-gr-subtle uppercase text-[10px] tracking-wider text-center min-w-[80px]"
                  >
                    {brandName(b)}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-bold text-gr-subtle uppercase text-[10px] tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.cross_brand_matrix.slice(0, 60).map((entry) => {
                const counts = entry.counts;
                const max = Math.max(...Object.values(counts), 1);
                return (
                  <tr key={entry.phrase} className="border-t border-gr-border/60 hover:bg-gr-bg/30">
                    <td className="px-3 py-2 align-middle">
                      <span className="font-semibold text-gr-text">&ldquo;{entry.phrase}&rdquo;</span>
                      {entry.owned_by && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gr-success/15 text-gr-success uppercase tracking-wider">
                          {brandName(entry.owned_by)} owns
                        </span>
                      )}
                    </td>
                    {matrixBrands.map((b) => {
                      const c = counts[b] || 0;
                      const isOwner = entry.owned_by === b;
                      return (
                        <td
                          key={b}
                          className={`px-2 py-2 text-center tabular-nums font-mono ${cellShade(c, max, isOwner)}`}
                          title={`${brandName(b)}: ${c} mentions`}
                        >
                          {c === 0 ? '.' : c}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-right tabular-nums font-bold text-gr-text">
                      {entry.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.cross_brand_matrix.length > 60 && (
          <p className="text-xs text-gr-subtle mt-2 italic">
            Showing top 60 of {data.cross_brand_matrix.length} phrases by total mentions.
          </p>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">Per-brand top hooks</h2>
          <span className="text-xs text-gr-subtle">Chips sized by mention count</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandsWithData.map((slug) => {
            const list = (data.by_brand[slug] || []).slice(0, 12);
            const maxCount = Math.max(...list.map((p) => p.mention_count), 1);
            return (
              <div key={slug} className="bg-gr-surface border border-gr-border rounded-md p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-base font-bold text-gr-text uppercase tracking-wider">
                    {brandName(slug)}
                  </h3>
                  <span className="text-[10px] text-gr-subtle uppercase tracking-wider">
                    {data.by_brand[slug]?.length || 0} phrases
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {list.map((p) => {
                    const sizeClass =
                      p.mention_count >= maxCount * 0.66
                        ? 'text-base px-3 py-1.5'
                        : p.mention_count >= maxCount * 0.33
                        ? 'text-sm px-2.5 py-1'
                        : 'text-xs px-2 py-0.5';
                    const catClass = CATEGORY_STYLES[p.category] || 'bg-gr-raised text-gr-muted';
                    return (
                      <span
                        key={p.phrase}
                        className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClass} ${catClass}`}
                        title={`${p.category} - ${p.mention_count} mentions`}
                      >
                        {p.phrase}
                        <span className="text-[10px] opacity-70 tabular-nums">{p.mention_count}</span>
                      </span>
                    );
                  })}
                  {list.length === 0 && (
                    <span className="text-xs text-gr-subtle italic">No phrases mined yet.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">
            Gymreapers opportunity callouts
          </h2>
          <span className="text-xs text-gr-subtle">
            {data.gymreapers_opportunities.length} phrases peers own that Gymreapers has not claimed
          </span>
        </div>
        {data.gymreapers_opportunities.length === 0 ? (
          <div className="bg-gr-surface border border-gr-border rounded-md p-6 text-center text-gr-subtle">
            No mined peer phrases are absent from the Gymreapers corpus. Either Gymreapers already echoes
            the customer-voice hooks, or the corpus needs more reviews to surface gaps.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.gymreapers_opportunities.slice(0, 20).map((opp) => (
              <div
                key={opp.phrase}
                className="bg-gr-surface border border-gr-accent/30 rounded-md p-4 hover:border-gr-accent transition"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gr-accent">
                    Position to claim
                  </span>
                  <span className="text-xs tabular-nums text-gr-muted">
                    {opp.peer_count} peer mentions &middot; 0 in Gymreapers
                  </span>
                </div>
                <div className="text-lg font-bold text-gr-text mb-2">&ldquo;{opp.phrase}&rdquo;</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(opp.peer_breakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([b, c]) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1 rounded bg-gr-raised px-2 py-0.5 text-[11px] font-semibold text-gr-muted"
                      >
                        <span className="uppercase tracking-wider">{brandName(b)}</span>
                        <span className="tabular-nums text-gr-text">{c}</span>
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
