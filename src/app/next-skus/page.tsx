'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Evidence {
  customer_voice?: string;
  competitor_pain?: string;
  deficit?: string;
  leak_signal?: string;
  [key: string]: string | undefined;
}

interface Recommendation {
  id: number;
  rank: number;
  product_name: string;
  category: string | null;
  subcategory: string | null;
  journey_stage: string | null;
  target_cluster_label: string | null;
  target_cluster_brand_slug: string | null;
  price_band_low: number | null;
  price_band_high: number | null;
  attack_angle: string | null;
  pitch: string | null;
  evidence: Evidence;
  score: number | null;
  computed_at: string | null;
  iteration: number | null;
}

interface HistoryEntry {
  iteration: number;
  computed_at: string | null;
  product_names: { rank: number; product_name: string }[];
}

interface Payload {
  available: boolean;
  reason?: string;
  iteration?: number;
  recommendations: Recommendation[];
  history: HistoryEntry[];
  computed_at?: string | null;
}

function prettyToken(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ');
}

function journeyChipClass(stage: string | null | undefined): string {
  switch ((stage || '').toLowerCase()) {
    case 'training':
      return 'bg-gr-accent/15 text-gr-accent';
    case 'between_sets':
      return 'bg-blue-500/15 text-blue-300';
    case 'recovery':
      return 'bg-emerald-500/15 text-emerald-300';
    case 'identity':
      return 'bg-purple-500/15 text-purple-300';
    case 'meet_day':
      return 'bg-amber-500/15 text-amber-300';
    default:
      return 'bg-gr-raised text-gr-muted';
  }
}

export default function NextSkusPage() {
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
    fetch(`${PULSE_API}/pulse/next-skus`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const recs = data?.recommendations || [];
    if (recs.length === 0) {
      return { topScore: null as number | null, peerCount: 0, clusterCount: 0, deficitsCovered: 0 };
    }
    const topScore = recs.reduce((acc, r) => (r.score !== null && r.score > acc ? r.score : acc), 0);
    const peerCount = new Set(recs.map((r) => (r.target_cluster_brand_slug || '').toLowerCase()).filter(Boolean)).size;
    const clusterCount = new Set(recs.map((r) => (r.target_cluster_label || '').trim()).filter(Boolean)).size;
    const deficitsCovered = new Set(recs.map((r) => (r.subcategory || '').toLowerCase()).filter(Boolean)).size;
    return { topScore, peerCount, clusterCount, deficitsCovered };
  }, [data]);

  if (loading) {
    return <div className="text-center py-20 text-gr-subtle">Synthesizing next-launch SKU recommendations...</div>;
  }
  if (error) {
    return <div className="text-center py-20 text-gr-danger">{error}</div>;
  }
  if (!data?.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Product &middot; Strategy
            </p>
            <ConfidenceBadge source="composite" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            First 5 apparel SKUs to launch
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            No synthesis yet
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            {data?.reason || 'The next-skus-synth agent has not produced any next_sku_recommendations rows yet.'}
            <br />
            Run it manually with{' '}
            <code className="bg-gr-bg px-1.5 py-0.5 rounded">
              cd /mnt/data/agents/next-skus-synth &amp;&amp; python3 main.py
            </code>
          </p>
        </section>
      </div>
    );
  }

  const recs = data.recommendations || [];
  const history = data.history || [];
  const computedDate = (data.computed_at || recs[0]?.computed_at || '').slice(0, 10) || 'today';

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product &middot; Strategy
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          First 5 apparel SKUs to launch
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Synthesized from the entire competitive intel stack: customer voice clusters plus cross-brand
          overlap plus competitor SKU weakness plus apparel category deficit plus Gymreapers TM
          filings. Each recommendation is a concrete product spec with the evidence stack that
          justifies it. This is the artifact for the next CEO and product strategy conversation.
        </p>
        <p className="text-gr-subtle mt-2 text-sm">
          Internal &middot; next-skus-synth &middot; iteration {data.iteration} &middot; {recs.length} recommendations &middot; refreshed {computedDate}
        </p>
      </header>

      <SectionExplainer
        what="Five ranked Gymreapers apparel SKU recommendations. Each one names the specific product, its journey stage in the lifter wardrobe, the customer cluster it targets, the price band, the attack angle, and a four-pane evidence stack proving the call."
        howToRead="Cards are ordered by composite score. Customer voice tells you which cluster validates demand. Competitor pain names the peer SKU under attack and its complaint counts. Deficit shows GR's current SKU count in the subcategory versus peer max. Leak signal points to the Gymreapers TM filing that aligns with the recommendation."
        whatToDo="Open this in the CEO and product strategy meeting. Rank one is the highest-evidence pick to brief first. Each card is a starting point for a product brief, not a finished spec. Push back on anything that does not match the apparel thesis use-case taxonomy."
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Top score</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">
            {kpis.topScore !== null ? Math.round(kpis.topScore) : '-'}
          </div>
          <div className="text-xs text-gr-subtle mt-1">out of 100</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Peer SKU lanes attacked</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.peerCount}</div>
          <div className="text-xs text-gr-subtle mt-1">distinct peer brands</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Clusters targeted</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.clusterCount}</div>
          <div className="text-xs text-gr-subtle mt-1">customer voice segments</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Deficits covered</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.deficitsCovered}</div>
          <div className="text-xs text-gr-subtle mt-1">apparel subcategories</div>
        </div>
      </section>

      <section className="space-y-6">
        {recs.map((r) => {
          const band = r.price_band_low !== null && r.price_band_high !== null
            ? `$${Math.round(r.price_band_low)} - $${Math.round(r.price_band_high)}`
            : null;
          return (
            <article
              key={r.id}
              className="rounded-md border border-gr-accent/40 bg-gr-accent-soft ring-1 ring-gr-accent/30 p-6 md:p-8 shadow-lg"
            >
              <div className="flex items-start gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gr-accent text-gr-bg text-lg font-bold tabular-nums shrink-0">
                    {r.rank}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gr-text">
                      {r.product_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {r.journey_stage ? (
                        <span className={`inline-flex items-baseline px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider capitalize ${journeyChipClass(r.journey_stage)}`}>
                          {prettyToken(r.journey_stage)}
                        </span>
                      ) : null}
                      {r.category ? (
                        <span className="inline-flex items-baseline px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider bg-gr-raised text-gr-muted capitalize">
                          {prettyToken(r.category)}
                        </span>
                      ) : null}
                      {r.subcategory ? (
                        <span className="inline-flex items-baseline px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider bg-gr-raised text-gr-muted capitalize">
                          {prettyToken(r.subcategory)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="ml-auto flex items-baseline gap-6 shrink-0">
                  {band ? (
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Price band</div>
                      <div className="text-xl font-bold text-gr-text tabular-nums leading-none">{band}</div>
                    </div>
                  ) : null}
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Score</div>
                    <div className="text-3xl font-bold text-gr-accent tabular-nums leading-none">
                      {r.score !== null ? Math.round(r.score) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {r.attack_angle ? (
                <p className="italic text-gr-accent text-base md:text-lg leading-relaxed mb-4 border-l-2 border-gr-accent/60 pl-4">
                  {r.attack_angle}
                </p>
              ) : null}

              {r.pitch ? (
                <p className="text-gr-text leading-relaxed mb-5">
                  {r.pitch}
                </p>
              ) : null}

              {r.target_cluster_label ? (
                <p className="text-sm text-gr-subtle mb-5">
                  <span className="font-semibold text-gr-muted">Target cluster:</span>{' '}
                  {r.target_cluster_label}
                  {r.target_cluster_brand_slug ? (
                    <span className="text-gr-subtle"> &middot; {r.target_cluster_brand_slug}</span>
                  ) : null}
                </p>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gr-bg/60 border border-gr-border rounded p-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-accent mb-2">Customer voice</div>
                  <p className="text-sm text-gr-text leading-relaxed">
                    {r.evidence?.customer_voice || <span className="text-gr-subtle">No customer-voice evidence captured.</span>}
                  </p>
                </div>
                <div className="bg-gr-bg/60 border border-gr-border rounded p-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-accent mb-2">Competitor pain</div>
                  <p className="text-sm text-gr-text leading-relaxed">
                    {r.evidence?.competitor_pain || <span className="text-gr-subtle">No peer-SKU complaint evidence captured.</span>}
                  </p>
                </div>
                <div className="bg-gr-bg/60 border border-gr-border rounded p-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-accent mb-2">Deficit</div>
                  <p className="text-sm text-gr-text leading-relaxed">
                    {r.evidence?.deficit || <span className="text-gr-subtle">No subcategory-deficit evidence captured.</span>}
                  </p>
                </div>
                <div className="bg-gr-bg/60 border border-gr-border rounded p-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-accent mb-2">Leak signal</div>
                  <p className="text-sm text-gr-text leading-relaxed">
                    {r.evidence?.leak_signal || <span className="text-gr-subtle">No trademark leak aligned.</span>}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {history.length > 0 ? (
        <section className="bg-gr-surface border border-gr-border rounded-md p-5">
          <h2 className="text-xs uppercase tracking-wider font-bold text-gr-subtle mb-3">Prior iterations</h2>
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.iteration} className="text-sm">
                <div className="text-gr-muted">
                  Iteration {h.iteration}
                  {h.computed_at ? (
                    <span className="text-gr-subtle"> &middot; {h.computed_at.slice(0, 10)}</span>
                  ) : null}
                </div>
                <div className="text-gr-text mt-1">
                  {h.product_names.map((p, i) => (
                    <span key={`${h.iteration}-${p.rank}-${i}`}>
                      {i > 0 ? ' · ' : ''}
                      <span className="text-gr-subtle tabular-nums">#{p.rank}</span> {p.product_name}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="pt-6 border-t border-gr-border text-xs text-gr-subtle">
        Updated {computedDate} &middot; Iteration {data.iteration} &middot; Generated by /mnt/data/agents/next-skus-synth/
      </footer>
    </div>
  );
}
