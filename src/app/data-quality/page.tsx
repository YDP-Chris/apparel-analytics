'use client';

import { useEffect, useState } from 'react';
import { GlossaryTerm } from '@/components/GlossaryTerm';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface QaFinding {
  check_name: string;
  scope: string;
  severity: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  observed?: Record<string, unknown>;
  expected?: Record<string, unknown>;
  first_seen_at?: string;
  last_seen_at?: string;
}

interface QaPayload {
  available: boolean;
  run_id?: string;
  finished_at?: string;
  duration_ms?: number;
  checks_total?: number;
  findings_total?: number;
  fail_count?: number;
  warn_count?: number;
  status_color?: 'green' | 'yellow' | 'red';
  findings?: QaFinding[];
}

const SEVERITY_STYLES: Record<string, { wrap: string; pill: string; label: string }> = {
  FAIL: { wrap: 'bg-gr-danger/10 border-gr-danger', pill: 'bg-gr-danger text-gr-text', label: 'FAIL' },
  WARN: { wrap: 'bg-gr-accent-soft/40 border-gr-accent-soft', pill: 'bg-gr-accent text-gr-text', label: 'WARN' },
};

function fmtAgo(iso?: string): string {
  if (!iso) return '—';
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return iso;
  }
}

export default function DataQualityPage() {
  const [qa, setQa] = useState<QaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in via /today first.');
      return;
    }
    fetch(`${PULSE_API}/pulse/qa`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => setQa(j))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!qa) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;
  if (!qa.available) {
    return (
      <div className="bg-gr-surface rounded-md p-8 border border-gr-border text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-2">Data Quality</h1>
        <p className="text-gr-muted">No QA runs yet. First one fires within 30 min of agent install.</p>
      </div>
    );
  }

  const findings = qa.findings || [];
  const byCheck: Record<string, QaFinding[]> = {};
  for (const f of findings) {
    byCheck[f.check_name] = byCheck[f.check_name] || [];
    byCheck[f.check_name].push(f);
  }
  const checkOrder = ['freshness', 'volume', 'endpoint', 'cron_health', 'consistency', 'outliers'];

  return (
    <div className="space-y-10">
      <header className={`rounded-md p-7 border ${
        qa.status_color === 'red' ? 'bg-gr-danger/10 border-gr-danger/60' :
        qa.status_color === 'yellow' ? 'bg-gr-accent-soft/40 border-gr-accent/60' :
        'bg-gr-success/10 border-gr-success/60'
      }`}>
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] font-bold mb-2 text-gr-muted">
              Data Quality
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gr-text">
              {qa.status_color === 'red' && 'Issues need attention'}
              {qa.status_color === 'yellow' && 'Warnings active'}
              {qa.status_color === 'green' && 'All systems green'}
            </h1>
          </div>
          <div className="text-right text-sm">
            <div className="text-gr-muted">Last run {fmtAgo(qa.finished_at)}</div>
            <div className="text-gr-subtle text-xs mt-0.5">{qa.checks_total} checks · {qa.duration_ms}ms</div>
          </div>
        </div>
        <div className="flex gap-8 mt-5 text-sm border-t border-gr-border/40 pt-4">
          <div>
            <span className="text-gr-danger font-bold text-xl tabular-nums">{qa.fail_count || 0}</span>{' '}
            <span className="text-gr-muted text-xs uppercase tracking-wider font-semibold ml-1">FAIL</span>
          </div>
          <div>
            <span className="text-gr-accent font-bold text-xl tabular-nums">{qa.warn_count || 0}</span>{' '}
            <span className="text-gr-muted text-xs uppercase tracking-wider font-semibold ml-1">WARN</span>
          </div>
          <div>
            <span className="text-gr-success font-bold text-xl tabular-nums">{(qa.checks_total || 0) - (qa.findings_total || 0)}</span>{' '}
            <span className="text-gr-muted text-xs uppercase tracking-wider font-semibold ml-1">PASS</span>
          </div>
        </div>
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <h2 className="text-xl font-bold text-gr-text mb-2">About these checks</h2>
        <p className="text-sm text-gr-muted leading-relaxed">
          The data-qa agent runs every 30 minutes against the Supabase tables that back this
          dashboard. Every check is{' '}
          <GlossaryTerm id="idempotent">idempotent</GlossaryTerm> — re-running never duplicates a
          finding. Each check is one of:
        </p>
        <ul className="mt-3 space-y-1 text-sm text-gr-muted">
          <li>· <b className="text-gr-text">Freshness</b> — is the latest row newer than its SLA?</li>
          <li>· <b className="text-gr-text">Volume</b> — is today&apos;s row count within 50–200% of the 7-day median?</li>
          <li>· <b className="text-gr-text">Endpoint</b> — do the webhook routes return 200 in &lt;5s?</li>
          <li>· <b className="text-gr-text">Cron health</b> — any agent failed or auto-healed in the last 24h?</li>
          <li>· <b className="text-gr-text">Consistency</b> — do FK-shaped soft references resolve?</li>
          <li>· <b className="text-gr-text">Outliers</b> — are any values violating basic sanity rules?</li>
        </ul>
      </section>

      {findings.length === 0 ? (
        <div className="bg-gr-surface rounded-md p-10 border border-gr-border text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-gr-success/15 text-gr-success items-center justify-center text-2xl font-bold mb-4">✓</div>
          <h2 className="text-xl font-bold text-gr-text mb-2">No findings</h2>
          <p className="text-gr-muted text-sm">Every tracked table and endpoint passed its checks.</p>
        </div>
      ) : (
        checkOrder.filter((c) => byCheck[c]).map((c) => (
          <section key={c} className="bg-gr-surface rounded-md border border-gr-border p-6">
            <h2 className="text-lg font-bold text-gr-text mb-4 capitalize">
              {c.replace('_', ' ')} ({byCheck[c].length})
            </h2>
            <div className="space-y-2">
              {byCheck[c].map((f, i) => {
                const styles = SEVERITY_STYLES[f.severity];
                if (!styles) return null;
                return (
                  <div key={i} className={`rounded p-3 border ${styles.wrap}`}>
                    <div className="flex items-start gap-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${styles.pill}`}>
                        {styles.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono text-gr-text break-all">{f.scope}</div>
                        <div className="text-sm text-gr-muted mt-0.5">{f.message}</div>
                        <div className="flex gap-4 mt-2 text-xs text-gr-subtle">
                          {f.first_seen_at && <span>First seen {fmtAgo(f.first_seen_at)}</span>}
                          {f.last_seen_at && <span>Last seen {fmtAgo(f.last_seen_at)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <div className="text-xs text-gr-subtle">
        Run ID: <code className="bg-gr-bg px-1.5 py-0.5 rounded">{qa.run_id}</code>{' '}
        · Schema: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_qa</code>
      </div>
    </div>
  );
}
