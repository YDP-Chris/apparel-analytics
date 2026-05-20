'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

type RunStatus = 'SUCCESS' | 'FAIL' | 'HEALED' | string;

interface ScheduledAgent {
  name: string;
  scheduled: string;
  last_run_status: RunStatus | null;
  last_run_at: string | null;
  last_run_duration_s: number;
  avg_duration_24h: number;
  failures_24h: number;
  stale: boolean;
}

interface TodayRun {
  agent: string;
  timestamp: string;
  status: RunStatus;
  duration_s: number;
}

interface RecentFailure {
  agent: string;
  timestamp: string;
  duration_s: number;
  healed_after: boolean;
}

interface CronHealthPayload {
  available: boolean;
  as_of: string;
  log_exists: boolean;
  today_summary: {
    total_runs: number;
    success: number;
    fail: number;
    healed: number;
    agents_run_today: string[];
    agents_missing_today: string[];
  };
  scheduled_agents: ScheduledAgent[];
  recent_failures: RecentFailure[];
  todays_runs: TodayRun[];
  log_tail: string[];
  filters_applied: { agent: string | null };
  error?: string;
}

// Only show agents that feed this apparel-analytics site. Everything else
// (ValleySomm, Masonic, Memex, Crop Circles, Gmail, etc.) shares the same
// /mnt/data/agents/cron-healer/logs/health.log but is out of scope here.
const APPAREL_AGENT_PATTERNS: RegExp[] = [
  /^amazon-/,
  /^apparel-/,
  /^anomaly-detector$/,
  /^brand-mix-analyzer$/,
  /^brief-analyzer$/,
  /^category-trends$/,
  /^compintel-/,
  /^creator-monitor$/,
  /^daily-intel-digest$/,
  /^data-qa$/,
  /^dtc-reviews$/,
  /^fb-ad-library$/,
  /^gymreapers-/,
  /^launch-calendar$/,
  /^patent-monitor$/,
  /^prelaunch-radar$/,
  /^promo-tracker$/,
  /^review-themes$/,
  /^sku-repositioner$/,
  /^tm-monitor$/,
  /^vuori-/,
];

function isApparelAgent(name: string): boolean {
  return APPAREL_AGENT_PATTERNS.some((p) => p.test(name));
}

function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (isNaN(ms)) return iso;
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return iso || 'never';
  }
}

function fmtDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function statusPillClass(status: RunStatus | null | undefined): string {
  if (status === 'SUCCESS') return 'bg-gr-success/15 text-gr-success';
  if (status === 'HEALED') return 'bg-gr-warning/15 text-gr-warning';
  if (status === 'FAIL') return 'bg-gr-danger/15 text-gr-danger';
  return 'bg-gr-raised text-gr-subtle';
}

function statusChipBg(status: RunStatus): string {
  if (status === 'SUCCESS') return 'bg-gr-success/60 hover:bg-gr-success/80';
  if (status === 'HEALED') return 'bg-gr-warning/60 hover:bg-gr-warning/80';
  if (status === 'FAIL') return 'bg-gr-danger/70 hover:bg-gr-danger/90';
  return 'bg-gr-raised hover:bg-gr-surface';
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function CronHealthPage() {
  const [data, setData] = useState<CronHealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<TodayRun | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in via /today first.');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${PULSE_API}/pulse/cron-health`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: CronHealthPayload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Narrow the payload to agents that feed this site before any UI math runs.
  const scopedData = useMemo<CronHealthPayload | null>(() => {
    if (!data) return null;
    const scheduled = data.scheduled_agents.filter((s) => isApparelAgent(s.name));
    const todays = data.todays_runs.filter((r) => isApparelAgent(r.agent));
    const fails = data.recent_failures.filter((f) => isApparelAgent(f.agent));
    const logTail = data.log_tail.filter((ln) => {
      const parts = ln.split('\t');
      const agent = parts[1] || '';
      return agent ? isApparelAgent(agent) : false;
    });
    const success = todays.filter((r) => r.status === 'SUCCESS').length;
    const fail = todays.filter((r) => r.status === 'FAIL').length;
    const healed = todays.filter((r) => r.status === 'HEALED').length;
    const agentsRunToday = Array.from(new Set(todays.map((r) => r.agent))).sort();
    const scheduledNames = new Set(scheduled.map((s) => s.name));
    const agentsMissingToday = data.today_summary.agents_missing_today.filter((n) =>
      scheduledNames.has(n),
    );
    return {
      ...data,
      scheduled_agents: scheduled,
      todays_runs: todays,
      recent_failures: fails,
      log_tail: logTail,
      today_summary: {
        total_runs: todays.length,
        success,
        fail,
        healed,
        agents_run_today: agentsRunToday,
        agents_missing_today: agentsMissingToday,
      },
    };
  }, [data]);

  const successRate = useMemo(() => {
    if (!scopedData) return 0;
    const t = scopedData.today_summary.total_runs;
    if (!t) return 0;
    return Math.round((scopedData.today_summary.success / t) * 1000) / 10;
  }, [scopedData]);

  const recentFailures24h = useMemo(() => {
    if (!scopedData) return 0;
    return scopedData.recent_failures.length;
  }, [scopedData]);

  const filteredScheduled = useMemo<ScheduledAgent[]>(() => {
    if (!scopedData) return [];
    if (!agentFilter) return scopedData.scheduled_agents;
    const f = agentFilter.toLowerCase();
    return scopedData.scheduled_agents.filter((s) => s.name.toLowerCase().includes(f));
  }, [scopedData, agentFilter]);

  const filteredLogTail = useMemo<string[]>(() => {
    if (!scopedData) return [];
    if (!agentFilter) return scopedData.log_tail;
    return scopedData.log_tail.filter((ln) => ln.includes(`\t${agentFilter}\t`) || ln.toLowerCase().includes(agentFilter.toLowerCase()));
  }, [scopedData, agentFilter]);

  const todaysRunsSorted = useMemo<TodayRun[]>(() => {
    if (!scopedData) return [];
    const arr = [...scopedData.todays_runs];
    arr.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    return arr;
  }, [scopedData]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading cron health...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data || !scopedData) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!scopedData.available || !scopedData.log_exists) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              Cross-cutting &middot; Operations
            </p>
            <ConfidenceBadge source="composite" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            Agent run health
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-gr-muted leading-relaxed">
            The central health log at
            <code className="mx-1 bg-gr-bg px-1.5 py-0.5 rounded">/mnt/data/agents/cron-healer/logs/health.log</code>
            is not present yet. Every cron-scheduled agent passes through the cron-healer wrapper, which writes to that file on each run.
          </p>
        </section>
      </div>
    );
  }

  const missingCount = scopedData.today_summary.agents_missing_today.length;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Cross-cutting &middot; Operations
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Agent run health
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Every cron-scheduled agent passes through the cron-healer wrapper. This page is scoped to the agents that feed this apparel-analytics site (competitive-intel, gymreapers, amazon, vuori, prelaunch, patents, trademarks, dtc-reviews and related jobs).
        </p>
        <p className="text-xs text-gr-subtle mt-2 tabular-nums">
          As of {scopedData.as_of} &middot; {scopedData.scheduled_agents.length} agents scheduled
        </p>
      </header>

      <SectionExplainer
        what="One row per cron-installed agent that runs under /mnt/data/agents/cron-healer/agent-runner.sh. The wrapper writes every execution to a central health.log with timestamp, agent name, status (SUCCESS / FAIL / HEALED), and duration."
        howToRead="Top KPIs are today only. The scheduled grid sorts by most-recent run. Stale = no run in the last 24 hours despite being in crontab. HEALED means the wrapper detected a FAIL and re-ran successfully under Claude self-repair."
        whatToDo="Investigate red tiles or stale chips first. A stale agent in cron with no log entry usually means cron did not fire or the wrapper itself crashed. Use the agent filter to pull a single agent's tail and compare durations."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Runs today</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{scopedData.today_summary.total_runs}</div>
          <div className="text-xs text-gr-muted mt-1 tabular-nums">
            {scopedData.today_summary.success} ok &middot; {scopedData.today_summary.healed} healed &middot; {scopedData.today_summary.fail} fail
          </div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Success rate today</div>
          <div className={`text-3xl font-bold tabular-nums ${successRate >= 99 ? 'text-gr-success' : successRate >= 95 ? 'text-gr-warning' : 'text-gr-danger'}`}>
            {successRate}%
          </div>
          <div className="text-xs text-gr-muted mt-1">first-try success / total</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Missing today</div>
          <div className={`text-3xl font-bold tabular-nums ${missingCount === 0 ? 'text-gr-success' : 'text-gr-danger'}`}>
            {missingCount}
          </div>
          <div className="text-xs text-gr-muted mt-1">scheduled but no run yet</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Failures 24h</div>
          <div className={`text-3xl font-bold tabular-nums ${recentFailures24h === 0 ? 'text-gr-success' : 'text-gr-danger'}`}>
            {recentFailures24h}
          </div>
          <div className="text-xs text-gr-muted mt-1">FAIL rows in the last day</div>
        </div>
      </section>

      {/* Agent filter */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Filter</span>
          <input
            type="text"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            placeholder="agent name contains..."
            className="px-3 py-1.5 rounded text-sm bg-gr-bg border border-gr-border text-gr-text placeholder-gr-subtle focus:outline-none focus:border-gr-accent w-64"
          />
          {agentFilter && (
            <button
              type="button"
              onClick={() => setAgentFilter('')}
              className="px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border border-gr-border text-gr-muted hover:text-gr-text"
            >
              Clear
            </button>
          )}
          <span className="text-xs text-gr-subtle ml-auto tabular-nums">
            {filteredScheduled.length} of {scopedData.scheduled_agents.length} agents shown
          </span>
        </div>
      </section>

      {/* Missing today callout */}
      {missingCount > 0 && (
        <section className="bg-gr-danger/5 rounded-md border border-gr-danger/40 p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-danger mb-2">
            Scheduled agents missing today ({missingCount})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scopedData.today_summary.agents_missing_today.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setAgentFilter(name)}
                className="px-2 py-0.5 rounded text-xs font-mono bg-gr-bg border border-gr-danger/30 text-gr-text hover:border-gr-danger"
              >
                {name}
              </button>
            ))}
          </div>
          <p className="text-xs text-gr-muted mt-3">
            These agents are in crontab but have not produced a health.log row since midnight. Some may not be due to run today (weekly / monthly schedules).
          </p>
        </section>
      )}

      {/* Scheduled agents grid */}
      <section>
        <h2 className="text-2xl font-bold text-gr-text mb-4">Scheduled agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredScheduled.map((s) => (
            <div
              key={s.name}
              className={`bg-gr-surface rounded-md border p-4 ${
                s.last_run_status === 'FAIL'
                  ? 'border-gr-danger/50'
                  : s.stale
                  ? 'border-gr-warning/50'
                  : 'border-gr-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAgentFilter(s.name)}
                  className="text-sm font-mono font-semibold text-gr-text hover:text-gr-accent break-all text-left"
                >
                  {s.name}
                </button>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${statusPillClass(s.last_run_status)}`}>
                  {s.last_run_status || 'never'}
                </span>
              </div>
              <div className="text-[11px] text-gr-subtle font-mono mb-2">{s.scheduled}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="text-gr-subtle">Last run</div>
                <div className="text-gr-text tabular-nums text-right">{fmtAgo(s.last_run_at)}</div>
                <div className="text-gr-subtle">Last duration</div>
                <div className="text-gr-text tabular-nums text-right">{fmtDuration(s.last_run_duration_s)}</div>
                <div className="text-gr-subtle">Avg (24h)</div>
                <div className="text-gr-text tabular-nums text-right">{fmtDuration(s.avg_duration_24h)}</div>
                <div className="text-gr-subtle">Fails (24h)</div>
                <div className={`tabular-nums text-right ${s.failures_24h > 0 ? 'text-gr-danger' : 'text-gr-text'}`}>{s.failures_24h}</div>
              </div>
              {s.stale && (
                <div className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-warning/15 text-gr-warning">
                  Stale &gt; 24h
                </div>
              )}
            </div>
          ))}
        </div>
        {filteredScheduled.length === 0 && (
          <div className="text-center py-10 text-gr-subtle">No agents match this filter.</div>
        )}
      </section>

      {/* Today's run timeline */}
      <section>
        <h2 className="text-2xl font-bold text-gr-text mb-2">Today&apos;s run timeline</h2>
        <p className="text-sm text-gr-muted mb-3">
          {todaysRunsSorted.length} runs since midnight. Green = success, yellow = healed, red = fail. Click any chip for the raw log row.
        </p>
        <div className="bg-gr-surface rounded-md border border-gr-border p-3 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {todaysRunsSorted.map((r, idx) => (
              <button
                key={`${r.timestamp}-${r.agent}-${idx}`}
                type="button"
                onClick={() => setSelectedRun(r)}
                title={`${fmtTime(r.timestamp)} ${r.agent} ${r.status} ${fmtDuration(r.duration_s)}`}
                className={`shrink-0 w-3 h-8 rounded-sm transition ${statusChipBg(r.status)} ${
                  selectedRun?.timestamp === r.timestamp && selectedRun?.agent === r.agent ? 'ring-2 ring-gr-accent' : ''
                }`}
              />
            ))}
          </div>
          {todaysRunsSorted.length === 0 && (
            <div className="text-center py-6 text-gr-subtle text-sm">No runs logged today yet.</div>
          )}
        </div>
        {selectedRun && (
          <div className="mt-3 bg-gr-bg border border-gr-border rounded-md p-3 text-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusPillClass(selectedRun.status)}`}>
                {selectedRun.status}
              </span>
              <span className="font-mono font-semibold text-gr-text">{selectedRun.agent}</span>
              <span className="text-gr-muted tabular-nums">{selectedRun.timestamp}</span>
              <span className="text-gr-muted tabular-nums">{fmtDuration(selectedRun.duration_s)}</span>
              <button
                type="button"
                onClick={() => setAgentFilter(selectedRun.agent)}
                className="ml-auto text-xs text-gr-accent hover:text-gr-accent-hover font-bold"
              >
                Filter to this agent
              </button>
              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="text-xs text-gr-subtle hover:text-gr-text"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Recent failures */}
      <section>
        <h2 className="text-2xl font-bold text-gr-text mb-2">Recent failures (last 24h)</h2>
        {scopedData.recent_failures.length === 0 ? (
          <div className="bg-gr-surface rounded-md border border-gr-border p-6 text-center text-sm text-gr-muted">
            No failures in the last 24 hours. Everything green.
          </div>
        ) : (
          <div className="bg-gr-surface rounded-md border border-gr-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gr-bg border-b border-gr-border">
                <tr>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Agent</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-gr-subtle">When</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Ran for</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Healed</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Drill</th>
                </tr>
              </thead>
              <tbody>
                {scopedData.recent_failures.slice(0, 10).map((f, idx) => (
                  <tr key={`${f.timestamp}-${f.agent}-${idx}`} className="border-b border-gr-border last:border-0">
                    <td className="px-4 py-2 font-mono font-semibold text-gr-text break-all">{f.agent}</td>
                    <td className="px-4 py-2 text-gr-muted tabular-nums">{fmtAgo(f.timestamp)}</td>
                    <td className="px-4 py-2 text-right text-gr-muted tabular-nums">{fmtDuration(f.duration_s)}</td>
                    <td className="px-4 py-2">
                      {f.healed_after ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-warning/15 text-gr-warning">
                          Healed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-danger/15 text-gr-danger">
                          Not healed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setAgentFilter(f.agent)}
                        className="text-xs text-gr-accent hover:text-gr-accent-hover font-bold"
                      >
                        Filter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Log tail */}
      <section>
        <h2 className="text-2xl font-bold text-gr-text mb-2">Log tail</h2>
        <p className="text-sm text-gr-muted mb-3">
          Last 50 rows from health.log{agentFilter ? `, filtered to "${agentFilter}"` : ''}.
        </p>
        <div className="bg-gr-bg rounded-md border border-gr-border overflow-x-auto">
          <pre className="text-xs font-mono text-gr-text p-4 leading-relaxed whitespace-pre">
{filteredLogTail.length > 0 ? filteredLogTail.join('\n') : '(no matching lines)'}
          </pre>
        </div>
      </section>
    </div>
  );
}
