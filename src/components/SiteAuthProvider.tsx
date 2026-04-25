'use client';

/**
 * Site-wide auth gate for the apparel-analytics dashboard.
 *
 * Validates against the same /pulse/auth endpoint and shares the same
 * sessionStorage token keys as the existing GymreapersProvider, so a
 * single login covers the whole site (including the Gymreapers section).
 *
 * Themed in Gymreapers brand tokens (gr-*) so the login screen looks
 * like the brand, not like the apparel-intel site.
 */

import { createContext, useContext, useEffect, useState, FormEvent, ReactNode } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const TOKEN_EXPIRY_KEY = 'ydp_pulse_token_expires';
const DATA_CACHE_KEY = 'ydp_gymreapers_data';
const DATA_CACHE_AT_KEY = 'ydp_gymreapers_data_at';

interface SiteAuthValue {
  token: string | null;
  signOut: () => void;
}

const SiteAuthContext = createContext<SiteAuthValue | null>(null);

export function useSiteAuth(): SiteAuthValue {
  const ctx = useContext(SiteAuthContext);
  if (!ctx) throw new Error('useSiteAuth must be used inside SiteAuthProvider');
  return ctx;
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expires = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expires) return null;
  if (Date.now() > parseInt(expires, 10)) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(DATA_CACHE_KEY);
    sessionStorage.removeItem(DATA_CACHE_AT_KEY);
    return null;
  }
  return token;
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(DATA_CACHE_KEY);
  sessionStorage.removeItem(DATA_CACHE_AT_KEY);
}

export function SiteAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    setToken(readStoredToken());
    setAuthReady(true);
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthenticating(true);
    try {
      const r = await fetch(`${PULSE_API}/pulse/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await r.json();
      if (!r.ok || !json.authenticated) {
        throw new Error(json.error || 'Invalid password');
      }
      const expiresAt = Date.now() + (json.expires_in || 86400) * 1000;
      sessionStorage.setItem(TOKEN_KEY, json.token);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
      setToken(json.token);
      setPassword('');
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setAuthenticating(false);
    }
  }

  function signOut() {
    clearAuth();
    setToken(null);
  }

  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#a3a3a3' }} className="flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gr-bg text-gr-text flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">
              Gymreapers / Internal
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gr-text">Authorized Access Only</h1>
            <p className="text-gr-muted text-sm mt-3 leading-relaxed">
              This dashboard contains private competitive and product intelligence. Sign in to continue.
            </p>
          </div>

          <div className="bg-gr-surface border border-gr-border rounded-md p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-gr-muted font-bold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded bg-gr-bg border border-gr-border text-gr-text font-mono focus:outline-none focus:border-gr-accent transition"
                  disabled={authenticating}
                  autoComplete="current-password"
                />
              </div>
              {authError && (
                <div className="text-sm text-gr-danger bg-gr-bg border border-gr-danger rounded px-3 py-2">
                  {authError}
                </div>
              )}
              <button
                type="submit"
                disabled={authenticating || !password}
                className="w-full py-3 rounded bg-gr-accent text-gr-text font-bold uppercase tracking-[0.2em] text-sm hover:bg-gr-accent-hover disabled:opacity-50 transition"
              >
                {authenticating ? 'Signing in...' : 'Enter'}
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-gr-subtle mt-6 uppercase tracking-wider font-mono">
            YDP Data &amp; Analytics
          </div>
        </div>
      </div>
    );
  }

  return (
    <SiteAuthContext.Provider value={{ token, signOut }}>
      {children}
    </SiteAuthContext.Provider>
  );
}
