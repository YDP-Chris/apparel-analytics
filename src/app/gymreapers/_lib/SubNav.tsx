'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGymreapersData } from './GymreapersProvider';

const items = [
  { href: '/gymreapers', label: 'Scorecard' },
  { href: '/gymreapers/mix', label: 'Product Mix' },
  { href: '/gymreapers/launches', label: 'Launches' },
  { href: '/gymreapers/social', label: 'Social' },
  { href: '/gymreapers/jobs', label: 'Jobs' },
];

export default function SubNav() {
  const pathname = usePathname();
  const { signOut, data } = useGymreapersData();

  return (
    <div className="bg-gr-surface rounded-md border border-gr-border px-4 py-2 mb-8 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-gr-accent text-gr-text'
                  : 'text-gr-muted hover:bg-gr-raised'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        {data?.generated_at && (
          <span className="text-xs text-gr-subtle hidden sm:inline">
            Updated {new Date(data.generated_at).toLocaleString()}
          </span>
        )}
        <button
          onClick={signOut}
          className="text-xs text-gr-muted hover:text-gr-text underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
