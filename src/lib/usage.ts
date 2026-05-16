/**
 * Usage analytics client. Send page views, clicks, submits, etc. to
 * /pulse/usage/events. Per the hardened Plan agent spec:
 *
 *   - Generate event_uuid client-side for idempotency (server upserts).
 *   - Dedupe identical path emits within 500ms (handles React strict-mode
 *     double-render and back/forward double-fires).
 *   - Read the optional submitter name from localStorage (same key
 *     Annotations / SuggestInput already use). Never prompt.
 *   - Read the auth token from sessionStorage. Silently drop events when
 *     there's no token (login screen, public pages).
 *   - Batch with 2s debounce or 10-event buffer, whichever comes first.
 *     On `pagehide`, flush via sendBeacon (fire-and-forget; auth via
 *     ?token=... since beacon can't set headers).
 *   - For everything else, fetch with `keepalive: true` so navigations
 *     don't kill in-flight requests.
 *   - app_version stamped from NEXT_PUBLIC_BUILD_SHA so we can correlate
 *     event-shape changes with deploys.
 *
 * Public API:
 *   trackEvent('click', { label: 'confidence_badge', metadata: { source: 'amazon_bsr' } })
 *   trackPageView()         // called by <UsageTracker /> on every route change
 */

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || 'dev';
const TOKEN_KEY = 'ydp_pulse_token';
const NAME_LS_KEY = 'ydp_inputs_submitter_name';
const SESSION_LS_KEY = 'ydp_usage_session_id';
const LAST_PATH_KEY = 'ydp_usage_last_path';
const SCHEMA_V = 1;

type EventKind = 'page_view' | 'api_hit' | 'click' | 'expand' | 'submit' | 'search' | 'outbound' | 'error';

interface TrackInput {
  label?: string;
  path?: string;
  route_template?: string;
  from_path?: string;
  duration_ms?: number;
  status_code?: number;
  metadata?: Record<string, unknown>;
}

interface QueuedEvent extends TrackInput {
  event_uuid: string;
  schema_v: number;
  event_kind: EventKind;
  session_id: string;
  submitter?: string;
  app_version: string;
}

// Module-scoped queue + dedupe state. Survives across page transitions
// within the same tab session.
let queue: QueuedEvent[] = [];
let flushTimer: number | undefined;
const recentEmits = new Map<string, number>(); // key → timestamp

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let s = sessionStorage.getItem(SESSION_LS_KEY);
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem(SESSION_LS_KEY, s);
  }
  return s;
}

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function getSubmitter(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const n = localStorage.getItem(NAME_LS_KEY);
  return n?.trim() || undefined;
}

function stripQuery(path: string): string {
  return (path || '').split('?')[0].split('#')[0];
}

// Tiny route-template inference. We don't have the actual Next.js
// app-router pattern at runtime, so we infer based on path shape. Keeps
// /glossary, /glossary#hhi, /glossary#bsr as one entry; /brands/foo and
// /brands/bar collapse to /brands/[slug]. Update as new dynamic routes
// appear.
function inferRouteTemplate(path: string): string {
  const clean = stripQuery(path);
  // No dynamic segments today, but defensively collapse anything that
  // looks like a slug after a known prefix.
  const dynamicPrefixes = ['/gymreapers/', '/brands/', '/glossary/'];
  for (const p of dynamicPrefixes) {
    if (clean.startsWith(p) && clean.slice(p.length).split('/').filter(Boolean).length === 1) {
      return p + '[slug]';
    }
  }
  return clean;
}

function scheduleFlush() {
  if (typeof window === 'undefined') return;
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    flush();
  }, 2000);
}

async function flush() {
  if (queue.length === 0) return;
  const token = getToken();
  if (!token) {
    queue = [];
    return;
  }
  const events = queue;
  queue = [];
  try {
    await fetch(`${PULSE_API}/pulse/usage/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Silent failure — analytics must never break the page.
  }
}

function flushOnUnload() {
  if (typeof window === 'undefined') return;
  if (queue.length === 0) return;
  const token = getToken();
  if (!token) return;
  const events = queue;
  queue = [];
  try {
    const url = `${PULSE_API}/pulse/usage/events?token=${encodeURIComponent(token)}`;
    const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushOnUnload);
  window.addEventListener('beforeunload', flushOnUnload);
}

export function trackEvent(kind: EventKind, input: TrackInput = {}): void {
  if (typeof window === 'undefined') return;
  if (!getToken()) return; // pre-auth or signed out — drop silently

  // 500ms dedupe on (kind, path-or-label) to suppress React-strict double-render
  // and rapid identical fires. Server-side event_uuid UNIQUE is the second line.
  const dedupeKey = `${kind}|${input.label || ''}|${stripQuery(input.path || '')}`;
  const now = Date.now();
  const recent = recentEmits.get(dedupeKey);
  if (recent && now - recent < 500) return;
  recentEmits.set(dedupeKey, now);

  const event: QueuedEvent = {
    event_uuid: crypto.randomUUID(),
    schema_v: SCHEMA_V,
    event_kind: kind,
    session_id: getSessionId(),
    submitter: getSubmitter(),
    app_version: BUILD_SHA,
    label: input.label,
    path: stripQuery(input.path || (typeof window !== 'undefined' ? window.location.pathname : '')),
    route_template: input.route_template || inferRouteTemplate(input.path || (typeof window !== 'undefined' ? window.location.pathname : '')),
    from_path: input.from_path ? stripQuery(input.from_path) : undefined,
    duration_ms: input.duration_ms,
    status_code: input.status_code,
    metadata: input.metadata as Record<string, unknown> | undefined,
  };
  queue.push(event);

  // Flush immediately on 10-event buffer, else debounce 2s.
  if (queue.length >= 10) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = undefined; }
    flush();
  } else {
    scheduleFlush();
  }
}

export function trackPageView(): void {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  const fromPath = sessionStorage.getItem(LAST_PATH_KEY) || undefined;
  sessionStorage.setItem(LAST_PATH_KEY, currentPath);
  trackEvent('page_view', {
    path: currentPath,
    from_path: fromPath,
    route_template: inferRouteTemplate(currentPath),
  });
}
