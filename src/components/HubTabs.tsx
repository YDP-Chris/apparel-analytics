'use client';

/**
 * Shared tab bar that presents a cluster of related pages as one "hub" (Voice of
 * Customer, Where to Play, Pre-launch Radar) without physically merging them —
 * each route keeps its own logic; the tabs just navigate between them. Drop
 * <HubTabs hub="voc" /> at the top of any member page.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = { href: string; label: string };

const HUBS: Record<string, { title: string; tabs: Tab[] }> = {
  voc: {
    title: 'Voice of Customer',
    tabs: [
      { href: '/voc-personas', label: 'Personas' },
      { href: '/cluster-matrix', label: 'Clusters' },
      { href: '/customer-flow', label: 'Switchers' },
      { href: '/copy-mine', label: 'Copy Hooks' },
      { href: '/journey', label: 'Journey' },
      { href: '/voc-complaints', label: 'Complaints' },
      { href: '/gymshark-vulnerability', label: 'Gymshark' },
    ],
  },
  play: {
    title: 'Where to Play',
    tabs: [
      { href: '/apparel-entry-candidates', label: 'Entry Candidates' },
      { href: '/entry-opportunities', label: 'Opportunities' },
      { href: '/three-horizons', label: 'Three Horizons' },
      { href: '/for-product/gaps', label: 'Coverage Gaps' },
    ],
  },
  radar: {
    title: 'Pre-launch Radar',
    tabs: [
      { href: '/prelaunch-radar', label: 'Signals' },
      { href: '/trademarks', label: 'Trademarks' },
      { href: '/patents', label: 'Patents' },
      { href: '/leak-radar', label: 'Leaks' },
    ],
  },
};

export default function HubTabs({ hub }: { hub: keyof typeof HUBS | string }) {
  const pathname = usePathname();
  const cfg = HUBS[hub];
  if (!cfg) return null;
  return (
    <div className="mb-6">
      <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.25em] mb-2">{cfg.title}</p>
      <div className="flex flex-wrap gap-1.5 border-b border-gr-border pb-3">
        {cfg.tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                active ? 'bg-gr-accent text-gr-text' : 'bg-gr-surface text-gr-muted border border-gr-border hover:text-gr-text'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
