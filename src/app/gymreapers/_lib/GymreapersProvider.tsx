'use client';

import { createContext, useContext, useEffect, useState, FormEvent, ReactNode } from 'react';
import type { GymreapersReport } from './types';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const TOKEN_EXPIRY_KEY = 'ydp_pulse_token_expires';
const DATA_CACHE_KEY = 'ydp_gymreapers_data';
const DATA_CACHE_AT_KEY = 'ydp_gymreapers_data_at';
const DATA_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ContextValue {
  data: GymreapersReport | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  signOut: () => void;
}

const GymreapersContext = createContext<ContextValue | null>(null);

export function useGymreapersData(): ContextValue {
  const ctx = useContext(GymreapersContext);
  if (!ctx) throw new Error('useGymreapersData must be used inside GymreapersProvider');
  return ctx;
}

function getStoredToken(): string | null {
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

function getCachedData(): GymreapersReport | null {
  if (typeof window === 'undefined') return null;
  const at = sessionStorage.getItem(DATA_CACHE_AT_KEY);
  const blob = sessionStorage.getItem(DATA_CACHE_KEY);
  if (!at || !blob) return null;
  if (Date.now() - parseInt(at, 10) > DATA_TTL_MS) return null;
  try {
    return JSON.parse(blob);
  } catch {
    return null;
  }
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(DATA_CACHE_KEY);
  sessionStorage.removeItem(DATA_CACHE_AT_KEY);
}

export function GymreapersProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<GymreapersReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    setToken(getStoredToken());
    setData(getCachedData());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (data && refreshTick === 0) return; // already cached
    setLoading(true);
    setError(null);
    fetch(`${PULSE_API}/pulse/gymreapers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (r.status === 401) {
          clearAuth();
          setToken(null);
          throw new Error('Session expired. Please log in again.');
        }
        if (r.status === 404) {
          throw new Error('Report not yet generated. The agent will produce it on its next cycle.');
        }
        if (!r.ok) throw new Error(`Failed to load (HTTP ${r.status})`);
        return r.json();
      })
      .then((json: GymreapersReport) => {
        setData(json);
        try {
          sessionStorage.setItem(DATA_CACHE_KEY, JSON.stringify(json));
          sessionStorage.setItem(DATA_CACHE_AT_KEY, Date.now().toString());
        } catch {
          // ignore quota errors
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, refreshTick, data]);

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
    setData(null);
  }

  function refresh() {
    sessionStorage.removeItem(DATA_CACHE_KEY);
    sessionStorage.removeItem(DATA_CACHE_AT_KEY);
    setData(null);
    setRefreshTick((t) => t + 1);
  }

  if (!authReady) {
    return <div className="text-center py-20 text-gr-subtle">Loading...</div>;
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h1 className="text-2xl font-bold text-gr-text mb-2">Gymreapers Scorecard</h1>
          <p className="text-sm text-gr-muted mb-6">
            This report is private. Sign in with your password to view.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded bg-gr-bg border border-gr-border text-gr-text font-mono focus:outline-none focus:border-gr-accent transition"
              disabled={authenticating}
            />
            {authError && (
              <div className="text-sm text-gr-danger bg-gr-bg border border-gr-danger rounded px-3 py-2">
                {authError}
              </div>
            )}
            <button
              type="submit"
              disabled={authenticating || !password}
              className="w-full py-3 rounded bg-gr-accent text-white font-bold uppercase tracking-[0.2em] text-sm hover:bg-gr-accent-hover disabled:opacity-50 transition"
            >
              {authenticating ? 'Signing in...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <GymreapersContext.Provider value={{ data, loading, error, refresh, signOut }}>
      {children}
    </GymreapersContext.Provider>
  );
}
