'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { MetricDelta } from '@/components/MetricDelta';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface SubcategoryRow {
  subcategory: string;
  gymreapers_count: number;
  peer_avg: number;
  peer_max: number;
  peer_max_brand: string | null;
  peer_max_brand_name: string | null;
  delta_vs_avg: number;
  per_brand: Record<string, number>;
}

interface PeerSummary {
  brand_slug: string;
  brand_name: string;
  total_skus: number;
}

interface Stage {
  key: string;
  label: string;
  story: string;
  gymreapers_total: number;
  gymreapers_total_lw?: number | null;
  peer_total?: number;
  peer_total_lw?: number | null;
  peer_top: PeerSummary[];
  top_entry_candidates: SubcategoryRow[];
  subcategories: SubcategoryRow[];
}

interface Payload {
  available: boolean;
  snapshot_date: string | null;
  previous_snapshot_date?: string | null;
  tier: string;
  brand_names: Record<string, string>;
  stages: Stage[];
}

function prettySub(s: string): string {
  return s.replace(/_/g, ' ');
}

function fmtDelta(n: number): string {
  if (n > 0) return `+${n.toFixed(1)}`;
  if (n < 0) return n.toFixed(1);
  return '0.0';
}

const STAGE_EYEBROWS: Record<string, string> = {
  training:     'Stage 1',
  between_sets: 'Stage 2',
  recovery:     'Stage 3',
  identity:     'Stage 4',
  meet_day:     'Stage 5',
};

export default function JourneyPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/journey`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const stages = data?.stages ?? [];
  const brandNames = data?.brand_names ?? {};

  const totals = useMemo(() => {
    const grTotal = stages.reduce((s, x) => s + x.gymreapers_total, 0);
    const entryCount = stages.reduce((s, x) => s + x.top_entry_candidates.length, 0);
    const worstStage = stages.reduce<Stage | null>((acc, x) => {
      if (!acc || x.top_entry_candidates.length > acc.top_entry_candidates.length) return x;
      return acc;
    }, null);
    return { grTotal, entryCount, worstStage };
  }, [stages]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading the journey...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data?.available) {
    return <div className="text-center py-20 text-gr-subtle">Journey feed unavailable.</div>;
  }

  const onExpand = (key: string) => {
    const next = expanded === key ? null : key;
    setExpanded(next);
    if (next) {
      trackEvent('expand', { label: 'journey_stage', metadata: { stage: key } });
    }
  };

  return (
    <div className="space-y-12">
      <HubTabs hub="voc" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product &middot; Customer Journey
          </p>
          <ConfidenceBadge source="brand_mix" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          The Gymreapers customer&apos;s wardrobe journey
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Five stages of how a strength athlete dresses across their day and week. Each stage tells a story, and each
          story maps to a use case. This is the primary frame for the apparel direction: where are peers deep, where is
          Gymreapers thin, and what enters first.
        </p>
        <p className="text-gr-subtle mt-2 text-sm">
          Internal &middot; Gymreapers apparel thesis &middot; peer set: apparel majors
        </p>
      </header>

      <SectionExplainer
        what="Each stage groups apparel subcategories by the customer story (training, layers, recovery, identity, meet day). Numbers reflect today's snapshot of SKU counts in each subcategory across apparel-tier brands (Vuori, Alo, Lulu, Gymshark, Rhone, Athleta + Gymreapers)."
        howToRead="Per stage: Gymreapers SKU total, the top 3 peer brands by depth, and the top 3 entry candidates (subcategories where peers are deep and Gymreapers is thin). Click a stage to expand the full subcategory table."
        whatToDo="Use the entry candidates as a sequenced product plan. Stage 1 (Training) is the closest extension of the accessories core. Stage 4 (Identity) is where Gymreapers' brand equity already converts. Stages 2-3 (Layers, Recovery) are larger but require sustained apparel investment. Stage 5 (Meet day) is niche."
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Gymreapers apparel SKUs</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{totals.grTotal}</div>
          <div className="text-xs text-gr-subtle mt-1 flex items-baseline gap-2">
            <span>across journey stages</span>
            <MetricDelta
              current={totals.grTotal}
              previous={stages.reduce((s, x) => s + (x.gymreapers_total_lw ?? 0), 0) || (data?.previous_snapshot_date ? 0 : null)}
              compact
            />
          </div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Entry candidates</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{totals.entryCount}</div>
          <div className="text-xs text-gr-subtle mt-1">subcategories ranked by deficit</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Stages tracked</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{stages.length}</div>
          <div className="text-xs text-gr-subtle mt-1">use-case buckets</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Biggest deficit stage</div>
          {totals.worstStage ? (
            <>
              <div className="text-xl font-bold text-gr-danger truncate">{totals.worstStage.label}</div>
              <div className="text-xs text-gr-subtle mt-0.5">{totals.worstStage.top_entry_candidates.length} entry candidates</div>
            </>
          ) : <div className="text-gr-subtle">-</div>}
        </div>
      </section>

      {stages.map((stage) => {
        const isExpanded = expanded === stage.key;
        const eyebrow = STAGE_EYEBROWS[stage.key] || '';
        const peerLeader = stage.peer_top[0];
        const deficit = stage.top_entry_candidates.length;
        return (
          <section
            key={stage.key}
            className="bg-gr-surface border border-gr-border rounded-md overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onExpand(stage.key)}
              className="w-full text-left p-6 hover:bg-gr-surface/80 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 mb-2">
                    {eyebrow && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gr-accent">{eyebrow}</span>
                    )}
                    <h2 className="text-2xl font-bold text-gr-text tracking-tight">{stage.label}</h2>
                  </div>
                  <p className="text-gr-muted text-base leading-relaxed max-w-2xl italic">&ldquo;{stage.story}&rdquo;</p>
                </div>
                <span className="text-xs text-gr-subtle shrink-0">{isExpanded ? 'collapse' : 'expand'}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="bg-gr-bg rounded p-3 border border-gr-border/60">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Gymreapers SKUs</div>
                  <div className="text-2xl font-bold text-gr-text tabular-nums">{stage.gymreapers_total}</div>
                  <div className="text-xs text-gr-subtle mt-0.5 flex items-baseline gap-1.5">
                    <span>in this stage</span>
                    <MetricDelta
                      current={stage.gymreapers_total}
                      previous={stage.gymreapers_total_lw}
                      compact
                    />
                  </div>
                </div>

                <div className="bg-gr-bg rounded p-3 border border-gr-border/60">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Top peer in stage</div>
                  {peerLeader ? (
                    <>
                      <div className="text-base font-bold text-gr-text truncate">{peerLeader.brand_name}</div>
                      <div className="text-xs text-gr-muted tabular-nums">{peerLeader.total_skus} SKUs</div>
                    </>
                  ) : <div className="text-gr-subtle text-sm">no peer data</div>}
                </div>

                <div className="bg-gr-bg rounded p-3 border border-gr-border/60">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Entry candidates</div>
                  <div className="text-2xl font-bold text-gr-accent tabular-nums">{deficit}</div>
                  <div className="text-xs text-gr-subtle mt-0.5">underweight subcategories</div>
                </div>
              </div>

              {stage.top_entry_candidates.length > 0 && (
                <div className="mt-4 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Top entry candidates</div>
                  <div className="flex flex-wrap gap-2">
                    {stage.top_entry_candidates.map((c) => (
                      <span
                        key={c.subcategory}
                        className="inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded bg-gr-danger/10 text-gr-text border border-gr-danger/30 text-xs"
                      >
                        <span className="font-semibold capitalize">{prettySub(c.subcategory)}</span>
                        <span className="text-gr-danger tabular-nums">{fmtDelta(c.delta_vs_avg)}</span>
                        <span className="text-gr-subtle">vs {c.peer_max_brand_name} ({c.peer_max})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>

            {isExpanded && stage.subcategories.length > 0 && (
              <div className="border-t border-gr-border bg-gr-bg/50 p-6">
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-3">
                  Full subcategory breakdown
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider font-bold text-gr-subtle border-b border-gr-border">
                        <th className="px-3 py-2">Subcategory</th>
                        <th className="px-3 py-2 text-right">Gymreapers</th>
                        <th className="px-3 py-2 text-right">Peer avg</th>
                        <th className="px-3 py-2 text-right">Peer max</th>
                        <th className="px-3 py-2 text-right">Delta</th>
                        <th className="px-3 py-2">Leader</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stage.subcategories.map((s) => {
                        const negativeClass = s.delta_vs_avg <= -0.5 ? 'text-gr-danger' : s.delta_vs_avg >= 0.5 ? 'text-gr-success' : 'text-gr-muted';
                        return (
                          <tr key={s.subcategory} className="border-b border-gr-border/40">
                            <td className="px-3 py-2 capitalize text-gr-text">{prettySub(s.subcategory)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-gr-text">{s.gymreapers_count}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-gr-muted">{s.peer_avg}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-gr-muted">{s.peer_max}</td>
                            <td className={`px-3 py-2 text-right tabular-nums font-semibold ${negativeClass}`}>{fmtDelta(s.delta_vs_avg)}</td>
                            <td className="px-3 py-2 text-gr-subtle text-xs">{s.peer_max_brand_name}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <div className="text-xs text-gr-subtle">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.brand_subcategories</code>
        {' '}filtered to apparel-tier peers (Vuori, Alo, Lululemon, Gymshark, Rhone, Athleta, Outdoor Voices, Ten Thousand) plus Gymreapers.
        {' '}Subcategory-to-stage mapping is editable in <code className="bg-gr-bg px-1.5 py-0.5 rounded">webhook-server/server.py</code> (JOURNEY_BUCKETS). Updated daily as part of the competitive-intel sync.
      </div>
    </div>
  );
}
