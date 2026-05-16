'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface ResponseRow {
  brand: string;
  brand_name: string;
  response_kind: string;
  lag_days: number;
  response_date: string;
  response_subject: string;
  evidence: Record<string, unknown>;
}

interface Thread {
  trigger_kind: 'launch' | 'promo';
  trigger_id: string;
  trigger_date: string;
  trigger_subject: string;
  trigger_category: string | null;
  responses: ResponseRow[];
}

interface Responder {
  brand_slug: string;
  brand_name: string;
  total_responses: number;
  avg_lag_days: number;
  response_kind_breakdown: Record<string, number>;
}

interface Summary {
  triggers_analyzed: number;
  triggers_with_response: number;
  responses_detected: number;
  avg_lag_days: number;
  most_agile_responder: {
    brand_slug: string;
    brand_name: string;
    avg_lag_days: number;
    response_count: number;
  } | null;
  least_responsive: {
    brand_slug: string;
    brand_name: string;
    ignored_pct: number;
  } | null;
  ignored_pct: number;
}

interface Payload {
  available: boolean;
  lookback_days: number;
  summary: Summary;
  by_responder: Responder[];
  recent_response_threads: Thread[];
  brand_names: Record<string, string>;
  error?: string;
}

const RESPONSE_KIND_LABEL: Record<string, string> = {
  matched_launch: 'launch',
  matched_promo: 'promo',
  price_cut: 'price cut',
  new_color: 'new color',
  social_burst: 'social burst',
};

const RESPONSE_KIND_COLOR: Record<string, string> = {
  matched_launch: 'bg-gr-accent',
  matched_promo: 'bg-gr-warning',
  price_cut: 'bg-gr-danger',
  new_color: 'bg-gr-success',
  social_burst: 'bg-gr-text',
};

const RESPONSE_KIND_PILL: Record<string, string> = {
  matched_launch: 'bg-gr-accent/15 text-gr-accent',
  matched_promo: 'bg-gr-warning/15 text-gr-warning',
  price_cut: 'bg-gr-danger/15 text-gr-danger',
  new_color: 'bg-gr-success/15 text-gr-success',
  social_burst: 'bg-gr-raised text-gr-text',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return fmtDate(iso);
}

function kindLabel(k: string): string {
  return RESPONSE_KIND_LABEL[k] || k.replace(/_/g, ' ');
}

function ResponderBreakdownBar({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  // Stable ordering so the bar reads the same across cards.
  const order = ['matched_launch', 'matched_promo', 'price_cut', 'new_color', 'social_burst'];
  return (
    <div className="mt-3">
      <div className="flex h-1.5 rounded-sm overflow-hidden bg-gr-bg">
        {order.map((k) => {
          const v = breakdown[k] || 0;
          if (v === 0) return null;
          const pct = (v / total) * 100;
          return (
            <div
              key={k}
              className={`${RESPONSE_KIND_COLOR[k] || 'bg-gr-muted'}`}
              style={{ width: `${pct}%` }}
              title={`${kindLabel(k)}: ${v}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-gr-muted">
        {order.map((k) => {
          const v = breakdown[k] || 0;
          if (v === 0) return null;
          return (
            <span key={k} className="inline-flex items-center gap-1">
              <span
                className={`inline-block w-2 h-2 rounded-sm ${RESPONSE_KIND_COLOR[k] || 'bg-gr-muted'}`}
                aria-hidden="true"
              />
              <span className="uppercase tracking-wider font-bold">{kindLabel(k)}</span>
              <span className="tabular-nums">{v}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function CompetitiveResponsePage() {
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
    fetch(`${PULSE_API}/pulse/competitive-response`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const sortedResponders = useMemo(() => {
    if (!data) return [] as Responder[];
    return [...data.by_responder].sort((a, b) => {
      if (b.total_responses !== a.total_responses) return b.total_responses - a.total_responses;
      return a.avg_lag_days - b.avg_lag_days;
    });
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading competitive response data...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Marketing + Product &middot; Competitive Response
            </p>
            <ConfidenceBadge source="composite" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            Do competitors react when we move?
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Competitive Response Monitor is still warming up
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The agent needs at least one daily cycle before this page renders. Daily run lands 6:45 AM ET.
          </p>
        </section>
      </div>
    );
  }

  const summary = data.summary;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing + Product &middot; Competitive Response
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Do competitors react when we move?
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          When Gymreapers launches a product or runs a promo, do peers within N days launch in the
          same category, discount the same items, or burst on social? Reveals competitor agility -
          who copies, who ignores, who counter-launches.
        </p>
      </header>

      <SectionExplainer
        what="Every Gymreapers launch and promo in the last 60 days, with peer moves inside a +1..+14 day window flagged as one of five response kinds: matched_launch, matched_promo, price_cut, new_color, social_burst."
        howToRead="The KPI strip is the headline. The per-responder grid shows who reacts most often and how fast. The threads section reads like a Slack channel - one Gymreapers move at the top, every peer reaction stacked underneath with lag and evidence. Lag is response_date minus trigger_date."
        whatToDo="The most-agile responder is the brand most likely to chase your moves. Brief defensive content for that brand. The least-responsive peer is either confidently above the fight or simply slow - either is exploitable. Use the response_kind mix to read intent: matched_promo says they are price-competing; new_color says they are catalog-competing; social_burst says they are buying earned attention."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
            Triggers analyzed
          </div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">
            {summary.triggers_analyzed}
          </div>
          <div className="text-xs text-gr-muted mt-1">
            GR launches + promos, last {data.lookback_days}d
          </div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
            Responses detected
          </div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">
            {summary.responses_detected}
          </div>
          <div className="text-xs text-gr-muted mt-1">
            across {sortedResponders.length} peer{sortedResponders.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
            Most agile responder
          </div>
          {summary.most_agile_responder ? (
            <>
              <div className="text-2xl font-bold text-gr-text tracking-tight">
                {summary.most_agile_responder.brand_name}
              </div>
              <div className="text-xs text-gr-muted mt-1 tabular-nums">
                avg lag {summary.most_agile_responder.avg_lag_days}d &middot;{' '}
                {summary.most_agile_responder.response_count} responses
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gr-subtle">-</div>
              <div className="text-xs text-gr-muted mt-1">no peer responses yet</div>
            </>
          )}
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
            Triggers ignored
          </div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">
            {summary.ignored_pct.toFixed(0)}%
          </div>
          <div className="text-xs text-gr-muted mt-1">
            no peer responded inside +14d
          </div>
        </div>
      </section>

      {/* Per-responder grid */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">By responder</h2>
          <div className="text-xs text-gr-subtle">
            Sorted by response volume, then by speed
          </div>
        </div>
        {sortedResponders.length === 0 ? (
          <div className="bg-gr-surface rounded-md border border-gr-border p-10">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
              No peer responses inside the 60-day window
            </p>
            <p className="text-gr-muted max-w-2xl leading-relaxed">
              The system is young (Gymreapers triggers + peer signal feeds are both still filling
              in). Once both have multi-week history, this grid will populate with per-peer
              reaction patterns. Expected to take 2 to 3 weeks of stable cron runs.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedResponders.map((r) => (
              <div
                key={r.brand_slug}
                className="bg-gr-surface rounded-md border border-gr-border p-5"
                onClick={() =>
                  trackEvent('click', {
                    label: 'competitive_response_card',
                    metadata: { brand: r.brand_slug },
                  })
                }
              >
                <div className="flex items-baseline justify-between gap-2 mb-3">
                  <div className="text-base font-bold text-gr-text tracking-tight">
                    {r.brand_name}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
                    {r.brand_slug}
                  </div>
                </div>
                <div className="flex items-baseline gap-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
                      Responses
                    </div>
                    <div className="text-2xl font-bold text-gr-text tabular-nums">
                      {r.total_responses}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
                      Avg lag
                    </div>
                    <div className="text-2xl font-bold text-gr-accent tabular-nums">
                      {r.avg_lag_days}d
                    </div>
                  </div>
                </div>
                <ResponderBreakdownBar breakdown={r.response_kind_breakdown} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent threads */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">Recent threads</h2>
          <div className="text-xs text-gr-subtle">
            Latest Gymreapers moves with linked peer reactions
          </div>
        </div>
        {data.recent_response_threads.length === 0 ? (
          <div className="bg-gr-surface rounded-md border border-gr-border p-10">
            <p className="text-gr-muted leading-relaxed max-w-2xl">
              No threads yet. A thread appears once at least one peer reacts inside the +14d
              window for a Gymreapers trigger.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.recent_response_threads.map((t) => (
              <div
                key={`${t.trigger_kind}:${t.trigger_id}`}
                className="bg-gr-surface rounded-md border border-gr-border overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-gr-border bg-gr-bg/40">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                          t.trigger_kind === 'launch'
                            ? 'bg-gr-accent/15 text-gr-accent'
                            : 'bg-gr-warning/15 text-gr-warning'
                        }`}
                      >
                        GR {t.trigger_kind}
                      </span>
                      <span className="text-sm text-gr-subtle tabular-nums">
                        {fmtRelative(t.trigger_date)}
                      </span>
                      {t.trigger_category && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gr-muted bg-gr-bg border border-gr-border rounded px-1.5 py-0.5">
                          {t.trigger_category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gr-muted tabular-nums">
                      {t.responses.length} response{t.responses.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-base font-semibold text-gr-text">
                    {t.trigger_subject}
                  </div>
                </div>
                <div className="divide-y divide-gr-border">
                  {t.responses.map((r, idx) => (
                    <div key={`${r.brand}:${r.response_kind}:${idx}`} className="px-5 py-3">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-sm font-bold text-gr-text">{r.brand_name}</span>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                            RESPONSE_KIND_PILL[r.response_kind] || 'bg-gr-raised text-gr-muted'
                          }`}
                        >
                          {kindLabel(r.response_kind)}
                        </span>
                        <span className="text-xs text-gr-accent font-bold tabular-nums">
                          +{r.lag_days}d
                        </span>
                        <span className="text-xs text-gr-subtle ml-auto tabular-nums">
                          {fmtDate(r.response_date)}
                        </span>
                      </div>
                      <div className="text-sm text-gr-muted">{r.response_subject}</div>
                      {r.evidence && Object.keys(r.evidence).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gr-subtle">
                          {Object.entries(r.evidence).map(([k, v]) => (
                            <span key={k} className="tabular-nums">
                              <span className="uppercase tracking-wider font-bold">{k}:</span>{' '}
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="text-xs text-gr-subtle">
        Built from{' '}
        <code className="bg-gr-bg px-1.5 py-0.5 rounded">
          gymreapers_competitive.competitive_responses
        </code>
        . Daily run lands 6:45 AM ET via competitive-response-monitor. Window is +1 to +14 days
        after each Gymreapers trigger. Lookback {data.lookback_days} days.
      </div>
    </div>
  );
}
