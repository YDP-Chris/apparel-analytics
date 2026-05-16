'use client';

/**
 * /usage — dashboard usage analytics for the team to see what's actually used.
 *
 * Default view: top pages + event mix + daily activity. Visible to whole team.
 * Drill-in view: `/usage?admin=1` shows the raw events firehose. Undocumented
 * (Plan-agent's "discoverable not promoted" guidance).
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

interface FirehoseRow {
  id: number;
  event_kind: string;
  path: string | null;
  route_template: string | null;
  label: string | null;
  metadata: Record<string, unknown> | null;
  submitter: string | null;
  submitter_token_hash: string | null;
  occurred_at: string;
  duration_ms: number | null;
  status_code: number | null;
}

function FirehoseView() {
  const [rows, setRows] = useState<FirehoseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); return; }
    const params = new URLSearchParams({ limit: '200' });
    if (kindFilter) params.set('kind', kindFilter);
    fetch(`${PULSE_API}/pulse/usage/firehose?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => setRows(j.items || []))
      .catch((e) => setError(String(e)));
  }, [kindFilter, refresh]);

  return (
    <div className="space-y-6">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">Usage · Firehose</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">Raw event stream</h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Latest 200 events from <code className="bg-gr-bg px-1.5 py-0.5 rounded text-sm">gymreapers_usage.events</code>.
          For drill-in only — return to <a href="/usage" className="text-gr-accent hover:underline">/usage</a> for the team view.
        </p>
      </header>

      <div className="bg-gr-surface border border-gr-border rounded-md p-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-gr-subtle uppercase tracking-wider font-bold mr-2">Filter kind:</span>
        {['', 'page_view', 'api_hit', 'submit', 'click', 'expand', 'search', 'outbound', 'error'].map((k) => (
          <button
            key={k || 'all'}
            onClick={() => setKindFilter(k)}
            className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider transition ${
              kindFilter === k ? 'bg-gr-accent text-gr-text' : 'bg-gr-bg text-gr-muted hover:text-gr-text'
            }`}
          >
            {k || 'all'}
          </button>
        ))}
        <button
          onClick={() => setRefresh((n) => n + 1)}
          className="ml-auto px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-gr-raised text-gr-muted hover:text-gr-text"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-gr-danger">{error}</p>}

      <section className="bg-gr-surface border border-gr-border rounded-md overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-gr-border text-left">
              <th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-gr-subtle">When</th>
              <th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-gr-subtle">Kind</th>
              <th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-gr-subtle">Path</th>
              <th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-gr-subtle">Label</th>
              <th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-gr-subtle">Actor</th>
              <th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-gr-subtle">Meta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gr-border/60 last:border-0 hover:bg-gr-bg/40">
                <td className="px-3 py-1.5 text-gr-subtle whitespace-nowrap">{r.occurred_at.slice(11, 19)}</td>
                <td className="px-3 py-1.5 text-gr-accent">{r.event_kind}</td>
                <td className="px-3 py-1.5 text-gr-text truncate max-w-[200px]">{r.route_template || r.path || '—'}</td>
                <td className="px-3 py-1.5 text-gr-muted truncate max-w-[200px]">{r.label || '—'}</td>
                <td className="px-3 py-1.5 text-gr-subtle">{r.submitter || r.submitter_token_hash?.slice(0, 6) || '—'}</td>
                <td className="px-3 py-1.5 text-gr-subtle truncate max-w-[200px]">
                  {r.metadata && Object.keys(r.metadata).length > 0 ? JSON.stringify(r.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-gr-subtle">
        {rows.length} events shown. Filter by kind to drill in. This view is undocumented in nav and intended for analyst troubleshooting only.
      </p>
    </div>
  );
}

function UsagePageInner() {
  const params = useSearchParams();
  const isAdmin = params.get('admin') === '1';

  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) return;
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); return; }
    fetch(`${PULSE_API}/pulse/usage/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [isAdmin]);

  if (isAdmin) return <FirehoseView />;

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

export default function UsagePage() {
  // Suspense wrap required by Next 15's useSearchParams in client components.
  return (
    <Suspense fallback={<div className="text-center py-20 text-gr-subtle">Loading…</div>}>
      <UsagePageInner />
    </Suspense>
  );
}
