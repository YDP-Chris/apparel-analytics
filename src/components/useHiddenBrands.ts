'use client';

/**
 * useHiddenBrands — per-user brand visibility toggle backed by localStorage.
 *
 * "Hidden" means the user has chosen to exclude this brand from their view of
 * the dashboard. It's per-user, not server-side, so marketing hiding Lululemon
 * doesn't break product team's view. The setting persists across sessions on
 * the same device.
 *
 * Hidden brands still get scraped and ingested — the toggle is purely a
 * presentation filter. Promoting to a shared/team-level scope later just means
 * swapping the localStorage backing for a Supabase write, with no component
 * changes needed downstream.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ydp_hidden_brands';

/** Subscribe to storage events so multiple tabs stay in sync. */
function readStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeStorage(next: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  // Notify other components in the same tab via a custom event (storage event
  // only fires across tabs, not within one).
  window.dispatchEvent(new CustomEvent('ydp:hidden-brands-changed'));
}

export function useHiddenBrands() {
  const [hidden, setHidden] = useState<Set<string>>(() => readStorage());

  useEffect(() => {
    function refresh() {
      setHidden(readStorage());
    }
    window.addEventListener('storage', refresh);
    window.addEventListener('ydp:hidden-brands-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('ydp:hidden-brands-changed', refresh);
    };
  }, []);

  const isHidden = useCallback((slug: string) => hidden.has(slug), [hidden]);

  const hide = useCallback((slug: string) => {
    const next = new Set(readStorage());
    next.add(slug);
    writeStorage(next);
    setHidden(next);
  }, []);

  const show = useCallback((slug: string) => {
    const next = new Set(readStorage());
    next.delete(slug);
    writeStorage(next);
    setHidden(next);
  }, []);

  const toggle = useCallback((slug: string) => {
    const next = new Set(readStorage());
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    writeStorage(next);
    setHidden(next);
  }, []);

  const clear = useCallback(() => {
    writeStorage(new Set());
    setHidden(new Set());
  }, []);

  /** Helper for filtering brand-keyed dicts/arrays at the page level. */
  const filterVisible = useCallback(
    <T extends { slug?: string } | string>(items: T[]): T[] =>
      items.filter((item) => {
        const slug = typeof item === 'string' ? item : item.slug;
        return slug ? !hidden.has(slug) : true;
      }),
    [hidden],
  );

  return { hidden, isHidden, hide, show, toggle, clear, filterVisible, count: hidden.size };
}
