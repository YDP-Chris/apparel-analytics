'use client';

/**
 * /usage — dashboard usage analytics for the team to see what's actually used.
 *
 * Per the hardened Plan agent spec: top pages, event mix, daily activity.
 * Distinct-actor counting via submitter_token_hash (no PII). Visible to
 * the whole team — transparency about what we measure builds trust.
 *
 * "Yesterday fallback": if no events captured today yet (e.g. first
 * thing in the morning before anyone's logged in), the summary endpoint
 * already returns trailing 30 days — but the daily activity chart will
 * show 0 events for today. We highlight the most recent day with data
 * so the eye lands there.
 */

import { useEffect, useState } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface TopPage { path: string; views: number; distinct_actors: number; last_view: string }
interface EventMix { event_kind: string; count: number; distinct_actors: number }
interface DailyActivity { day: string; page_views: number; submits: number; distinct_actors: number; total_events: number }

interface Summary {
  available: boolean;
  top_pages: TopPage[];
  event_mix: EventMix[];
  daily_activity: DailyActivity[];
  total_events_all_time: number;
}

function fmtDate(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return d; }
}

export default function UsagePage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); return; }
    fetch(`${PULSE_API}/pulse/usage/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;
  if (!data.available || data.total_events_all_time === 0) {
    return (
      <div className="space-y-10">
        <header className="pb-2">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">Usage</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">What the team uses</h1>
        </header>
        <section className="bg-gr-surface border border-gr-border rounded-md p-10 text-center">
          <p className="text-gr-muted">Collecting events. First data lands within minutes of the next page navigation.</p>
        </section>
      </div>
    );
  }

  // Find the most recent day with data — used to label "current state" vs "today's
  // not in yet". Plan-agent's "fall back to yesterday if today is empty" pattern.
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayRow = data.daily_activity.find((d) => d.day === todayIso);
  const showsTodayData = todayRow && todayRow.total_events > 0;
  const latestDay = data.daily_activity[0]?.day;

  const maxDaily = Math.max(...data.daily_activity.map((d) => d.total_events), 1);
  const maxPageViews = data.top_pages[0]?.views || 1;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">Usage</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">What the team uses</h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Page views, event counts, and active days across the dashboard.
          Anonymous by design — we count distinct actors via hashed tokens, never tied to identity.
          Use this to decide what to invest in next, not who&apos;s reading what.
        </p>
        {!showsTodayData && latestDay && (
          <p className="mt-3 text-xs text-gr-subtle">
            No activity captured yet today — most recent data is from <span className="text-gr-text font-semibold">{fmtDate(latestDay)}</span>.
          </p>
        )}
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '30-day events', value: data.daily_activity.reduce((s, d) => s + d.total_events, 0) },
          { label: '30-day page views', value: data.daily_activity.reduce((s, d) => s + d.page_views, 0) },
          { label: '30-day submits', value: data.daily_activity.reduce((s, d) => s + d.submits, 0) },
          { label: 'Distinct days w/ data', value: data.daily_activity.filter((d) => d.total_events > 0).length },
        ].map((s) => (
          <div key={s.label} className="bg-gr-surface border border-gr-border rounded-md p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">{s.label}</p>
            <p className="text-3xl font-bold text-gr-text mt-1 tabular-nums">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <h2 className="text-2xl font-bold text-gr-text tracking-tight mb-1">Top pages (30 days)</h2>
        <p className="text-sm text-gr-muted mb-5">By total page views.</p>
        <div className="space-y-2">
          {data.top_pages.slice(0, 20).map((p) => {
            const width = (p.views / maxPageViews) * 100;
            return (
              <div key={p.path} className="grid grid-cols-[1fr_60px_30px] items-center gap-3 text-sm">
                <a href={p.path} className="text-gr-text hover:text-gr-accent font-mono truncate" title={`Last viewed ${fmtDate(p.last_view.slice(0, 10))}`}>
                  {p.path}
                </a>
                <div className="relative h-5 bg-gr-bg rounded">
                  <div className="absolute inset-y-0 left-0 bg-gr-accent-soft rounded" style={{ width: `${width}%` }} />
                </div>
                <span className="text-gr-muted tabular-nums text-right">{p.views}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        <div className="bg-gr-surface border border-gr-border rounded-md p-6">
          <h2 className="text-2xl font-bold text-gr-text tracking-tight mb-1">Event mix</h2>
          <p className="text-sm text-gr-muted mb-5">What kinds of events fire most.</p>
          <div className="space-y-2">
            {data.event_mix.map((e) => (
              <div key={e.event_kind} className="flex items-baseline justify-between text-sm">
                <span className="text-gr-text font-mono">{e.event_kind}</span>
                <span className="text-gr-muted tabular-nums">{e.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gr-surface border border-gr-border rounded-md p-6">
          <h2 className="text-2xl font-bold text-gr-text tracking-tight mb-1">Daily activity (30d)</h2>
          <p className="text-sm text-gr-muted mb-5">Each bar is one day&apos;s event volume.</p>
          <div className="flex items-end gap-1 h-32">
            {data.daily_activity.slice().reverse().map((d) => {
              const h = (d.total_events / maxDaily) * 100;
              const isToday = d.day === todayIso;
              return (
                <div
                  key={d.day}
                  className={`flex-1 rounded-sm ${isToday ? 'bg-gr-accent' : 'bg-gr-accent-soft'}`}
                  style={{ height: `${Math.max(h, d.total_events > 0 ? 4 : 1)}%` }}
                  title={`${fmtDate(d.day)}: ${d.total_events} events, ${d.distinct_actors} actors`}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="text-xs text-gr-subtle">
        <p>
          Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_usage.events</code> ·
          180-day retention on raw events · cached 60s · anonymous counting via hashed tokens.
        </p>
      </section>
    </div>
  );
}
