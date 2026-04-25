'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Gymreapers-focused IA. Every route serves a question about winning the
// Gymreapers customer or market. Old apparel-intel routes (/vuori, /briefs,
// /meta, /inventory, /mix, /brands) still exist as files but are not in nav.
const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/decisions', label: 'Decisions' },
  { href: '/gymreapers', label: 'Scorecard' },
  { href: '/gymreapers/mix', label: 'Mix' },
  { href: '/gaps', label: 'Gaps' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/whitespace', label: 'White Space' },
  { href: '/landscape', label: 'Landscape' },
  { href: '/radar', label: 'Radar' },
  { href: '/gymreapers/launches', label: 'Launches' },
  { href: '/gymreapers/social', label: 'Social' },
  { href: '/gymreapers/jobs', label: 'Jobs' },
  { href: '/brands', label: 'Brands' },
  { href: '/taxonomy', label: 'Taxonomy' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-gr-border bg-gr-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gr-accent-hover to-gr-accent flex items-center justify-center">
              <span className="text-gr-text font-bold text-sm tracking-wider">GR</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold text-gr-text uppercase tracking-wider">Gymreapers</span>
              <span className="block text-xs text-gr-subtle -mt-0.5 uppercase tracking-[0.2em]">Data &amp; Analytics</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-[0.15em] transition-all ${
                    isActive
                      ? 'bg-gr-accent-soft text-gr-accent'
                      : 'text-gr-muted hover:text-gr-text hover:bg-gr-raised'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded text-gr-muted hover:text-gr-text hover:bg-gr-raised"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gr-border bg-gr-surface/95 backdrop-blur-md">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded text-sm font-bold uppercase tracking-[0.15em] transition-all ${
                    isActive
                      ? 'bg-gr-accent-soft text-gr-accent'
                      : 'text-gr-muted hover:text-gr-text hover:bg-gr-raised'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
