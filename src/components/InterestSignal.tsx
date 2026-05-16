'use client';

/**
 * InterestSignal — declare the team's intent on an entity:
 *   pursuing | exploring | monitoring | passing | not_now
 *
 * Stored in gymreapers_inputs.interest_signals (one row per entity).
 * Every change is auto-logged to interest_history via DB trigger so we
 * can answer "when did we decide to pass on resistance bands?" later.
 *
 * Usage:
 *   <InterestSignal
 *     entityKind="amazon_category"
 *     entityKey="resistance_bands"
 *     entityLabel="Resistance Bands"
 *   />
 */

import { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const NAME_LS_KEY = 'ydp_inputs_submitter_name';

type Signal = 'pursuing' | 'exploring' | 'monitoring' | 'passing' | 'not_now';

const SIGNAL_META: Record<Signal, { label: string; color: string; bg: string; explain: string }> = {
  pursuing:   { label: 'Pursuing',     color: 'text-gr-success', bg: 'bg-gr-success/15',     explain: "We're actively building/marketing here." },
  exploring:  { label: 'Exploring',    color: 'text-gr-accent',  bg: 'bg-gr-accent-soft',    explain: "We're testing or researching this." },
  monitoring: { label: 'Monitoring',   color: 'text-gr-muted',   bg: 'bg-gr-raised',         explain: "Watching but no immediate action." },
  passing:    { label: 'Passing',      color: 'text-gr-danger',  bg: 'bg-gr-danger/10',      explain: "Deliberate pass — don't surface this again." },
  not_now:    { label: 'Not now',      color: 'text-gr-subtle',  bg: 'bg-gr-bg',             explain: "Right idea, wrong time. Revisit later." },
};

interface CurrentSignal {
  id?: number;
  signal: Signal;
  reason: string | null;
  submitted_by: string | null;
  submitted_at: string;
}

interface Props {
  entityKind: string;
  entityKey: string;
  entityLabel?: string;
}

export function InterestSignal({ entityKind, entityKey, entityLabel }: Props) {
  const [current, setCurrent] = useState<CurrentSignal | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingSignal, setPendingSignal] = useState<Signal>('exploring');
  const [reason, setReason] = useState('');
  const [submitter, setSubmitter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSubmitter(localStorage.getItem(NAME_LS_KEY) || '');
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const params = new URLSearchParams({ entity_kind: entityKind, entity_key: entityKey });
      const r = await fetch(`${PULSE_API}/pulse/interest?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return;
      const j = await r.json();
      const found = (j.items || [])[0];
      setCurrent(found || null);
      if (found) setPendingSignal(found.signal);
    } catch {
      // ignore
    }
  }, [entityKind, entityKey]);

  useEffect(() => { refresh(); }, [refresh]);

  async function submit() {
    setSubmitting(true);
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (submitter.trim() && typeof window !== 'undefined') {
      localStorage.setItem(NAME_LS_KEY, submitter.trim());
    }
    try {
      await fetch(`${PULSE_API}/pulse/interest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_kind: entityKind,
          entity_key: entityKey,
          signal: pendingSignal,
          reason: reason.trim() || null,
          submitted_by: submitter.trim() || null,
        }),
      });
      trackEvent('submit', {
        label: `interest:${pendingSignal}`,
        metadata: { entity_kind: entityKind, entity_key: entityKey, kind: pendingSignal },
      });
      await refresh();
      setOpen(false);
      setReason('');
    } finally {
      setSubmitting(false);
    }
  }

  const meta = current ? SIGNAL_META[current.signal] : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2"
        title={meta ? `${meta.explain} (click to change)` : 'Set the team\'s intent on this'}
      >
        {meta ? (
          <>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            {current?.reason && (
              <span className="text-xs text-gr-muted truncate max-w-[200px]" title={current.reason}>
                {current.reason}
              </span>
            )}
            <span className="text-xs text-gr-subtle hover:text-gr-text">change</span>
          </>
        ) : (
          <span className="text-xs text-gr-accent hover:text-gr-accent-hover font-semibold">
            + Set intent
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-gr-bg/60 border border-gr-border rounded p-3 space-y-2.5 min-w-[320px]">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle">
          Set intent{entityLabel ? ` for ${entityLabel}` : ''}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gr-muted hover:text-gr-text"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(SIGNAL_META) as Signal[]).map((s) => {
          const m = SIGNAL_META[s];
          const active = pendingSignal === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setPendingSignal(s)}
              className={`px-2 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
                active ? `${m.bg} ${m.color} ring-1 ring-current` : 'bg-gr-surface text-gr-muted hover:text-gr-text'
              }`}
              title={m.explain}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gr-subtle">{SIGNAL_META[pendingSignal].explain}</p>

      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why? (optional but recommended)"
        className="w-full px-2 py-1 rounded bg-gr-surface border border-gr-border text-xs text-gr-text focus:outline-none focus:border-gr-accent"
        maxLength={300}
      />
      <input
        type="text"
        value={submitter}
        onChange={(e) => setSubmitter(e.target.value)}
        placeholder="Your name (optional, remembered)"
        className="w-full px-2 py-1 rounded bg-gr-surface border border-gr-border text-xs text-gr-text focus:outline-none focus:border-gr-accent"
      />
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full px-3 py-1.5 rounded bg-gr-accent text-gr-text text-xs font-bold uppercase tracking-wider hover:bg-gr-accent-hover disabled:opacity-50 transition"
      >
        {submitting ? 'Saving…' : current ? 'Update intent' : 'Save intent'}
      </button>
    </div>
  );
}
