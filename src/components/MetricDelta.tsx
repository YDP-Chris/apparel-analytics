'use client';

/**
 * Inline absolute + percent change vs the prior reference window (default:
 * last week). Renders next to any KPI/insight number across the dashboard.
 *
 * Usage:
 *   <MetricDelta current={423} previous={387} />
 *   -> "+36 / +9.3% vs LW"
 *
 *   <MetricDelta current={7} previous={null} />
 *   -> "no LW data yet"  (graceful fallback while history accumulates)
 *
 *   <MetricDelta current={50} previous={0} unit="SKUs" />
 *   -> "+50 SKUs / NEW vs LW"
 *
 * Color semantics: positive deltas in gr-success, negative in gr-danger,
 * zero/no-change in gr-muted. Override via invertColors when "down is good"
 * (e.g. tracking a deficit, where a smaller number = more progress).
 */

import { trackEvent } from '@/lib/usage';

interface MetricDeltaProps {
  current: number | null | undefined;
  previous: number | null | undefined;
  /** Period label for the tooltip + suffix. Default "LW". */
  label?: string;
  /** Suffix unit shown next to the absolute delta (e.g. "SKUs", "%"). */
  unit?: string;
  /** When true: positive deltas render as bad (red), negative as good (green).
   *  Use for metrics where "down is the goal" - e.g. gap deficit. */
  invertColors?: boolean;
  /** When set, omit when both current and previous are missing (don't render placeholder). */
  hideWhenEmpty?: boolean;
  /** Compact mode squashes to "+36 (+9.3%)" with no "vs LW" tail. */
  compact?: boolean;
  /** Additional className for the wrapper span. */
  className?: string;
}

function fmtPct(pct: number): string {
  if (!isFinite(pct)) return 'NEW';
  const sign = pct > 0 ? '+' : '';
  if (Math.abs(pct) < 0.05) return '0.0%';
  return `${sign}${pct.toFixed(1)}%`;
}

function fmtAbs(n: number, unit?: string): string {
  const sign = n > 0 ? '+' : '';
  const body = Number.isInteger(n) ? `${sign}${n}` : `${sign}${n.toFixed(1)}`;
  return unit ? `${body} ${unit}` : body;
}

export function MetricDelta({
  current,
  previous,
  label = 'LW',
  unit,
  invertColors = false,
  hideWhenEmpty = false,
  compact = false,
  className = '',
}: MetricDeltaProps) {
  const hasCurrent = current !== null && current !== undefined && Number.isFinite(current);
  const hasPrev = previous !== null && previous !== undefined && Number.isFinite(previous);

  if (!hasPrev) {
    if (hideWhenEmpty) return null;
    return (
      <span
        className={`inline-flex items-baseline text-[10px] text-gr-subtle italic ${className}`}
        title="No prior-week snapshot yet. The metric will start showing deltas once the agent has captured 7+ days of history."
      >
        no {label} data yet
      </span>
    );
  }

  if (!hasCurrent) {
    if (hideWhenEmpty) return null;
    return (
      <span className={`inline-flex items-baseline text-[10px] text-gr-subtle italic ${className}`}>
        current missing
      </span>
    );
  }

  const cur = current as number;
  const prev = previous as number;
  const absDelta = cur - prev;
  let pct: number;
  if (prev === 0) {
    pct = cur === 0 ? 0 : Infinity;  // NEW from a zero baseline
  } else {
    pct = (absDelta / Math.abs(prev)) * 100;
  }

  let polarityClass: string;
  if (Math.abs(absDelta) < 0.01) {
    polarityClass = 'text-gr-muted';
  } else if ((absDelta > 0) !== invertColors) {
    polarityClass = 'text-gr-success';
  } else {
    polarityClass = 'text-gr-danger';
  }

  const tooltip = `vs ${label}: ${fmtAbs(absDelta, unit)} (${fmtPct(pct)}) - prior ${prev}, current ${cur}`;
  const onShow = () => {
    trackEvent('hover', { label: 'metric_delta', metadata: { sign: absDelta > 0 ? 'up' : absDelta < 0 ? 'down' : 'flat' } });
  };

  return (
    <span
      className={`inline-flex items-baseline gap-1 text-[10px] font-semibold tabular-nums ${polarityClass} ${className}`}
      title={tooltip}
      onMouseEnter={onShow}
    >
      <span>{fmtAbs(absDelta, unit)}</span>
      <span className="text-[9px] opacity-80">/ {fmtPct(pct)}</span>
      {!compact && <span className="text-[9px] text-gr-subtle font-normal not-italic"> vs {label}</span>}
    </span>
  );
}
