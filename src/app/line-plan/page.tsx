'use client';

/**
 * /line-plan — RETIRED / HIDDEN (2026-08-03).
 *
 * Hidden from the whole team at Chris's request. Removed from the primary nav
 * and gated here so a direct URL no longer renders the plan. The full
 * implementation is preserved in ./page.retired.tsx.bak — to restore, copy it
 * back over this file and re-add the nav entry in components/Navigation.tsx.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LinePlanRetired() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/today'), 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">Unavailable</p>
      <h1 className="text-2xl font-bold text-gr-text mb-2">This page has been retired</h1>
      <p className="text-gr-muted text-sm">Redirecting you to Today…</p>
    </div>
  );
}
