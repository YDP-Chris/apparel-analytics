'use client';

/**
 * Team inputs queue + log. Two purposes:
 *   1. Approval inbox for Chris (pending suggestions)
 *   2. Audit log of everything the team has submitted, applied, rejected
 *
 * Anyone authed can see this page so the team can confirm their suggestion
 * landed. Approve/Reject buttons fire the same auth token — gating is honor-
 * system for now (we'll lock down to a reviewer role when proper auth lands).
 */

import { useEffect, useState } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Suggestion {
  id: number;
  kind: string;
  value: string;
  parent_slug?: string | null;
  rationale?: string | null;
  submitted_by?: string | null;
  submitted_at: string;
  status: 'pending' | 'applied' | 'rejected';
  auto_applied: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
}

const KIND_PRETTY: Record<string, string> = {
  whitespace_query: 'Whitespace sub-query',
  autocomplete_seed: 'Autocomplete seed',
  category_seed: 'Amazon category',
  category_trend_keyword: 'Google Trends term',
  brand: 'Brand',
};

function fmtAgo(iso?: string | null): string {
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

export default function InputsPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<'pending' | 'applied' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    params.set('limit', '500');
    fetch(`${PULSE_API}/pulse/inputs?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => setItems(j.items || []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function review(id: number, action: 'approve' | 'reject', reason?: string) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const r = await fetch(`${PULSE_API}/pulse/inputs/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reviewer: 'admin' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      refresh();
    } catch (e) {
      alert(`${action} failed: ${e}`);
    }
  }

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Team Inputs
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What the team is tracking
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Suggestions from marketing and product. Whitespace queries auto-apply (scoped to a category).
          Everything else queues for review before going live.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'applied', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
              filter === f
                ? 'bg-gr-accent text-gr-text'
                : 'bg-gr-surface text-gr-muted hover:text-gr-text border border-gr-border'
            }`}
          >
            {f}
            {filter === f && items.length > 0 && <span className="ml-1.5 opacity-70">({items.length})</span>}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-gr-danger">{error}</p>}
      {loading && <p className="text-sm text-gr-subtle">Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="bg-gr-surface border border-gr-border rounded-md p-10 text-center">
          <p className="text-gr-muted">No {filter === 'all' ? '' : filter} suggestions yet.</p>
        </div>
      )}

      {items.map((s) => (
        <section key={s.id} className="bg-gr-surface border border-gr-border rounded-md p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-gr-accent">
                  {KIND_PRETTY[s.kind] || s.kind}
                </span>
                {s.parent_slug && (
                  <span className="text-[11px] text-gr-subtle">· {s.parent_slug}</span>
                )}
                {s.auto_applied && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gr-success/15 text-gr-success">AUTO</span>
                )}
              </div>
              <div className="text-lg font-semibold text-gr-text mb-1">&ldquo;{s.value}&rdquo;</div>
              {s.rationale && <p className="text-sm text-gr-muted mb-2">{s.rationale}</p>}
              <p className="text-xs text-gr-subtle">
                Submitted {fmtAgo(s.submitted_at)}{s.submitted_by ? ` by ${s.submitted_by}` : ''}
                {s.reviewed_at && (
                  <> · {s.status === 'applied' ? 'approved' : 'rejected'} {fmtAgo(s.reviewed_at)}{s.reviewed_by ? ` by ${s.reviewed_by}` : ''}</>
                )}
                {s.rejection_reason && <> · &ldquo;{s.rejection_reason}&rdquo;</>}
              </p>
            </div>

            {s.status === 'pending' && (
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => review(s.id, 'approve')}
                  className="px-3 py-1.5 rounded bg-gr-success/20 text-gr-success hover:bg-gr-success/30 text-xs font-bold uppercase tracking-wider transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Why reject? (optional)');
                    if (reason !== null) review(s.id, 'reject', reason);
                  }}
                  className="px-3 py-1.5 rounded bg-gr-danger/20 text-gr-danger hover:bg-gr-danger/30 text-xs font-bold uppercase tracking-wider transition"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
