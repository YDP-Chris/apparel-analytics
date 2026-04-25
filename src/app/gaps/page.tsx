'use client';

import { useEffect, useState } from 'react';

type ClassGap = {
  class: string;
  class_name: string;
  department: string;
  division: string;
  we_have: number;
  peer_max_brand: string;
  peer_max_styles: number;
  gap_size: number;
  all_brands: Record<string, number>;
};

type ColorGap = {
  class: string;
  focus_colors_per_style: number;
  focus_styles: number;
  leader: string;
  leader_colors_per_style: number;
  delta: number;
};

type SizeGap = {
  class: string;
  focus_extended_pct: number;
  focus_styles: number;
  leader: string;
  leader_extended_pct: number;
  delta: number;
};

type Gaps = {
  generated_at: string;
  focus_brand: string;
  peers: string[];
  class_gaps: ClassGap[];
  color_depth_gaps: ColorGap[];
  size_coverage_gaps: SizeGap[];
};

export default function GapsPage() {
  const [data, setData] = useState<Gaps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'class' | 'color' | 'size'>('class');

  useEffect(() => {
    fetch('/analysis/gaps.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => setData(d))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gr-bg text-gr-text -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Could not load gaps</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-gr-bg text-gr-muted -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 text-center py-20">
        Loading gap analysis...
      </div>
    );
  }

  const tabs = [
    { id: 'class' as const, label: 'Class gaps', count: data.class_gaps.length },
    { id: 'color' as const, label: 'Color depth', count: data.color_depth_gaps.length },
    { id: 'size' as const, label: 'Size coverage', count: data.size_coverage_gaps.length },
  ];

  // The Read — synthesize the gap landscape into one narrative
  const totalEmptyClasses = data.class_gaps.filter((g) => g.we_have === 0).length;
  const biggestGap = data.class_gaps[0];
  const colorLeader = data.color_depth_gaps[0];
  const colorAvgDelta =
    data.color_depth_gaps.length > 0
      ? (data.color_depth_gaps.reduce((s, g) => s + g.delta, 0) / data.color_depth_gaps.length).toFixed(1)
      : '0';
  const sizeWorst = data.size_coverage_gaps[0];

  return (
    <div className="min-h-screen bg-gr-bg text-gr-text -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-8 max-w-6xl mx-auto">
        <header>
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
            Gymreapers / Gap Analysis
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Where Peers Have Assortment And We Don&apos;t</h1>
          <p className="text-gr-muted mt-3 max-w-3xl">
            Three angles on competitive gaps. Sourced from the SKU cube. Updated{' '}
            {new Date(data.generated_at).toLocaleDateString()}.
          </p>
        </header>

        <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
          <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
          <p className="text-lg text-gr-text leading-relaxed">
            {totalEmptyClasses > 0 && (
              <>
                Peers carry meaningful assortment in <b className="text-gr-accent">{data.class_gaps.length} classes where we have under five styles</b>
                {totalEmptyClasses > 0 && <>, and <b className="text-gr-accent">{totalEmptyClasses} where we have zero</b></>}
                {biggestGap && <>. Biggest opening: <b>{biggestGap.class_name}</b> ({biggestGap.peer_max_brand} {biggestGap.peer_max_styles} vs us {biggestGap.we_have})</>}.
              </>
            )}
            {colorLeader && (
              <> On color depth in apparel we trail the leader by an average of <b className="text-gr-accent">+{colorAvgDelta} colors per style</b> across {data.color_depth_gaps.length} classes; widest gap is {colorLeader.class.replace(/_/g, ' ')} where {colorLeader.leader} runs {colorLeader.leader_colors_per_style.toFixed(1)} vs our {colorLeader.focus_colors_per_style.toFixed(1)}.</>
            )}
            {sizeWorst && (
              <> Size coverage is mostly defended, but {sizeWorst.class.replace(/_/g, ' ')} shows {sizeWorst.leader} at {sizeWorst.leader_extended_pct.toFixed(0)}% extended sizes vs our {sizeWorst.focus_extended_pct.toFixed(0)}%.</>
            )}
          </p>
          <p className="text-gr-muted text-base mt-3 leading-relaxed">
            <span className="text-gr-text font-bold">Decision lens:</span> for each empty-class gap, ask whether
            it&apos;s a deliberate "not our category" call or an oversight. Every &quot;oversight&quot; is roadmap
            input.
          </p>
        </section>

        <div className="flex gap-2 border-b border-gr-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-bold uppercase tracking-[0.15em] transition ${
                tab === t.id
                  ? 'text-gr-accent border-b-2 border-gr-accent'
                  : 'text-gr-muted hover:text-gr-text'
              }`}
            >
              {t.label} <span className="text-gr-subtle ml-1">({t.count})</span>
            </button>
          ))}
        </div>

        {tab === 'class' && (
          <div className="space-y-3">
            {data.class_gaps.length === 0 && (
              <div className="bg-gr-surface border border-gr-border rounded p-6 text-gr-muted">
                No class-level gaps meet the threshold (peer with 5+ styles, focus under 5).
              </div>
            )}
            {data.class_gaps.map((g) => (
              <div key={g.class} className="bg-gr-surface border border-gr-border rounded-md p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-xl font-bold">{g.class_name}</div>
                    <div className="text-xs font-mono text-gr-subtle uppercase tracking-wider mt-1">
                      {g.division} / {g.department}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gr-accent">+{g.gap_size}</div>
                    <div className="text-xs text-gr-muted uppercase tracking-wider">styles to close</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-7 gap-2 text-sm">
                  {Object.entries(g.all_brands).map(([brand, n]) => (
                    <div
                      key={brand}
                      className={`p-3 rounded ${
                        brand === data.focus_brand
                          ? 'bg-gr-raised border border-gr-accent'
                          : 'bg-gr-bg border border-gr-border'
                      }`}
                    >
                      <div className="text-xs text-gr-muted truncate">{brand}</div>
                      <div className={`text-lg font-bold ${brand === data.focus_brand ? 'text-gr-accent' : 'text-gr-text'}`}>{n}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'color' && (
          <div className="space-y-3">
            {data.color_depth_gaps.length === 0 && (
              <div className="bg-gr-surface border border-gr-border rounded p-6 text-gr-muted">
                No color depth gaps meet the threshold.
              </div>
            )}
            {data.color_depth_gaps.map((g) => (
              <div key={g.class} className="bg-gr-surface border border-gr-border rounded-md p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-xl font-bold">{g.class.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                    <div className="text-xs text-gr-muted mt-1">{g.focus_styles} of our styles in this class</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gr-accent">+{g.delta.toFixed(1)}</div>
                    <div className="text-xs text-gr-muted uppercase tracking-wider">colors/style behind</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gr-muted">Us:</span>{' '}
                    <span className="font-bold text-gr-text">{g.focus_colors_per_style.toFixed(1)}</span>
                  </div>
                  <div className="text-gr-subtle">vs</div>
                  <div>
                    <span className="text-gr-muted">{g.leader}:</span>{' '}
                    <span className="font-bold text-gr-text">{g.leader_colors_per_style.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'size' && (
          <div className="space-y-3">
            {data.size_coverage_gaps.length === 0 && (
              <div className="bg-gr-surface border border-gr-border rounded p-6 text-gr-muted">
                No size coverage gaps meet the threshold.
              </div>
            )}
            {data.size_coverage_gaps.map((g) => (
              <div key={g.class} className="bg-gr-surface border border-gr-border rounded-md p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="text-xl font-bold">{g.class.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                    <div className="text-xs text-gr-muted mt-1">{g.focus_styles} of our styles in this class</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gr-accent">+{g.delta.toFixed(0)}pp</div>
                    <div className="text-xs text-gr-muted uppercase tracking-wider">extended-size pct gap</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gr-muted">Us:</span>{' '}
                    <span className="font-bold text-gr-text">{g.focus_extended_pct.toFixed(1)}%</span>
                  </div>
                  <div className="text-gr-subtle">vs</div>
                  <div>
                    <span className="text-gr-muted">{g.leader}:</span>{' '}
                    <span className="font-bold text-gr-text">{g.leader_extended_pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
