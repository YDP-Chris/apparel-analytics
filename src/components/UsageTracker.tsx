'use client';

/**
 * UsageTracker — mounted once near the app root inside the authenticated
 * tree. Fires a page_view event whenever the route changes.
 *
 * Lives between SiteAuthProvider and GymreapersProvider so:
 *   - It only fires when a token is present (silently no-ops otherwise)
 *   - It captures route changes inside the auth'd portion of the app
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/usage';

export function UsageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Fire on every pathname change. The trackPageView's own dedupe
    // (500ms window on same path+kind) handles strict-mode double-renders.
    trackPageView();
  }, [pathname]);

  return null;
}
