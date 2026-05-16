'use client';

/**
 * useInterestSignals — fetch all team-set interest signals for a given
 * entity_kind so the page can default-hide things the team has marked
 * `passing` (and optionally `not_now`).
 *
 * Returns a small filter helper. Loads asynchronously — first render is
 * "loading" (filter is a no-op), subsequent renders apply the filter.
 *
 * Usage:
 *   const { isPassing, hideKey, filterOut, count } =
 *     useInterestSignals('whitespace_query');
 *   const visible = opps.filter(o => !filterOut(`${o.category_slug}|${o.query}`));
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

type Signal = 'pursuing' | 'exploring' | 'monitoring' | 'passing' | 'not_now';

interface Row {
  entity_kind: string;
  entity_key: string;
  signal: Signal;
}

export function useInterestSignals(entityKind: string) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showPassing, setShowPassing] = useState(false);   // default: hide passed
  const [showNotNow, setShowNotNow] = useState(false);     // default: show not_now

  useEffect(() => {
    let alive = true;
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setLoaded(true); return; }
    const params = new URLSearchParams({ entity_kind: entityKind });
    fetch(`${PULSE_API}/pulse/interest?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => { if (alive) setRows(j.items || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [entityKind]);

  const byKey = useMemo(() => {
    const m = new Map<string, Signal>();
    for (const r of rows) m.set(r.entity_key, r.signal);
    return m;
  }, [rows]);

  const isPassing = useCallback((key: string) => byKey.get(key) === 'passing', [byKey]);
  const isNotNow  = useCallback((key: string) => byKey.get(key) === 'not_now', [byKey]);
  const signalOf  = useCallback((key: string) => byKey.get(key), [byKey]);

  // Returns true when this key should be FILTERED OUT (hidden from view).
  const filterOut = useCallback((key: string) => {
    if (!loaded) return false;   // never hide while loading — avoids flash
    if (isPassing(key) && !showPassing) return true;
    if (isNotNow(key)  && !showNotNow)  return false; // not_now stays visible by default
    return false;
  }, [loaded, isPassing, isNotNow, showPassing, showNotNow]);

  const passingCount = useMemo(
    () => rows.filter((r) => r.signal === 'passing').length, [rows],
  );
  const notNowCount = useMemo(
    () => rows.filter((r) => r.signal === 'not_now').length, [rows],
  );

  return {
    loaded,
    isPassing, isNotNow, signalOf,
    filterOut,
    showPassing, setShowPassing,
    showNotNow, setShowNotNow,
    passingCount, notNowCount,
    total: rows.length,
  };
}
