'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { MetricDelta } from '@/components/MetricDelta';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const NAME_LS_KEY = 'ydp_inputs_submitter_name';

interface Candidate {
  subcategory: string;
  stage: string;
  stage_label: string;
  story: string;
  deficit_score: number;
  demand_score: number;
  adjacency_score: number;
  total_score: number;
  gymreapers_count: number;
  peer_avg: number;
  peer_max: number;
  peer_max_brand: string | null;
  peer_max_brand_name: string | null;
  total_skus_market: number;
  per_brand: Record<string, number>;
}

interface StageSubtotal {
  stage: string;
  label: string;
  count_in_top_15: number;
  score_sum_in_top_15: number;
}

interface ApparelCandidatesLwSummary {
  top_candidate_score: number;
  total_deficit_score_sum: number;
  biggest_deficit_stage: string | null;
}

interface Payload {
  available: boolean;
  snapshot_date: string | null;
  previous_snapshot_date?: string | null;
  tier: string;
  tier_brands: string[];
  brand_names: Record<string, string>;
  scoring: {
    deficit_max: number;
    demand_max: number;
    adjacency_max: number;
    adjacency_by_stage: Record<string, number>;
  };
  candidates: Candidate[];
  stage_subtotals: StageSubtotal[];
  total_candidates_evaluated: number;
  lw_summary?: ApparelCandidatesLwSummary | null;
}

type SortKey = 'total_score' | 'deficit_score';

function prettySub(s: string): string {
  return s.replace(/_/g, ' ');
}

const STAGE_STYLES: Record<string, string> = {
  training:     'bg-gr-accent-soft text-gr-accent',
  between_sets: 'bg-gr-raised text-gr-text',
  recovery:     'bg-gr-raised text-gr-muted',
  identity:     'bg-gr-success/15 text-gr-success',
  meet_day:     'bg-gr-danger/15 text-gr-danger',
};

export default function ApparelEntryCandidatesPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('total_score');
  const [toast, setToast] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/apparel-candidates`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const candidates = data?.candidates ?? [];
  const stageSubtotals = data?.stage_subtotals ?? [];

  const sortedCandidates = useMemo(() => {
    const arr = [...candidates];
    arr.sort((a, b) => b[sortKey] - a[sortKey]);
    return arr;
  }, [candidates, sortKey]);

  const kpis = useMemo(() => {
    const top = candidates[0] || null;
    const totalDeficit = candidates.reduce((s, c) => s + c.deficit_score, 0);
    let leaderStage: StageSubtotal | null = null;
    for (const s of stageSubtotals) {
      if (!leaderStage || s.count_in_top_15 > leaderStage.count_in_top_15) leaderStage = s;
    }
    return { top, totalDeficit: Math.round(totalDeficit * 10) / 10, leaderStage };
  }, [candidates, stageSubtotals]);

  const handleSortChange = (key: SortKey) => {
    if (key === sortKey) return;
    setSortKey(key);
    trackEvent('click', { label: 'apparel_candidates_sort', metadata: { sort: key } });
  };

  const handleRowClick = (c: Candidate) => {
    trackEvent('click', { label: 'apparel_candidate_row', metadata: { subcategory: c.subcategory, stage: c.stage, score: c.total_score } });
  };

  const handleAddToRoadmap = async (c: Candidate) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setToast('Sign in first.'); return; }
    const submitter = (typeof window !== 'undefined' ? localStorage.getItem(NAME_LS_KEY) : null) || '';
    const key = `${c.stage}:${c.subcategory}`;
    setAddingKey(key);
    trackEvent('click', { label: 'apparel_roadmap_add', metadata: { subcategory: c.subcategory } });

    const note = `Add to apparel roadmap. Stage: ${c.stage_label}. Score ${c.total_score} (deficit ${c.deficit_score}, demand ${c.demand_score}, adjacency ${c.adjacency_score}). GR=${c.gymreapers_count} vs peer max ${c.peer_max} (${c.peer_max_brand_name}).`;

    try {
      const res = await fetch(`${PULSE_API}/pulse/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          entity_kind: 'apparel_candidate',
          entity_key: c.subcategory,
          note,
          note_kind: 'action_taken',
          submitted_by: submitter || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAdded((prev) => ({ ...prev, [key]: true }));
      setToast(`Added ${prettySub(c.subcategory)} to apparel roadmap.`);
    } catch (e) {
      setToast(`Failed to add: ${String(e)}`);
    } finally {
      setAddingKey(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  if (loading) return <div className="text-center py-20 text-gr-subtle">Ranking candidates...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data?.available) {
    return <div className="text-center py-20 text-gr-subtle">Apparel candidates feed unavailable.</div>;
  }

  return (
    <div className="space-y-12">
      <HubTabs hub="play" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product &middot; Apparel Entry Candidates
          </p>
          <ConfidenceBadge source="brand_mix" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What to enter first
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Ranked apparel subcategories where peers are deep, Gymreapers is thin, and the use case maps to a strength-athlete customer. Score blends deficit plus demand plus adjacency to Gymreapers&apos; core (training-adjacent ranked higher).
        </p>
        <p className="text-gr-subtle mt-2 text-sm">
          Internal &middot; Gymreapers apparel thesis &middot; snapshot {data.snapshot_date} &middot; {data.total_candidates_evaluated} candidates evaluated
        </p>
      </header>

      <SectionExplainer
        what="Each row is a (stage, subcategory) pair scored 0-100. Deficit (0-50) = how far Gymreapers sits below the deepest peer in that subcategory. Demand (0-30) = total colorways across apparel peers as a proxy for market interest. Adjacency (0-20) = how closely the use case maps to a strength-athlete customer (training scores highest, meet day lowest)."
        howToRead="Top 5 rows are highlighted with the accent ring (highest-priority entry candidates). Top 10 rows have a soft tinted background. Sort by total score (default) to see the ranked roadmap, or by deficit to see purely the colorway-gap view independent of adjacency."
        whatToDo="Treat the top 5 as the first apparel waves to investigate. For each candidate, click 'Add to apparel roadmap' to drop a note onto the Decisions Log. Stage subtotals tell you which stage dominates the top 15 - that's where to concentrate the early bets."
      />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Top candidate</div>
          {kpis.top ? (
            <>
              <div className="text-xl font-bold text-gr-accent capitalize truncate">{prettySub(kpis.top.subcategory)}</div>
              <div className="text-xs text-gr-subtle mt-0.5 flex items-baseline gap-1.5">
                <span>{kpis.top.stage_label} &middot; score {kpis.top.total_score}</span>
                <MetricDelta
                  current={kpis.top.total_score}
                  previous={data.lw_summary?.top_candidate_score ?? null}
                  compact
                />
              </div>
            </>
          ) : <div className="text-gr-subtle">-</div>}
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Total deficit across top 15</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.totalDeficit}</div>
          <div className="text-xs text-gr-subtle mt-1 flex items-baseline gap-1.5">
            <span>summed deficit-score points (max 750)</span>
            <MetricDelta
              current={kpis.totalDeficit}
              previous={data.lw_summary?.total_deficit_score_sum ?? null}
              invertColors
              compact
            />
          </div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Stage with most candidates</div>
          {kpis.leaderStage && kpis.leaderStage.count_in_top_15 > 0 ? (
            <>
              <div className="text-xl font-bold text-gr-text truncate">{kpis.leaderStage.label}</div>
              <div className="text-xs text-gr-subtle mt-0.5 flex items-baseline gap-1.5">
                <span>{kpis.leaderStage.count_in_top_15} of 15</span>
                {data.lw_summary?.biggest_deficit_stage ? (
                  data.lw_summary.biggest_deficit_stage === kpis.leaderStage.stage ? (
                    <span className="text-[10px] text-gr-subtle italic">same as LW</span>
                  ) : (
                    <span className="text-[10px] text-gr-accent italic">was {data.lw_summary.biggest_deficit_stage.replace(/_/g, ' ')} LW</span>
                  )
                ) : (
                  <span className="text-[10px] text-gr-subtle italic">no LW data yet</span>
                )}
              </div>
            </>
          ) : <div className="text-gr-subtle">-</div>}
        </div>
      </section>

      <section className="bg-gr-surface border border-gr-border rounded-md p-5">
        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-3">Per-stage breakdown (top 15)</div>
        <div className="flex flex-wrap gap-2">
          {stageSubtotals.map((s) => {
            const cls = STAGE_STYLES[s.stage] || 'bg-gr-raised text-gr-text';
            return (
              <span
                key={s.stage}
                className={`inline-flex items-baseline gap-2 px-3 py-1.5 rounded text-xs font-semibold ${cls}`}
              >
                <span>{s.label}</span>
                <span className="tabular-nums opacity-80">{s.count_in_top_15}</span>
              </span>
            );
          })}
        </div>
      </section>

      <section className="bg-gr-surface border border-gr-border rounded-md overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3 gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gr-text tracking-tight">Top 15 entry candidates</h2>
            <p className="text-xs text-gr-subtle mt-0.5">Ranked by {sortKey === 'total_score' ? 'total score' : 'deficit'}. Sort to switch.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Sort</span>
            <button
              type="button"
              onClick={() => handleSortChange('total_score')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${sortKey === 'total_score' ? 'bg-gr-accent text-gr-text' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
            >
              Score
            </button>
            <button
              type="button"
              onClick={() => handleSortChange('deficit_score')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${sortKey === 'deficit_score' ? 'bg-gr-accent text-gr-text' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
            >
              Deficit
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider font-bold text-gr-subtle border-b border-gr-border">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Subcategory</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Deficit</th>
                <th className="px-3 py-2 text-right">Peer max</th>
                <th className="px-3 py-2">Story</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedCandidates.map((c, i) => {
                const key = `${c.stage}:${c.subcategory}`;
                const stageCls = STAGE_STYLES[c.stage] || 'bg-gr-raised text-gr-text';
                const isTop5 = i < 5;
                const isTop10 = i < 10;
                const rowCls = isTop5
                  ? 'bg-gr-accent-soft/40 ring-1 ring-inset ring-gr-accent/40'
                  : isTop10
                    ? 'bg-gr-accent-soft/15'
                    : '';
                const storyPreview = c.story.length > 110 ? c.story.slice(0, 107) + '...' : c.story;
                const isAdded = added[key];
                const isAdding = addingKey === key;
                return (
                  <tr
                    key={key}
                    className={`border-b border-gr-border/40 hover:bg-gr-raised/30 transition cursor-pointer ${rowCls}`}
                    onClick={() => handleRowClick(c)}
                  >
                    <td className="px-3 py-2.5 text-gr-subtle tabular-nums font-semibold">{i + 1}</td>
                    <td className="px-3 py-2.5 capitalize text-gr-text font-semibold">{prettySub(c.subcategory)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${stageCls}`}>
                        {c.stage_label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-gr-text">{c.total_score}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gr-danger">{c.deficit_score}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gr-muted">
                      <span className="font-semibold text-gr-text">{c.peer_max}</span>
                      <span className="text-gr-subtle ml-1 text-xs">{c.peer_max_brand_name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gr-muted text-xs italic max-w-md">&ldquo;{storyPreview}&rdquo;</td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleAddToRoadmap(c)}
                        disabled={isAdding || isAdded}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                          isAdded
                            ? 'bg-gr-success/20 text-gr-success cursor-default'
                            : isAdding
                              ? 'bg-gr-raised text-gr-subtle cursor-wait'
                              : 'bg-gr-accent-soft text-gr-accent hover:bg-gr-accent hover:text-gr-text'
                        }`}
                      >
                        {isAdded ? 'Added' : isAdding ? 'Adding...' : 'Add to roadmap'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gr-surface border border-gr-border rounded-md px-4 py-3 shadow-xl text-sm text-gr-text max-w-sm">
          {toast}
        </div>
      )}

      <div className="text-xs text-gr-subtle">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.brand_subcategories</code>
        {' '}filtered to apparel-tier peers (Vuori, Alo, Lululemon, Gymshark, Rhone, Athleta, Outdoor Voices, Ten Thousand) plus Gymreapers.
        {' '}Scoring weights: deficit max 50, demand max 30, adjacency max 20 (training {data.scoring.adjacency_by_stage.training}, identity {data.scoring.adjacency_by_stage.identity}, between sets {data.scoring.adjacency_by_stage.between_sets}, recovery {data.scoring.adjacency_by_stage.recovery}, meet day {data.scoring.adjacency_by_stage.meet_day}).
        {' '}Demand uses total apparel-peer colorways in the subcategory as a market-interest proxy; swap in Amazon BSR review counts when the BSR-to-journey-subcategory mapping is wired up.
      </div>
    </div>
  );
}
