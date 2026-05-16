'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/usage';

type Cls = {
  slug: string;
  name: string;
  description?: string;
  default_facets?: Record<string, string>;
  match_rules?: string[];
};

type Dept = {
  slug: string;
  name: string;
  description?: string;
  classes: Cls[];
};

type Div = {
  slug: string;
  name: string;
  description?: string;
  departments: Dept[];
};

type Facet = {
  key: string;
  name: string;
  description?: string;
  type: string;
  values?: string[];
  required?: boolean;
};

type Channel = {
  slug: string;
  name: string;
  type: string;
  url_root?: string;
  notes?: string;
};

type Canonical = {
  version: string;
  owner: string;
  purpose: string;
  last_updated: string;
  divisions: Div[];
  facets: Facet[];
  channels: Channel[];
};

export default function TaxonomyPage() {
  const [data, setData] = useState<Canonical | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openDiv, setOpenDiv] = useState<string | null>(null);

  useEffect(() => {
    fetch('/canonical.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => setData(d))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gr-bg text-gr-text -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-3">Could not load taxonomy</h1>
          <p className="text-gr-muted">{error}</p>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-gr-bg text-gr-muted -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 sm:px-6 lg:px-8 text-center py-20">
        Loading canonical taxonomy...
      </div>
    );
  }

  const totalClasses = data.divisions.reduce(
    (s, d) => s + d.departments.reduce((s2, dept) => s2 + dept.classes.length, 0),
    0,
  );
  const totalDepts = data.divisions.reduce((s, d) => s + d.departments.length, 0);

  return (
    <div className="min-h-screen bg-gr-bg text-gr-text -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-12 max-w-5xl mx-auto">
        <header className="text-center pt-4">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
            Gymreapers / Data &amp; Analytics
          </p>
          <h1 className="text-5xl font-bold tracking-tight mb-4">Canonical Product Taxonomy</h1>
          <p className="text-lg text-gr-muted leading-relaxed max-w-3xl mx-auto">{data.purpose}</p>
          <div className="mt-5 text-xs text-gr-subtle uppercase tracking-wider font-mono">
            v{data.version} &middot; updated {data.last_updated} &middot; {data.owner}
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Divisions', value: data.divisions.length },
            { label: 'Departments', value: totalDepts },
            { label: 'Classes', value: totalClasses },
            { label: 'Facets', value: data.facets.length },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-gr-surface border border-gr-border rounded-md p-6 text-center"
            >
              <div className="text-4xl font-bold text-gr-text">{s.value}</div>
              <div className="text-xs text-gr-muted uppercase tracking-[0.2em] mt-2 font-mono">
                {s.label}
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-3">
            How to read this
          </h2>
          <div className="bg-gr-surface border border-gr-border rounded-md p-6 space-y-4 text-gr-muted leading-relaxed">
            <p>
              Every product follows the same path. Above the line is the hierarchy: how we organize. Below the
              line is the SKU: the orderable unit. Variations like gender, tier, and material live in{' '}
              <span className="font-semibold text-gr-text">facets</span>, never in the hierarchy.
            </p>

            <div className="bg-gr-bg border border-gr-border rounded-md p-5 font-mono text-sm">
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-gr-accent font-bold w-24 inline-block uppercase tracking-wider text-xs">
                    Division
                  </span>
                  <span className="text-gr-text">Equipment &amp; Gear</span>
                </div>
                <div className="flex items-baseline gap-3 pl-4">
                  <span className="text-gr-subtle">└─</span>
                  <span className="text-gr-accent font-bold w-20 uppercase tracking-wider text-xs">
                    Department
                  </span>
                  <span className="text-gr-text">Belts</span>
                </div>
                <div className="flex items-baseline gap-3 pl-8">
                  <span className="text-gr-subtle">└─</span>
                  <span className="text-gr-accent font-bold w-16 uppercase tracking-wider text-xs">
                    Class
                  </span>
                  <span className="text-gr-text">Lever Belts</span>
                </div>
                <div className="flex items-baseline gap-3 pl-12">
                  <span className="text-gr-subtle">└─</span>
                  <span className="text-gr-accent font-bold w-16 uppercase tracking-wider text-xs">
                    Style
                  </span>
                  <span className="text-gr-text">Crest Lever Belt</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gr-border my-4 -mx-5"></div>

              <div className="space-y-2">
                <div className="text-xs text-gr-subtle uppercase tracking-[0.2em] mb-2 font-mono">
                  SKU = Style &times; Color &times; Size
                </div>
                <div className="flex items-baseline gap-3 pl-16">
                  <span className="text-gr-subtle">└─</span>
                  <span className="text-gr-accent font-bold w-12 uppercase tracking-wider text-xs">SKU</span>
                  <span className="text-gr-text">Crest Lever Belt &middot; Black &middot; 32in</span>
                </div>
                <div className="flex items-baseline gap-3 pl-16">
                  <span className="text-gr-subtle">└─</span>
                  <span className="text-gr-accent font-bold w-12 uppercase tracking-wider text-xs">SKU</span>
                  <span className="text-gr-text">Crest Lever Belt &middot; Black &middot; 36in</span>
                </div>
                <div className="flex items-baseline gap-3 pl-16">
                  <span className="text-gr-subtle">└─</span>
                  <span className="text-gr-accent font-bold w-12 uppercase tracking-wider text-xs">SKU</span>
                  <span className="text-gr-text">Crest Lever Belt &middot; Brown &middot; 32in</span>
                </div>
                <div className="flex items-baseline gap-3 pl-16 text-gr-subtle">
                  <span>...</span>
                </div>
              </div>
            </div>

            <p className="text-sm">
              <span className="text-gr-text font-semibold">Color</span> and{' '}
              <span className="text-gr-text font-semibold">Size</span> are the two dimensions that turn a Style
              into orderable inventory. Color isn&apos;t in the hierarchy because a Style usually comes in many
              colors. Size isn&apos;t either, for the same reason.
            </p>

            <p>
              Channels (Shopify, Amazon, GNC) <em>map into</em> this hierarchy. They never own it. Adding a
              new channel later is a one-table change, not a re-org.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-4">Hierarchy</h2>
          <div className="space-y-3">
            {data.divisions.map((div) => (
              <div
                key={div.slug}
                className="bg-gr-surface border border-gr-border rounded-md overflow-hidden hover:border-gr-border-strong transition"
              >
                <button
                  onClick={() => setOpenDiv(openDiv === div.slug ? null : div.slug)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gr-raised transition"
                >
                  <div className="flex-1">
                    <div className="text-xl font-bold text-gr-text uppercase tracking-wide">
                      {div.name}
                    </div>
                    {div.description && (
                      <div className="text-sm text-gr-muted mt-1">{div.description}</div>
                    )}
                  </div>
                  <div className="text-xs text-gr-subtle font-mono uppercase tracking-wider">
                    {div.departments.length} dept &middot;{' '}
                    {div.departments.reduce((s, d) => s + d.classes.length, 0)} cls
                  </div>
                </button>
                {openDiv === div.slug && (
                  <div className="border-t border-gr-border bg-gr-raised px-6 py-5 space-y-5">
                    {div.departments.map((dept) => (
                      <div key={dept.slug}>
                        <div className="font-bold text-gr-text uppercase text-sm tracking-wide">
                          {dept.name}
                        </div>
                        {dept.description && (
                          <div className="text-xs text-gr-muted mb-2 mt-1">{dept.description}</div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {dept.classes.map((cls) => (
                            <div
                              key={cls.slug}
                              className="inline-flex items-center gap-2 bg-gr-bg border border-gr-border rounded-full px-3 py-1.5 text-sm hover:border-gr-accent transition"
                              title={cls.match_rules?.join(', ') || ''}
                            >
                              <span className="text-gr-text">{cls.name}</span>
                              {cls.default_facets && Object.keys(cls.default_facets).length > 0 && (
                                <span className="text-xs text-gr-subtle font-mono">
                                  {Object.entries(cls.default_facets)
                                    .map(([k, v]) => `${k}=${v}`)
                                    .join(' ')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-3">Facets</h2>
          <p className="text-gr-muted mb-4 text-sm">
            Orthogonal product attributes. Filterable across the hierarchy. Never encoded into Class names.
          </p>
          <div className="bg-gr-surface border border-gr-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gr-raised text-gr-muted uppercase text-xs tracking-[0.15em] font-mono">
                <tr>
                  <th className="text-left px-4 py-3">Facet</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Values</th>
                  <th className="text-left px-4 py-3">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gr-border">
                {data.facets.map((f) => (
                  <tr key={f.key} className="hover:bg-gr-raised transition">
                    <td className="px-4 py-4">
                      <div className="font-bold text-gr-text">{f.name}</div>
                      <div className="text-xs text-gr-subtle font-mono">{f.key}</div>
                      {f.description && (
                        <div className="text-xs text-gr-muted mt-1">{f.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gr-muted font-mono text-xs">{f.type}</td>
                    <td className="px-4 py-4 text-gr-muted">
                      {f.values && f.values.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {f.values.map((v) => (
                            <span
                              key={v}
                              className="text-xs bg-gr-bg border border-gr-border px-2 py-0.5 rounded text-gr-muted"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gr-subtle">free-form</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {f.required ? (
                        <span className="text-xs text-gr-accent font-bold uppercase tracking-wider">
                          required
                        </span>
                      ) : (
                        <span className="text-xs text-gr-subtle">no</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-3">Channels</h2>
          <p className="text-gr-muted mb-4 text-sm">
            Each channel maps into this canonical hierarchy via its own translation table. Adding a channel
            is a one-table change.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {data.channels.map((c) => (
              <div
                key={c.slug}
                className="bg-gr-surface border border-gr-border rounded-md p-5 hover:border-gr-accent transition"
              >
                <div className="text-lg font-bold text-gr-text uppercase tracking-wide">{c.name}</div>
                <div className="text-xs text-gr-subtle font-mono mt-1">{c.slug}</div>
                <div className="text-xs uppercase tracking-[0.2em] text-gr-accent font-bold mt-3">
                  {c.type}
                </div>
                {c.notes && <div className="text-sm text-gr-muted mt-3 leading-relaxed">{c.notes}</div>}
                {c.url_root && (
                  <a
                    href={c.url_root}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('outbound', { label: 'product_link', metadata: { href: (c.url_root || '').slice(0, 200) } })}
                    className="text-xs text-gr-accent mt-3 inline-block hover:text-gr-accent-hover hover:underline font-mono"
                  >
                    {c.url_root}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gr-surface border border-gr-border rounded-md p-6">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-3">
            Want to dig deeper?
          </h2>
          <p className="text-gr-muted text-sm leading-relaxed">
            The full reference docs live in the data team&apos;s repo:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-gr-muted">
            <li>
              <span className="font-mono text-xs text-gr-text">taxonomy/DOCUMENTATION.md</span> &mdash;
              system overview and data model
            </li>
            <li>
              <span className="font-mono text-xs text-gr-text">taxonomy/CLASSIFICATION.md</span> &mdash;
              decision rules for placing new products
            </li>
            <li>
              <span className="font-mono text-xs text-gr-text">taxonomy/EXECUTIVE_BRIEF.md</span> &mdash;
              the leadership one-pager
            </li>
            <li>
              <span className="font-mono text-xs text-gr-text">taxonomy/canonical.json</span> &mdash; the
              machine-readable source of truth
            </li>
          </ul>
          <p className="text-gr-subtle mt-5 text-xs uppercase tracking-wider">
            Questions, classification disputes, or new Class proposals: ping Chris.
          </p>
        </section>
      </div>
    </div>
  );
}
