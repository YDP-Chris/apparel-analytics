'use client';

/**
 * SuggestInput — a collapsible "Suggest a [thing]" form anchored to a
 * particular scope (kind + optional parent_slug). Always shows what's
 * already tracked so the team doesn't duplicate.
 *
 * Hybrid approval: whitespace_query auto-applies; everything else queues.
 * The component renders different help copy based on the kind.
 *
 * Usage:
 *   <SuggestInput
 *     kind="whitespace_query"
 *     parentSlug="lifting_belt"
 *     parentLabel="Weightlifting Belts"
 *   />
 */

import { useEffect, useState } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const NAME_LS_KEY = 'ydp_inputs_submitter_name';

type Kind = 'whitespace_query' | 'autocomplete_seed' | 'category_seed' | 'category_trend_keyword' | 'brand';

const KIND_LABELS: Record<Kind, { noun: string; verb: string; placeholder: string; auto: boolean }> = {
  whitespace_query:        { noun: 'whitespace sub-query', verb: 'Track',  placeholder: 'e.g. ipf approved lifting belt',          auto: true  },
  autocomplete_seed:       { noun: 'autocomplete seed',    verb: 'Track',  placeholder: 'e.g. olympic squat shoes',                auto: false },
  category_seed:           { noun: 'Amazon category',      verb: 'Track',  placeholder: 'e.g. powerlifting singlet',               auto: false },
  category_trend_keyword:  { noun: 'Google Trends term',   verb: 'Track',  placeholder: 'e.g. lifting belt women',                 auto: false },
  brand:                   { noun: 'brand',                verb: 'Track',  placeholder: 'e.g. titan_fitness',                      auto: false },
};

interface ScopeResponse {
  hardcoded: string[];
  team_applied: Array<{ id: number; value: string; submitted_by?: string; auto_applied: boolean }>;
  team_pending: Array<{ id: number; value: string; submitted_by?: string }>;
  total_tracked: number;
}

interface Props {
  kind: Kind;
  parentSlug?: string;
  parentLabel?: string;          // for human-readable context, e.g. "Weightlifting Belts"
}

export function SuggestInput({ kind, parentSlug, parentLabel }: Props) {
  const meta = KIND_LABELS[kind];
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ScopeResponse | null>(null);
  const [value, setValue] = useState('');
  const [rationale, setRationale] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; auto?: boolean } | null>(null);

  // Load remembered name from localStorage so they don't retype every time
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const remembered = localStorage.getItem(NAME_LS_KEY) || '';
    setSubmitterName(remembered);
  }, []);

  // Fetch current scope when the form opens
  useEffect(() => {
    if (!open || scope) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const params = new URLSearchParams({ kind });
    if (parentSlug) params.set('parent_slug', parentSlug);
    fetch(`${PULSE_API}/pulse/inputs/scope?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => setScope(j))
      .catch(() => setScope({ hardcoded: [], team_applied: [], team_pending: [], total_tracked: 0 }));
  }, [open, scope, kind, parentSlug]);

  // Duplicate detector across hardcoded + team-submitted
  const trimmed = value.trim().toLowerCase();
  const allKnown = scope
    ? [
        ...scope.hardcoded.map((h) => h.toLowerCase()),
        ...scope.team_applied.map((t) => t.value.toLowerCase()),
        ...scope.team_pending.map((t) => t.value.toLowerCase()),
      ]
    : [];
  const isDuplicate = trimmed.length >= 3 && allKnown.includes(trimmed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || isDuplicate) return;
    setSubmitting(true);
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (submitterName.trim() && typeof window !== 'undefined') {
      localStorage.setItem(NAME_LS_KEY, submitterName.trim());
    }
    try {
      const r = await fetch(`${PULSE_API}/pulse/inputs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind, value: value.trim(), parent_slug: parentSlug,
          rationale: rationale.trim() || undefined,
          submitted_by: submitterName.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setResult({
        ok: true,
        auto: data.auto_applied,
        message: data.auto_applied
          ? 'Submitted and live — will appear in the next scrape run.'
          : 'Submitted for review. Chris will approve or reject it.',
      });
      setValue('');
      setRationale('');
      setScope(null); // refetch with new entry on next open
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-gr-accent hover:text-gr-accent-hover font-semibold transition"
      >
        <span className="text-base leading-none">+</span>
        Suggest a {meta.noun}
        {parentLabel && <span className="text-gr-muted font-normal">for {parentLabel}</span>}
      </button>
    );
  }

  return (
    <div className="bg-gr-bg rounded-md border border-gr-border p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-gr-text uppercase tracking-wider">
          Suggest a {meta.noun}
          {parentLabel && <span className="text-gr-muted normal-case tracking-normal font-normal"> for {parentLabel}</span>}
        </h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setResult(null); }}
          className="text-xs text-gr-muted hover:text-gr-text"
        >
          ✕ Close
        </button>
      </div>

      {/* What's already tracked — duplicate-prevention surface */}
      {scope && (scope.hardcoded.length > 0 || scope.team_applied.length > 0 || scope.team_pending.length > 0) && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gr-muted hover:text-gr-text font-semibold">
            Already tracked ({scope.total_tracked} live{scope.team_pending.length > 0 ? `, ${scope.team_pending.length} pending` : ''}) — click to view
          </summary>
          <div className="mt-2 space-y-2 pl-3 border-l border-gr-border">
            {scope.hardcoded.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Built-in ({scope.hardcoded.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {scope.hardcoded.map((h) => (
                    <span key={h} className="px-1.5 py-0.5 rounded text-[11px] bg-gr-surface text-gr-muted">{h}</span>
                  ))}
                </div>
              </div>
            )}
            {scope.team_applied.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-success mb-1">Team-added ({scope.team_applied.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {scope.team_applied.map((t) => (
                    <span key={t.id} className="px-1.5 py-0.5 rounded text-[11px] bg-gr-success/10 text-gr-success" title={t.submitted_by ? `by ${t.submitted_by}` : undefined}>
                      {t.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {scope.team_pending.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-accent mb-1">Pending review ({scope.team_pending.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {scope.team_pending.map((t) => (
                    <span key={t.id} className="px-1.5 py-0.5 rounded text-[11px] bg-gr-accent-soft text-gr-accent" title={t.submitted_by ? `by ${t.submitted_by}` : undefined}>
                      {t.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-bold text-gr-subtle mb-1">{meta.noun}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={meta.placeholder}
            className={`w-full px-3 py-2 rounded bg-gr-surface border text-sm text-gr-text focus:outline-none focus:border-gr-accent transition ${
              isDuplicate ? 'border-gr-danger' : 'border-gr-border'
            }`}
            maxLength={120}
            required
          />
          {isDuplicate && (
            <p className="text-xs text-gr-danger mt-1">Already tracked above — try a different angle</p>
          )}
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Why? (optional)</label>
          <input
            type="text"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="e.g. customer email mentioned this 3x last week"
            className="w-full px-3 py-2 rounded bg-gr-surface border border-gr-border text-sm text-gr-text focus:outline-none focus:border-gr-accent transition"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Your name (optional, remembered)</label>
          <input
            type="text"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="e.g. Alex"
            className="w-full px-3 py-2 rounded bg-gr-surface border border-gr-border text-sm text-gr-text focus:outline-none focus:border-gr-accent transition"
          />
        </div>

        <div className="text-xs text-gr-muted leading-relaxed bg-gr-surface rounded p-3">
          {meta.auto
            ? <><strong className="text-gr-success">Auto-applies.</strong> Live in the next scrape run (within 24h).</>
            : <><strong className="text-gr-accent">Needs approval.</strong> Queues for Chris&apos;s review before going live.</>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !value.trim() || isDuplicate}
            className="px-4 py-2 rounded-md bg-gr-accent text-gr-text font-semibold text-sm hover:bg-gr-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Submitting…' : `${meta.verb} this`}
          </button>
          {result && (
            <p className={`text-xs ${result.ok ? 'text-gr-success' : 'text-gr-danger'} font-medium`}>
              {result.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
