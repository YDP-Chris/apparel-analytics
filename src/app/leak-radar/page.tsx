'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface TrademarkEvidence {
  serial_number?: string | null;
  mark_text?: string | null;
  filing_date?: string | null;
  status?: string | null;
  source_url?: string | null;
}

interface PatentEvidence {
  patent_number?: string | null;
  title?: string | null;
  publication_date?: string | null;
  filing_date?: string | null;
  source_url?: string | null;
}

interface PrelaunchEvidence {
  signal_value?: string | null;
  signal_type?: string | null;
  first_seen?: string | null;
  last_seen?: string | null;
  url?: string | null;
}

interface FusedLeak {
  brand_slug: string;
  leak_label: string;
  confidence: 'high' | 'medium' | 'low';
  fusion_score: number;
  signal_count: number;
  evidence: {
    trademarks: TrademarkEvidence[];
    patents: PatentEvidence[];
    prelaunch_signals: PrelaunchEvidence[];
  };
  earliest_signal_date: string;
  latest_signal_date: string;
  days_spread: number;
  shared_tokens?: string[];
}

interface ApiResponse {
  available: boolean;
  fused_leaks: FusedLeak[];
  single_signal_count: number;
  summary: { high: number; medium: number; low: number };
  brand_names: Record<string, string>;
  counts?: { trademarks_90d: number; patents_365d: number; prelaunch_90d: number };
  error?: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

const CONFIDENCE_CLASSES: Record<string, string> = {
  high: 'bg-gr-danger/20 text-gr-danger border-gr-danger/40',
  medium: 'bg-gr-warning/20 text-gr-warning border-gr-warning/40',
  low: 'bg-gr-raised text-gr-muted border-gr-border',
};

export default function LeakRadarPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/leak-radar`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: ApiResponse) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const brandsWithMultiSignal = useMemo(() => {
    if (!data) return 0;
    const brands = new Set<string>();
    for (const f of data.fused_leaks || []) brands.add(f.brand_slug);
    return brands.size;
  }, [data]);

  const oldestOpenAge = useMemo(() => {
    if (!data) return null;
    let oldest: number | null = null;
    for (const f of data.fused_leaks || []) {
      const age = daysSince(f.earliest_signal_date);
      if (age != null && (oldest === null || age > oldest)) oldest = age;
    }
    return oldest;
  }, [data]);

  const brandLabel = (slug: string) => (data?.brand_names || {})[slug] || slug;

  const toggle = (i: number) => {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
    trackEvent('click', { label: 'leak_radar_expand', metadata: { index: String(i) } });
  };

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading leak radar...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <HubTabs hub="radar" />
      <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              Cross-cutting &middot; Leak Radar
            </p>
            <ConfidenceBadge source="composite" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            What is about to ship across the set
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-gr-muted leading-relaxed">
            Leak radar is unavailable. The fusion endpoint needs trademark, patent, and prelaunch signal feeds to be running.
          </p>
        </section>
      </div>
    );
  }

  const fused = data.fused_leaks || [];

  return (
    <div className="space-y-12">
      <HubTabs hub="radar" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Cross-cutting &middot; Leak Radar
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What is about to ship across the set
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Fuses three independent leak signals: USPTO trademark filings (3-6 month lead), patent
          filings (18 month lead), and search-autocomplete terms appearing on competitor sites
          before public launch (days to weeks lead). When two or more signals point at the same
          brand and category within 60 days, confidence jumps.
        </p>
      </header>

      <SectionExplainer
        what="A fused view of three pre-launch leak feeds. Each card represents a cluster of signals from one brand that share keywords (e.g. a trademark mark, a patent title, and a recent autocomplete term all containing the word 'knee'). The signals were collected independently, so when two or more align on the same brand and term they corroborate each other."
        howToRead='Cards are sorted by fusion_score. "High" means three signal types fired (TM + patent + prelaunch). "Medium" means two. A wider days-spread (the signals span 30+ days) earns a bonus, since a consistent trail beats a coincidence. Confidence is conservative: single-signal leaks fall through to the count tile at the bottom, not this list.'
        whatToDo="Use this as a tip-off for merchandising + creative planning. A fused leak is a fairly strong signal that the brand will publicly ship inside 1-3 months. Cross-check each card on the linked single-signal pages before acting."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">High-confidence</div>
          <div className="text-3xl font-bold text-gr-danger tabular-nums">{data.summary.high}</div>
          <div className="text-xs text-gr-muted mt-1">3 signal types aligned</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Medium-confidence</div>
          <div className="text-3xl font-bold text-gr-warning tabular-nums">{data.summary.medium}</div>
          <div className="text-xs text-gr-muted mt-1">2 signal types aligned</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Brands w/ multi-signal</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{brandsWithMultiSignal}</div>
          <div className="text-xs text-gr-muted mt-1">distinct brands fusing</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Oldest open signal</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">
            {oldestOpenAge == null ? '-' : `${oldestOpenAge}d`}
          </div>
          <div className="text-xs text-gr-muted mt-1">earliest fused signal age</div>
        </div>
      </section>

      {/* Fused leaks list */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">
            Fused leaks ({fused.length})
          </h2>
          <p className="text-xs text-gr-subtle">sorted by fusion score</p>
        </div>

        {fused.length === 0 ? (
          <div className="bg-gr-surface rounded-md border border-gr-border p-10">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
              No fused leaks in the current window
            </p>
            <p className="text-gr-muted max-w-2xl leading-relaxed">
              Nothing has two-plus signal types pointing at the same brand and category cluster
              right now. Single-signal events are still live on the individual pages below. This
              page lights up when independent feeds start corroborating each other.
            </p>
            {data.counts && (
              <p className="text-xs text-gr-subtle mt-4 tabular-nums">
                Pool scanned: {data.counts.trademarks_90d} trademark filings (90d) &middot;{' '}
                {data.counts.patents_365d} patents (365d) &middot;{' '}
                {data.counts.prelaunch_90d} prelaunch signals (90d).
              </p>
            )}
          </div>
        ) : (
          fused.map((leak, i) => {
            const isOpen = expanded.has(i);
            const confClass = CONFIDENCE_CLASSES[leak.confidence] || CONFIDENCE_CLASSES.low;
            const tmCount = leak.evidence.trademarks.length;
            const ptCount = leak.evidence.patents.length;
            const plCount = leak.evidence.prelaunch_signals.length;
            return (
              <article
                key={`${leak.brand_slug}-${i}`}
                className="bg-gr-surface rounded-md border border-gr-border p-6"
              >
                <header className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle">
                        {brandLabel(leak.brand_slug)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${confClass}`}
                      >
                        {leak.confidence}
                      </span>
                      <span className="text-[11px] tabular-nums text-gr-subtle">
                        score {leak.fusion_score}
                      </span>
                      <span className="text-[11px] tabular-nums text-gr-subtle">
                        {leak.signal_count} signal types
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gr-text tracking-tight break-words">
                      {leak.leak_label}
                    </h3>
                    {leak.shared_tokens && leak.shared_tokens.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {leak.shared_tokens.slice(0, 6).map((tok) => (
                          <span
                            key={tok}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gr-bg text-gr-muted border border-gr-border"
                          >
                            {tok}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border transition"
                  >
                    {isOpen ? 'Hide evidence' : 'Show evidence'}
                  </button>
                </header>

                {/* Timeline strip */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gr-subtle mb-1">
                    <span>{fmtDate(leak.earliest_signal_date)}</span>
                    <span className="text-gr-muted">{leak.days_spread}d spread</span>
                    <span>{fmtDate(leak.latest_signal_date)}</span>
                  </div>
                  <div className="h-1.5 bg-gr-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gr-accent to-gr-warning rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Signal counts row */}
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span
                    className={`px-2 py-1 rounded font-bold uppercase tracking-wider ${
                      tmCount > 0 ? 'bg-gr-accent/15 text-gr-accent' : 'bg-gr-raised text-gr-subtle'
                    }`}
                  >
                    {tmCount} trademark{tmCount === 1 ? '' : 's'}
                  </span>
                  <span
                    className={`px-2 py-1 rounded font-bold uppercase tracking-wider ${
                      ptCount > 0 ? 'bg-gr-warning/15 text-gr-warning' : 'bg-gr-raised text-gr-subtle'
                    }`}
                  >
                    {ptCount} patent{ptCount === 1 ? '' : 's'}
                  </span>
                  <span
                    className={`px-2 py-1 rounded font-bold uppercase tracking-wider ${
                      plCount > 0 ? 'bg-gr-success/15 text-gr-success' : 'bg-gr-raised text-gr-subtle'
                    }`}
                  >
                    {plCount} prelaunch
                  </span>
                </div>

                {/* Evidence accordion */}
                {isOpen && (
                  <div className="mt-5 space-y-5 border-t border-gr-border pt-5">
                    {tmCount > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
                          Trademarks
                        </div>
                        <ul className="space-y-2">
                          {leak.evidence.trademarks.map((tm, j) => (
                            <li key={`tm-${j}`} className="text-sm flex flex-wrap gap-x-3 gap-y-1">
                              <span className="font-bold text-gr-text">{tm.mark_text || 'unnamed'}</span>
                              <span className="text-gr-muted tabular-nums">{fmtDate(tm.filing_date)}</span>
                              {tm.status && <span className="text-gr-subtle">{tm.status}</span>}
                              {tm.serial_number && (
                                <span className="text-gr-subtle tabular-nums">#{tm.serial_number}</span>
                              )}
                              {tm.source_url && (
                                <a
                                  href={tm.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gr-accent hover:underline"
                                >
                                  source
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ptCount > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
                          Patents
                        </div>
                        <ul className="space-y-2">
                          {leak.evidence.patents.map((pt, j) => (
                            <li key={`pt-${j}`} className="text-sm flex flex-wrap gap-x-3 gap-y-1">
                              <span className="font-bold text-gr-text">{pt.title || 'untitled'}</span>
                              <span className="text-gr-muted tabular-nums">
                                {fmtDate(pt.publication_date || pt.filing_date)}
                              </span>
                              {pt.patent_number && (
                                <span className="text-gr-subtle tabular-nums">#{pt.patent_number}</span>
                              )}
                              {pt.source_url && (
                                <a
                                  href={pt.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gr-accent hover:underline"
                                >
                                  source
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plCount > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
                          Prelaunch terms
                        </div>
                        <ul className="space-y-2">
                          {leak.evidence.prelaunch_signals.map((pl, j) => (
                            <li key={`pl-${j}`} className="text-sm flex flex-wrap gap-x-3 gap-y-1">
                              <span className="font-bold text-gr-text">{pl.signal_value || '-'}</span>
                              <span className="text-gr-muted tabular-nums">
                                first seen {fmtDate(pl.first_seen)}
                              </span>
                              {pl.signal_type && (
                                <span className="text-gr-subtle">{pl.signal_type.replace(/_/g, ' ')}</span>
                              )}
                              {pl.url && (
                                <a
                                  href={pl.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gr-accent hover:underline"
                                >
                                  source
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Cross-check links */}
                <div className="mt-5 flex flex-wrap gap-3 text-[11px] uppercase tracking-wider font-bold">
                  <span className="text-gr-subtle">Cross-check with</span>
                  <Link
                    href={`/trademarks?brand=${leak.brand_slug}`}
                    className="text-gr-accent hover:underline"
                  >
                    Trademarks
                  </Link>
                  <span className="text-gr-border">&middot;</span>
                  <Link
                    href={`/patents?brand=${leak.brand_slug}`}
                    className="text-gr-accent hover:underline"
                  >
                    Patents
                  </Link>
                  <span className="text-gr-border">&middot;</span>
                  <Link
                    href={`/prelaunch-radar?brand=${leak.brand_slug}`}
                    className="text-gr-accent hover:underline"
                  >
                    Prelaunch radar
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Single-signal footer */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-7 space-y-3">
        <h2 className="text-base font-bold text-gr-text tracking-tight">
          Single-signal events
        </h2>
        <p className="text-sm text-gr-muted leading-relaxed">
          {data.single_signal_count} signal{data.single_signal_count === 1 ? '' : 's'} in the
          window did not fuse with anything else. They are still individually visible:
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/trademarks"
            className="px-3 py-1.5 rounded font-bold uppercase tracking-wider text-[11px] bg-gr-bg text-gr-text hover:bg-gr-raised border border-gr-border transition"
          >
            Trademarks ({data.counts?.trademarks_90d ?? 0})
          </Link>
          <Link
            href="/patents"
            className="px-3 py-1.5 rounded font-bold uppercase tracking-wider text-[11px] bg-gr-bg text-gr-text hover:bg-gr-raised border border-gr-border transition"
          >
            Patents ({data.counts?.patents_365d ?? 0})
          </Link>
          <Link
            href="/prelaunch-radar"
            className="px-3 py-1.5 rounded font-bold uppercase tracking-wider text-[11px] bg-gr-bg text-gr-text hover:bg-gr-raised border border-gr-border transition"
          >
            Prelaunch radar ({data.counts?.prelaunch_90d ?? 0})
          </Link>
        </div>
      </section>

      <div className="text-xs text-gr-subtle leading-relaxed max-w-3xl">
        Fusion is keyword-overlap, not semantic similarity. A trademark "FLEX KNEE" will fuse with
        a prelaunch term "knee compression" on the shared "knee" token. That is the intended
        behavior at this layer; semantic clustering happens upstream in the per-feed pages. Stop
        words and brand names are excluded so they cannot drive a false fusion. Built from{' '}
        <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.trademarks</code>,{' '}
        <code className="bg-gr-bg px-1.5 py-0.5 rounded">patents</code>, and{' '}
        <code className="bg-gr-bg px-1.5 py-0.5 rounded">prelaunch_signals</code>.
      </div>
    </div>
  );
}
