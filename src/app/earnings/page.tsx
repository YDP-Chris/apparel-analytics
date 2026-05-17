'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface EarningsCall {
  id: number;
  ticker: string;
  brand_slug: string;
  fiscal_period: string;
  call_date: string | null;
  source: string | null;
  source_url: string | null;
}

interface Highlight {
  id: number;
  earnings_call_id: number;
  ticker: string;
  brand_slug: string;
  highlight_kind: string;
  headline: string;
  quote: string | null;
  speaker: string | null;
  apparel_thesis_relevant: boolean;
  relevance_score: number;
}

interface ApiResponse {
  available: boolean;
  calls: EarningsCall[];
  highlights_by_ticker: Record<string, Highlight[]>;
  apparel_relevant_count: number;
  by_kind_summary: Record<string, number>;
  totals: { calls: number; highlights: number; top_relevance_score: number };
  brand_names: Record<string, string>;
  error?: string;
}

const KIND_LABELS: Record<string, string> = {
  strategy_signal: 'Strategy Signal',
  category_call: 'Category Call',
  customer_demo: 'Customer Demo',
  geo_expansion: 'Geo Expansion',
  channel_shift: 'Channel Shift',
  headwind: 'Headwind',
  product_roadmap: 'Product Roadmap',
  competitive_mention: 'Competitive Mention',
};

const KIND_CLASSES: Record<string, string> = {
  strategy_signal: 'bg-gr-accent-soft text-gr-accent',
  category_call: 'bg-gr-success/15 text-gr-success',
  customer_demo: 'bg-gr-warning/15 text-gr-warning',
  geo_expansion: 'bg-gr-raised text-gr-text',
  channel_shift: 'bg-gr-raised text-gr-text',
  headwind: 'bg-gr-danger/15 text-gr-danger',
  product_roadmap: 'bg-gr-accent/15 text-gr-accent',
  competitive_mention: 'bg-gr-raised text-gr-muted',
};

const ALL_KINDS = [
  'strategy_signal',
  'category_call',
  'customer_demo',
  'geo_expansion',
  'channel_shift',
  'headwind',
  'product_roadmap',
  'competitive_mention',
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function EarningsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickerFilter, setTickerFilter] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<string>('');
  const [relevantOnly, setRelevantOnly] = useState<boolean>(false);
  const [groupByTicker, setGroupByTicker] = useState<boolean>(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/earnings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: ApiResponse) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const allHighlights = useMemo<Highlight[]>(() => {
    if (!data) return [];
    const arr: Highlight[] = [];
    Object.values(data.highlights_by_ticker || {}).forEach((list) => {
      list.forEach((h) => arr.push(h));
    });
    return arr;
  }, [data]);

  const callsById = useMemo<Record<number, EarningsCall>>(() => {
    if (!data) return {};
    const out: Record<number, EarningsCall> = {};
    (data.calls || []).forEach((c) => {
      out[c.id] = c;
    });
    return out;
  }, [data]);

  const filtered = useMemo<Highlight[]>(() => {
    let rows = allHighlights;
    if (tickerFilter) rows = rows.filter((h) => h.ticker === tickerFilter);
    if (kindFilter) rows = rows.filter((h) => h.highlight_kind === kindFilter);
    if (relevantOnly) rows = rows.filter((h) => h.apparel_thesis_relevant);
    rows = [...rows].sort((a, b) => {
      if (b.relevance_score !== a.relevance_score) return b.relevance_score - a.relevance_score;
      const ca = callsById[a.earnings_call_id]?.call_date || '';
      const cb = callsById[b.earnings_call_id]?.call_date || '';
      return cb.localeCompare(ca);
    });
    return rows;
  }, [allHighlights, tickerFilter, kindFilter, relevantOnly, callsById]);

  const groupedByTicker = useMemo<Record<string, Highlight[]>>(() => {
    const out: Record<string, Highlight[]> = {};
    filtered.forEach((h) => {
      out[h.ticker] = out[h.ticker] || [];
      out[h.ticker].push(h);
    });
    return out;
  }, [filtered]);

  const allTickers = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set((data.calls || []).map((c) => c.ticker))).sort();
  }, [data]);

  const brandLabel = (slug: string) => (data?.brand_names || {})[slug] || slug;

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading earnings intel...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Marketing + Product &middot; Earnings Intel
            </p>
            <ConfidenceBadge source="composite" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            What public peers told their investors
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-gr-muted leading-relaxed">
            Earnings intel is unavailable. The agent needs at least one transcript captured in
            <code className="mx-1 bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.earnings_calls</code>
            before the page lights up.
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
            For Marketing + Product &middot; Earnings Intel
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What public peers told their investors
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Quarterly earnings transcripts for LULU (Lululemon), GAP (Athleta parent), NKE (Nike),
          UAA (Under Armour). Claude-extracts strategic signals, category calls, customer-demo
          claims, headwinds. Apparel-thesis-relevant highlights surface to the top.
        </p>
      </header>

      <SectionExplainer
        what="Each card is a single highlight pulled from a public peer's quarterly earnings call. The verbatim quote is the audit trail; the headline is our one-sentence summary. Speakers are usually the CEO or CFO, sometimes a covering analyst."
        howToRead="Sorted by relevance_score descending, then call_date descending. The apparel-thesis badge means the highlight discusses categories Gymreapers is in or moving into (joggers, hoodies, training apparel, mens athleisure, expanded sizing). Filter chips at the top narrow by ticker, by kind, or to apparel-thesis-only."
        whatToDo="Cite these in exec briefs. Public companies are on the record - their category calls, customer-demo claims, and channel-shift admissions are the most defensible competitive intel we have. Pair high-relevance highlights with sitemap and trends data before committing a brand response."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Transcripts captured</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{data.totals.calls}</div>
          <div className="text-xs text-gr-muted mt-1">across {allTickers.length} ticker(s)</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Total highlights</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{data.totals.highlights}</div>
          <div className="text-xs text-gr-muted mt-1">Claude-extracted</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Apparel-relevant</div>
          <div className="text-3xl font-bold text-gr-success tabular-nums">{data.apparel_relevant_count}</div>
          <div className="text-xs text-gr-muted mt-1">match Gymreapers thesis</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Top relevance</div>
          <div className="text-3xl font-bold text-gr-warning tabular-nums">{data.totals.top_relevance_score}</div>
          <div className="text-xs text-gr-muted mt-1">score 0-100</div>
        </div>
      </section>

      {/* Filter chips */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Ticker</span>
          <button
            type="button"
            onClick={() => setTickerFilter('')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
              tickerFilter === ''
                ? 'bg-gr-accent text-gr-bg border-gr-accent'
                : 'bg-gr-bg text-gr-muted border-gr-border hover:text-gr-text'
            }`}
          >
            All
          </button>
          {allTickers.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTickerFilter(t);
                trackEvent('click', { label: 'earnings_filter_ticker', metadata: { ticker: t } });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
                tickerFilter === t
                  ? 'bg-gr-accent text-gr-bg border-gr-accent'
                  : 'bg-gr-bg text-gr-muted border-gr-border hover:text-gr-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Kind</span>
          <button
            type="button"
            onClick={() => setKindFilter('')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
              kindFilter === ''
                ? 'bg-gr-accent text-gr-bg border-gr-accent'
                : 'bg-gr-bg text-gr-muted border-gr-border hover:text-gr-text'
            }`}
          >
            All
          </button>
          {ALL_KINDS.map((k) => {
            const count = data.by_kind_summary[k] || 0;
            if (count === 0) return null;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKindFilter(k);
                  trackEvent('click', { label: 'earnings_filter_kind', metadata: { kind: k } });
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
                  kindFilter === k
                    ? 'bg-gr-accent text-gr-bg border-gr-accent'
                    : 'bg-gr-bg text-gr-muted border-gr-border hover:text-gr-text'
                }`}
              >
                {KIND_LABELS[k] || k} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={relevantOnly}
              onChange={(e) => {
                setRelevantOnly(e.target.checked);
                trackEvent('click', { label: 'earnings_filter_relevant', metadata: { on: String(e.target.checked) } });
              }}
              className="accent-gr-accent"
            />
            <span className="text-gr-muted">Apparel-relevant only</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={groupByTicker}
              onChange={(e) => setGroupByTicker(e.target.checked)}
              className="accent-gr-accent"
            />
            <span className="text-gr-muted">Group by ticker</span>
          </label>
        </div>
      </section>

      {/* Cards */}
      {filtered.length === 0 ? (
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-gr-muted">No highlights match the current filters.</p>
        </section>
      ) : groupByTicker ? (
        <div className="space-y-10">
          {Object.entries(groupedByTicker).map(([tk, rows]) => (
            <section key={tk} className="space-y-3">
              <h2 className="text-xl font-bold text-gr-text tracking-tight">
                {tk} <span className="text-gr-subtle font-medium">- {brandLabel(rows[0]?.brand_slug || '')} ({rows.length})</span>
              </h2>
              <div className="space-y-3">
                {rows.map((h) => (
                  <HighlightCard key={h.id} h={h} call={callsById[h.earnings_call_id]} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="space-y-3">
          {filtered.map((h) => (
            <HighlightCard key={h.id} h={h} call={callsById[h.earnings_call_id]} />
          ))}
        </section>
      )}

      <div className="text-xs text-gr-subtle leading-relaxed max-w-3xl">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.earnings_calls</code> and
        <code className="ml-1 bg-gr-bg px-1.5 py-0.5 rounded">earnings_highlights</code>. The transcripts are
        captured by the earnings-intel agent (Motley Fool first, IR pages and SEC EDGAR as fallbacks) and
        the highlights are extracted by Claude Sonnet 4.6. Verbatim quotes are the audit trail - cite those,
        not the headlines, when forwarding a finding.
      </div>
    </div>
  );
}

function HighlightCard({ h, call }: { h: Highlight; call: EarningsCall | undefined }) {
  const kindCls = KIND_CLASSES[h.highlight_kind] || 'bg-gr-raised text-gr-muted';
  const kindLabel = KIND_LABELS[h.highlight_kind] || h.highlight_kind;
  return (
    <article className="bg-gr-surface rounded-md border border-gr-border p-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-bg text-gr-text border border-gr-border">
            {h.ticker}
          </span>
          {call && (
            <>
              <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle">
                {call.fiscal_period}
              </span>
              <span className="text-[11px] text-gr-subtle">{fmtDate(call.call_date)}</span>
            </>
          )}
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${kindCls}`}>
            {kindLabel}
          </span>
          {h.apparel_thesis_relevant && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-success/20 text-gr-success border border-gr-success/40">
              Apparel thesis
            </span>
          )}
          <span className="text-[11px] tabular-nums text-gr-subtle">score {h.relevance_score}</span>
        </div>
      </header>

      <h3 className="mt-3 text-lg font-bold text-gr-text tracking-tight leading-snug">
        {h.headline}
      </h3>

      {h.quote && (
        <blockquote className="mt-3 pl-3 border-l-2 border-gr-accent/60 text-sm italic text-gr-accent leading-relaxed">
          {h.quote}
        </blockquote>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {h.speaker && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-gr-bg text-gr-muted border border-gr-border">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Speaker</span>
            <span className="text-gr-text">{h.speaker}</span>
          </span>
        )}
        {call?.source_url && (
          <a
            href={call.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] uppercase tracking-wider font-bold text-gr-accent hover:underline"
          >
            Open transcript
          </a>
        )}
        {call?.source && (
          <span className="text-[11px] text-gr-subtle uppercase tracking-wider">via {call.source.replace(/_/g, ' ')}</span>
        )}
      </div>
    </article>
  );
}
