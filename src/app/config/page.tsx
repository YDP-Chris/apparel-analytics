'use client';

/**
 * Brand Config — the central, web-editable source of truth for which
 * competitors competitive-intel tracks, and the weekly newspaper settings.
 *
 * Edits POST to the Pi webhook (/pulse/brands, /pulse/newspaper), which writes
 * competitive-intel/data/brands_config.json. Adding a brand here wires it into
 * news, sitemap velocity, trends, catalog scraping, and the scorecard on the
 * next agent run. Anyone with the dashboard password can edit.
 */

import { useEffect, useState, FormEvent } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const TOKEN_EXPIRY_KEY = 'ydp_pulse_token_expires';

interface Brand {
  slug: string;
  name: string;
  tier?: string;
  website?: string | null;
  news_search?: string | null;
  sitemap_url?: string | null;
  trends_keyword?: string | null;
  product_patterns?: string[];
  products_url?: string | null;
  platform?: string | null;
  currency?: string;
  notes?: string | null;
  news_enabled?: boolean;
  sitemap_enabled?: boolean;
  trends_enabled?: boolean;
  scrape_enabled?: boolean;
  in_scorecard?: boolean;
  is_focus?: boolean;
}

interface Newspaper {
  recipients?: string[];
  masthead?: string;
  subtitle?: string;
  send_day?: string;
  sections?: Record<string, boolean>;
}

const TIERS = ['focus', 'strength_peer', 'apparel', 'athleisure', 'peer'];
const FLAGS: { key: keyof Brand; label: string }[] = [
  { key: 'news_enabled', label: 'News' },
  { key: 'sitemap_enabled', label: 'Sitemap' },
  { key: 'trends_enabled', label: 'Trends' },
  { key: 'scrape_enabled', label: 'Scrape' },
  { key: 'in_scorecard', label: 'Scorecard' },
];

const EMPTY: Brand = {
  slug: '', name: '', tier: 'apparel', website: '', news_search: '',
  sitemap_url: '', trends_keyword: '', product_patterns: ['/products/'],
  currency: 'USD', platform: 'shopify', notes: '',
  news_enabled: true, sitemap_enabled: true, trends_enabled: true,
  scrape_enabled: true, in_scorecard: true, is_focus: false,
};

export default function ConfigPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [authing, setAuthing] = useState(false);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [paper, setPaper] = useState<Newspaper>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Restore token
  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    const exp = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    if (t && exp && new Date(exp).getTime() > Date.now()) setToken(t);
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function load() {
    setLoading(true);
    setError(null);
    fetch(`${PULSE_API}/pulse/brands`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => {
        const sorted = (j.brands || []).sort((a: Brand, b: Brand) =>
          a.name.localeCompare(b.name));
        setBrands(sorted);
        setPaper(j.newspaper || {});
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setAuthing(true);
    setAuthErr(null);
    try {
      const r = await fetch(`${PULSE_API}/pulse/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const j = await r.json();
      if (!r.ok || !j.token) throw new Error(j.error || 'Invalid password');
      sessionStorage.setItem(TOKEN_KEY, j.token);
      if (j.expires_at) sessionStorage.setItem(TOKEN_EXPIRY_KEY, j.expires_at);
      setToken(j.token);
    } catch (e) {
      setAuthErr(String(e instanceof Error ? e.message : e));
    } finally {
      setAuthing(false);
    }
  }

  function toast(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  async function saveBrand(b: Brand) {
    setSaving(true);
    try {
      const r = await fetch(`${PULSE_API}/pulse/brands`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...b, product_patterns: b.product_patterns }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      toast(`${j.new ? 'Added' : 'Saved'} ${b.name}`);
      setEditing(null);
      load();
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag(b: Brand, key: keyof Brand) {
    await saveBrand({ ...b, [key]: !b[key] });
  }

  async function del(b: Brand) {
    if (!confirm(`Remove ${b.name} from tracking?`)) return;
    try {
      const r = await fetch(`${PULSE_API}/pulse/brands/${b.slug}/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast(`Removed ${b.name}`);
      load();
    } catch (e) {
      alert(`Delete failed: ${e}`);
    }
  }

  async function saveNewspaper(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${PULSE_API}/pulse/newspaper`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: paper.recipients,
          masthead: paper.masthead,
          subtitle: paper.subtitle,
          sections: paper.sections,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast('Newspaper settings saved');
    } catch (e) {
      alert(`Save failed: ${e}`);
    } finally {
      setSaving(false);
    }
  }

  // ---- Sign-in gate -------------------------------------------------------
  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-gr-surface border border-gr-border rounded-md p-8">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">Brand Config</p>
          <h1 className="text-2xl font-bold text-gr-text mb-2">Sign in</h1>
          <p className="text-gr-muted text-sm mb-6">Editing tracked competitors is password-protected.</p>
          <form onSubmit={signIn} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text focus:outline-none focus:border-gr-accent"
            />
            {authErr && <p className="text-sm text-gr-danger">{authErr}</p>}
            <button
              type="submit"
              disabled={authing || !password}
              className="w-full px-4 py-2 rounded bg-gr-accent text-gr-text font-bold uppercase tracking-wider text-sm disabled:opacity-50"
            >
              {authing ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- Main ---------------------------------------------------------------
  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">Brand Config</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">Tracked competitors</h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          The single source of truth for who competitive-intel watches. Add a brand and it wires
          into news, sitemap velocity, trends, catalog scraping, and the scorecard on the next run.
        </p>
      </header>

      {flash && (
        <div className="fixed top-20 right-6 z-50 bg-gr-success/20 text-gr-success border border-gr-success/40 rounded px-4 py-2 text-sm font-semibold">
          {flash}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gr-subtle">{brands.length} brands tracked</p>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="px-4 py-2 rounded bg-gr-accent text-gr-text font-bold uppercase tracking-wider text-xs"
        >
          + Add brand
        </button>
      </div>

      {error && <p className="text-sm text-gr-danger">{error}</p>}
      {loading && <p className="text-sm text-gr-subtle">Loading…</p>}

      {/* Brand table */}
      <div className="bg-gr-surface border border-gr-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gr-border text-left">
              <th className="px-4 py-3 text-[11px] uppercase tracking-wider font-bold text-gr-muted">Brand</th>
              <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-bold text-gr-muted">Tier</th>
              {FLAGS.map((f) => (
                <th key={f.key} className="px-2 py-3 text-[11px] uppercase tracking-wider font-bold text-gr-muted text-center">{f.label}</th>
              ))}
              <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-bold text-gr-muted text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.slug} className="border-b border-gr-border/50 hover:bg-gr-raised/40">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gr-text flex items-center gap-2">
                    {b.name}
                    {b.is_focus && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gr-accent-soft text-gr-accent">FOCUS</span>}
                    {b.currency && b.currency !== 'USD' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gr-raised text-gr-subtle">{b.currency}</span>}
                  </div>
                  <div className="text-xs text-gr-subtle font-mono">{b.slug}</div>
                </td>
                <td className="px-3 py-3 text-gr-muted text-xs">{b.tier}</td>
                {FLAGS.map((f) => (
                  <td key={f.key} className="px-2 py-3 text-center">
                    <button
                      onClick={() => toggleFlag(b, f.key)}
                      title={`Toggle ${f.label}`}
                      className={`w-5 h-5 rounded-full border transition ${
                        b[f.key]
                          ? 'bg-gr-success/30 border-gr-success'
                          : 'bg-gr-raised border-gr-border'
                      }`}
                    />
                  </td>
                ))}
                <td className="px-3 py-3 text-right">
                  <button onClick={() => setEditing(b)} className="text-gr-accent hover:underline text-xs font-semibold">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Newspaper settings */}
      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <h2 className="text-xl font-bold text-gr-text mb-1">Weekly newspaper</h2>
        <p className="text-gr-muted text-sm mb-5">Who gets the Monday field report and how it reads.</p>
        <form onSubmit={saveNewspaper} className="space-y-4 max-w-2xl">
          <Field label="Recipients (comma or newline separated)">
            <textarea
              rows={2}
              value={(paper.recipients || []).join('\n')}
              onChange={(e) => setPaper({ ...paper, recipients: e.target.value.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean) })}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent"
            />
          </Field>
          <Field label="Masthead">
            <input value={paper.masthead || ''} onChange={(e) => setPaper({ ...paper, masthead: e.target.value })}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="Subtitle">
            <input value={paper.subtitle || ''} onChange={(e) => setPaper({ ...paper, subtitle: e.target.value })}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
          {paper.sections && (
            <Field label="Sections">
              <div className="flex flex-wrap gap-2">
                {Object.keys(paper.sections).map((k) => (
                  <button key={k} type="button"
                    onClick={() => setPaper({ ...paper, sections: { ...paper.sections, [k]: !paper.sections![k] } })}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${
                      paper.sections![k] ? 'bg-gr-accent-soft text-gr-accent border-gr-accent/40' : 'bg-gr-raised text-gr-subtle border-gr-border'
                    }`}>
                    {k.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded bg-gr-accent text-gr-text font-bold uppercase tracking-wider text-xs disabled:opacity-50">
            Save newspaper
          </button>
        </form>
      </section>

      {/* Edit / add modal */}
      {editing && (
        <BrandEditor
          brand={editing}
          saving={saving}
          onCancel={() => setEditing(null)}
          onSave={saveBrand}
          onDelete={editing.slug && brands.some((b) => b.slug === editing.slug) ? () => del(editing) : undefined}
          isNew={!brands.some((b) => b.slug === editing.slug)}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider font-bold text-gr-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function BrandEditor({ brand, saving, onCancel, onSave, onDelete, isNew }: {
  brand: Brand; saving: boolean; onCancel: () => void;
  onSave: (b: Brand) => void; onDelete?: () => void; isNew: boolean;
}) {
  const [b, setB] = useState<Brand>({ ...brand });
  const set = (k: keyof Brand, v: unknown) => setB({ ...b, [k]: v });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-10 px-4">
      <div className="bg-gr-surface border border-gr-border rounded-md p-6 w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gr-text">{isNew ? 'Add brand' : `Edit ${brand.name}`}</h2>
          <button onClick={onCancel} className="text-gr-subtle hover:text-gr-text text-2xl leading-none">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Slug (lowercase, no spaces)">
            <input value={b.slug} disabled={!isNew}
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm font-mono disabled:opacity-60 focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="Name">
            <input value={b.name} onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="Tier">
            <select value={b.tier} onChange={(e) => set('tier', e.target.value)}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent">
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Currency">
            <input value={b.currency || 'USD'} onChange={(e) => set('currency', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="Website">
            <input value={b.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://brand.com"
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="News search">
            <input value={b.news_search || ''} onChange={(e) => set('news_search', e.target.value)}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="Sitemap URL">
            <input value={b.sitemap_url || ''} onChange={(e) => set('sitemap_url', e.target.value)} placeholder="https://brand.com/sitemap.xml"
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="Trends keyword">
            <input value={b.trends_keyword || ''} onChange={(e) => set('trends_keyword', e.target.value)}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="Product URL patterns (comma sep)">
            <input value={(b.product_patterns || []).join(', ')}
              onChange={(e) => set('product_patterns', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm font-mono focus:outline-none focus:border-gr-accent" />
          </Field>
          <Field label="Platform">
            <input value={b.platform || ''} onChange={(e) => set('platform', e.target.value)} placeholder="shopify / sfcc / other"
              className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
          </Field>
        </div>

        <Field label="Notes">
          <input value={b.notes || ''} onChange={(e) => set('notes', e.target.value)}
            className="w-full px-3 py-2 rounded bg-gr-raised border border-gr-border text-gr-text text-sm focus:outline-none focus:border-gr-accent" />
        </Field>

        <div className="flex flex-wrap gap-2">
          {([
            ['news_enabled', 'News'], ['sitemap_enabled', 'Sitemap'], ['trends_enabled', 'Trends'],
            ['scrape_enabled', 'Scrape catalog'], ['in_scorecard', 'Scorecard'], ['is_focus', 'Focus brand'],
          ] as [keyof Brand, string][]).map(([k, label]) => (
            <button key={k} type="button" onClick={() => set(k, !b[k])}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition ${
                b[k] ? 'bg-gr-accent-soft text-gr-accent border-gr-accent/40' : 'bg-gr-raised text-gr-subtle border-gr-border'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          {onDelete ? (
            <button onClick={onDelete} className="px-3 py-2 rounded bg-gr-danger/20 text-gr-danger text-xs font-bold uppercase tracking-wider">Delete</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 rounded bg-gr-raised text-gr-muted text-xs font-bold uppercase tracking-wider">Cancel</button>
            <button
              onClick={() => onSave(b)}
              disabled={saving || !b.slug || !b.name}
              className="px-4 py-2 rounded bg-gr-accent text-gr-text text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
