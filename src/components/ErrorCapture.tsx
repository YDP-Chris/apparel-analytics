'use client';

/**
 * ErrorCapture — installs window-level listeners for uncaught errors and
 * unhandled promise rejections, and forwards them to the usage analytics
 * pipeline as `error` events.
 *
 * Capped at 5 events per session to avoid runaway loops (a buggy hook that
 * throws on every render would otherwise spam the queue).
 *
 * Mounted once near the app root, alongside <UsageTracker />.
 */

import { useEffect } from 'react';
import { trackEvent } from '@/lib/usage';

const MAX_ERRORS_PER_SESSION = 5;

export function ErrorCapture() {
  useEffect(() => {
    let count = 0;

    function fire(message: string | undefined, filename: string | undefined) {
      if (count >= MAX_ERRORS_PER_SESSION) return;
      count += 1;
      trackEvent('error', {
        label: (message || 'unknown_error').slice(0, 100),
        metadata: { source: (filename || '').slice(0, 200) },
      });
    }

    function onError(e: ErrorEvent) {
      fire(e.message, e.filename);
    }

    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason && typeof reason === 'object' && 'message' in reason
            ? String((reason as { message: unknown }).message)
            : 'unhandled_rejection';
      fire(message, undefined);
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
