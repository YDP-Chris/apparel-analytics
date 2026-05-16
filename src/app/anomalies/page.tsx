'use client';

/**
 * /anomalies - cross-cutting anomaly watch.
 *
 * Reads from /pulse/anomalies (gymreapers_competitive.anomalies). Surfaces
 * every brand-metric that moved 25%+ vs its trailing 14-day mean. Severity
 * ordered, click-to-expand evidence stack, dismiss + annotate per row,
 * 7-day count chart at the bottom.
 *
 * Auth: requires ydp_pulse_token (same as every other authed page).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { Annotations } from '@/components/Annotations';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface AnomalyRow {
  id: number;
  detected_date: string;
  brand_slug: string;
  metric_key: string;
  metric_label: string;
  current_value: number | null;
  baseline_value: number | null;
  delta_absolute: number | null;
  delta_pct: number | null;
  direction: 'up' | 'down';
  severity: Severity;
  baseline_method: string | null;
  trigger_threshold: number | null;
  evidence_payload: Record<string, unknown> | null;
  alerted_at: string | null;
  dismissed_at: string | null;
  reviewed_by: string | null;
  computed_at: string | null;
}

interface HistoryDay {
  date: string;
  count: number;
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

interface AnomaliesPayload {
  available: boolean;
  detected_date: string | null;
  today_anomalies: AnomalyRow[];
  summary: {
    today_count: number;
    by_severity: Record<Severity, number>;
    by_brand: Record<string, number>;
    by_metric: Record<string, number>;
  };
  history_7d: HistoryDay[];
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

const SEVERITY_STYLES: Record<Severity, { pill: string; bar: string; label: string }> = {
  critical: { pill: 'bg-gr-danger/25 text-gr-danger', bar: 'bg-gr-danger', label: 'CRITICAL' },
  high:     { pill: 'bg-orange-500/25 text-orange-300', bar: 'bg-orange-400', label: 'HIGH' },
  medium:   { pill: 'bg-gr-accent-soft text-gr-accent', bar: 'bg-gr-accent', label: 'MEDIUM' },
  low:      { pill: 'bg-gr-raised text-gr-muted', bar: 'bg-gr-muted', label: 'LOW' },
};

function brandLabel(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtValue(v: number | null | undefined, unit?: string): string {
  if (v == null || isNaN(v)) return '-';
  if (unit === 'pct') return `${v.toFixed(1)}%`;
  if (unit === 'stars') return `${v.toFixed(2)}`;
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(2);
}

function fmtDelta(d: number | null | undefined): string {
  if (d == null || isNaN(d)) return 'baseline ~0';
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(0)}%`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function deltaMagnitudeBarWidth(d: number | null | undefined): number {
  if (d == null || isNaN(d)) return 100;
  const mag = Math.min(Math.abs(d), 200);
  return Math.max(8, Math.round((mag / 200) * 100));
}

function AnomalyCard({ row, expanded, onToggle, onDismiss }: {
  row: AnomalyRow;
  expanded: boolean;
  onToggle: () => void;
  onDismiss: (id: number) => void;
}) {
  const sev = SEVERITY_STYLES[row.severity];
  const unit = (row.evidence_payload?.unit as string | undefined) || undefined;
  const isUp = row.direction === 'up';
  const arrow = isUp ? "↑" : "↓";
  const barWidth = deltaMagnitudeBarWidth(row.delta_pct);
  const dismissed = !!row.dismissed_at;

  return (
    <article
      className={`rounded-lg border bg-gr-card transition ${
        dismissed
          ? 'border-gr-border/40 opacity-60'
          : 'border-gr-border hover:border-gr-accent/40'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 space-y-2"
      >
        <header className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gr-text">{brandLabel(row.brand_slug)}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${sev.pill}`}>
              {sev.label}
            </span>
            {dismissed && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gr-border/40 text-gr-subtle">
                Dismissed
              </span>
            )}
          </div>
          <span
            className={`text-2xl font-extrabold tabular-nums ${
              isUp ? 'text-gr-success' : 'text-gr-danger'
            }`}
          >
            {arrow} {fmtDelta(row.delta_pct)}
          </span>
        </header>

        <p className="text-sm text-gr-muted leading-snug">
          <span className="font-semibold text-gr-text">{row.metric_label}</span>
          {": "}
          <span className="tabular-nums">{fmtValue(row.current_value, unit)}</span>
          {" today vs baseline "}
          <span className="tabular-nums">{fmtValue(row.baseline_value, unit)}</span>
        </p>

        <div className="h-1.5 w-full rounded-full bg-gr-bg overflow-hidden">
          <div
            className={`h-full ${sev.bar}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gr-border/60 p-4 space-y-3 bg-gr-bg/40">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-1">
              Evidence stack
            </p>
            <dl className="text-xs grid grid-cols-2 gap-x-4 gap-y-1.5 text-gr-muted">
              <div className="contents">
                <dt className="font-semibold">Direction</dt>
                <dd className="text-gr-text capitalize">{row.direction}</dd>
              </div>
              <div className="contents">
                <dt className="font-semibold">Trigger</dt>
                <dd className="text-gr-text tabular-nums">
                  {row.trigger_threshold ? `${row.trigger_threshold}%` : '-'}
                </dd>
              </div>
              <div className="contents">
                <dt className="font-semibold">Baseline method</dt>
                <dd className="text-gr-text">{row.baseline_method || '-'}</dd>
              </div>
              <div className="contents">
                <dt className="font-semibold">Detected</dt>
                <dd className="text-gr-text">{fmtDate(row.detected_date)}</dd>
              </div>
              <div className="contents">
                <dt className="font-semibold">Delta (abs)</dt>
                <dd className="text-gr-text tabular-nums">
                  {row.delta_absolute != null ? row.delta_absolute.toFixed(2) : '-'}
                </dd>
              </div>
              <div className="contents">
                <dt className="font-semibold">Alerted</dt>
                <dd className="text-gr-text">{row.alerted_at ? 'yes' : 'no'}</dd>
              </div>
            </dl>
          </div>

          {row.evidence_payload && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gr-accent font-semibold uppercase tracking-wider text-[10px]">
                Raw evidence payload
              </summary>
              <pre className="mt-2 p-2 bg-gr-bg rounded text-[11px] text-gr-muted overflow-x-auto">
                {JSON.stringify(row.evidence_payload, null, 2)}
              </pre>
            </details>
          )}

          <div className="flex gap-2 pt-2">
            {!dismissed && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDismiss(row.id); }}
                className="text-xs font-semibold px-3 py-1.5 rounded border border-gr-border text-gr-muted hover:text-gr-text hover:border-gr-accent/60 transition"
              >
                Dismiss
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-gr-border/60">
            <Annotations
              entityKind="anomaly"
              entityKey={`${row.brand_slug}|${row.metric_key}|${row.detected_date}`}
              entityLabel={`${brandLabel(row.brand_slug)} - ${row.metric_label}`}
            />
          </div>
        </div>
      )}
    </article>
  );
}

function HistoryChart({ history }: { history: HistoryDay[] }) {
  const sorted = useMemo(
    () => [...history].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [history],
  );
  if (!sorted.length) {
    return (
      <p className="text-sm text-gr-subtle">No 7-day history available yet.</p>
    );
  }
  const max = Math.max(1, ...sorted.map((d) => d.count));
  return (
    <div className="flex items-end gap-2 h-32">
      {sorted.map((d) => {
        const h = Math.max(4, Math.round((d.count / max) * 100));
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-gr-bg rounded-t flex items-end" style={{ height: '100%' }}>
              <div
                className="w-full bg-gr-accent/70 rounded-t transition-all"
                style={{ height: `${h}%` }}
                title={`${d.date}: ${d.count} anomalies`}
              />
            </div>
            <span className="text-[10px] text-gr-subtle tabular-nums">{d.count}</span>
            <span className="text-[10px] text-gr-muted">{fmtDate(d.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnomaliesPage() {
  const [data, setData] = useState<AnomaliesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sevFilter, setSevFilter] = useState<Set<Severity>>(new Set());
  const [brandFilter, setBrandFilter] = useState<Set<string>>(new Set());
  const [metricFilter, setMetricFilter] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const token = typeof window !== 'undefined'
      ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${PULSE_API}/pulse/anomalies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      const j: AnomaliesPayload = await r.json();
      setData(j);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dismiss = useCallback((id: number) => {
    setDismissedIds((s) => new Set(s).add(id));
    trackEvent('click', { label: 'anomaly_dismiss', metadata: { anomaly_id: id } });
  }, []);

  const allRows = data?.today_anomalies || [];
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (sevFilter.size && !sevFilter.has(r.severity)) return false;
      if (brandFilter.size && !brandFilter.has(r.brand_slug)) return false;
      if (metricFilter.size && !metricFilter.has(r.metric_key)) return false;
      return true;
    });
  }, [allRows, sevFilter, brandFilter, metricFilter]);

  const summary = data?.summary;
  const byBrand = summary?.by_brand || {};
  const byMetric = summary?.by_metric || {};
  const bySeverity = summary?.by_severity || { critical: 0, high: 0, medium: 0, low: 0 };

  const allBrands = useMemo(
    () => Object.keys(byBrand).sort((a, b) => (byBrand[b] || 0) - (byBrand[a] || 0)),
    [byBrand],
  );
  const allMetrics = useMemo(
    () => Object.keys(byMetric).sort((a, b) => (byMetric[b] || 0) - (byMetric[a] || 0)),
    [byMetric],
  );

  const topBrand = allBrands[0] || null;
  const topMetric = allMetrics[0] || null;
  const criticalHigh = (bySeverity.critical || 0) + (bySeverity.high || 0);

  const toggleSev = (s: Severity) => {
    setSevFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };
  const toggleBrand = (b: string) => {
    setBrandFilter((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  };
  const toggleMetric = (m: string) => {
    setMetricFilter((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  if (loading) {
    return <div className="text-center py-20 text-gr-subtle">Loading anomaly watch...</div>;
  }
  if (error) {
    return <div className="text-center py-20 text-gr-danger">{error}</div>;
  }
  if (!data || !data.available) {
    return <div className="text-center py-20 text-gr-subtle">Anomaly watch unavailable.</div>;
  }

  return (
    <div className="space-y-10">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Cross-cutting &middot; Anomaly Watch
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gr-text mb-2">
          Where the data broke its own trend
        </h1>
        <p className="text-gr-muted leading-relaxed max-w-3xl">
          Daily scan of every time-series metric across the competitive set. Anything moving 25%+
          vs trailing 14-day average gets flagged. Sorted by severity. Click any anomaly for the
          evidence stack.
        </p>
        {data.detected_date && (
          <p className="mt-3 text-xs text-gr-subtle">
            Detected on{' '}
            <span className="font-semibold text-gr-text">{fmtDate(data.detected_date)}</span>
          </p>
        )}
      </header>

      <SectionExplainer
        what="Every metric the agents track gets compared to its own trailing 14-day mean each morning. Anything 25%+ off baseline becomes an anomaly. Severity scales with the magnitude of the move."
        howToRead="Cards are sorted critical first, then by absolute delta. Up arrow + green = metric jumped; down + red = metric collapsed. Click a card to see the evidence stack and the trailing sample values."
        whatToDo="Lead with critical and high. Dismiss anything you have already chased. Annotate the row with your read - that note attaches to the (brand, metric, date) triple so it surfaces next time this metric spikes."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-gr-border bg-gr-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gr-subtle">Today</p>
          <p className="text-3xl font-extrabold text-gr-text tabular-nums mt-1">{summary?.today_count ?? 0}</p>
          <p className="text-[11px] text-gr-muted mt-1">anomalies flagged</p>
        </div>
        <div className="rounded-lg border border-gr-border bg-gr-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gr-subtle">Critical + High</p>
          <p className="text-3xl font-extrabold text-gr-danger tabular-nums mt-1">{criticalHigh}</p>
          <p className="text-[11px] text-gr-muted mt-1">need eyes today</p>
        </div>
        <div className="rounded-lg border border-gr-border bg-gr-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gr-subtle">Top brand</p>
          <p className="text-xl font-extrabold text-gr-text mt-1">
            {topBrand ? brandLabel(topBrand) : '-'}
          </p>
          <p className="text-[11px] text-gr-muted mt-1">
            {topBrand ? `${byBrand[topBrand]} anomalies` : 'no brand stood out'}
          </p>
        </div>
        <div className="rounded-lg border border-gr-border bg-gr-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gr-subtle">Top metric</p>
          <p className="text-xl font-extrabold text-gr-text mt-1">
            {topMetric || '-'}
          </p>
          <p className="text-[11px] text-gr-muted mt-1">
            {topMetric ? `${byMetric[topMetric]} brands flagged` : 'spread evenly across metrics'}
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gr-subtle">Severity</p>
          <div className="flex gap-1.5 flex-wrap">
            {SEVERITY_ORDER.map((s) => {
              const active = sevFilter.has(s);
              const count = bySeverity[s] || 0;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSev(s)}
                  className={`text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded transition ${
                    active
                      ? SEVERITY_STYLES[s].pill
                      : 'bg-gr-raised text-gr-muted hover:text-gr-text'
                  }`}
                >
                  {SEVERITY_STYLES[s].label} <span className="tabular-nums opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
        {allBrands.length > 0 && (
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gr-subtle">Brand</p>
            <div className="flex gap-1.5 flex-wrap">
              {allBrands.map((b) => {
                const active = brandFilter.has(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBrand(b)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded transition ${
                      active
                        ? 'bg-gr-accent-soft text-gr-accent'
                        : 'bg-gr-raised text-gr-muted hover:text-gr-text'
                    }`}
                  >
                    {brandLabel(b)} <span className="tabular-nums opacity-70">({byBrand[b]})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {allMetrics.length > 0 && (
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gr-subtle">Metric</p>
            <div className="flex gap-1.5 flex-wrap">
              {allMetrics.map((m) => {
                const active = metricFilter.has(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMetric(m)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded transition ${
                      active
                        ? 'bg-gr-accent-soft text-gr-accent'
                        : 'bg-gr-raised text-gr-muted hover:text-gr-text'
                    }`}
                  >
                    {m} <span className="tabular-nums opacity-70">({byMetric[m]})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Anomaly list */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gr-text">
          Today&apos;s anomalies
          <span className="ml-2 text-sm font-normal text-gr-subtle tabular-nums">
            ({filteredRows.length} of {allRows.length})
          </span>
        </h2>
        {filteredRows.length === 0 ? (
          <div className="rounded-lg border border-gr-border bg-gr-card p-6 text-sm text-gr-subtle">
            {allRows.length === 0
              ? "No anomalies flagged today. Either every metric is within 25% of its baseline, or trailing history is still building (each metric needs at least 3 prior days)."
              : "No anomalies match the current filters."}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRows.map((row) => (
              <AnomalyCard
                key={row.id}
                row={{
                  ...row,
                  dismissed_at: dismissedIds.has(row.id) ? new Date().toISOString() : row.dismissed_at,
                }}
                expanded={expandedId === row.id}
                onToggle={() => {
                  const next = expandedId === row.id ? null : row.id;
                  setExpandedId(next);
                  if (next != null) {
                    trackEvent('click', { label: 'anomaly_expand', metadata: { anomaly_id: row.id, brand: row.brand_slug, metric: row.metric_key } });
                  }
                }}
                onDismiss={dismiss}
              />
            ))}
          </div>
        )}
      </section>

      {/* 7-day history */}
      <section className="rounded-lg border border-gr-border bg-gr-card p-5 space-y-3">
        <header>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gr-subtle">7-day history</p>
          <h2 className="text-lg font-bold text-gr-text">Anomaly volume by day</h2>
        </header>
        <HistoryChart history={data.history_7d || []} />
      </section>
    </div>
  );
}
