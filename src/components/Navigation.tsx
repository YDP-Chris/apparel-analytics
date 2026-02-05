'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/vuori', label: 'Vuori Scorecard' },
  { href: '/launches', label: 'Launches' },
  { href: '/mix', label: 'Product Mix' },
  { href: '/colors', label: 'Colors' },
  { href: '/brands', label: 'Brands' },
  { href: '/categories', label: 'Categories' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-socal-sand-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-socal-ocean-500 to-socal-ocean-700 flex items-center justify-center shadow-soft group-hover:shadow-lg transition-shadow">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-semibold text-socal-stone-800">Apparel Intel</span>
              <span className="block text-xs text-socal-stone-400 -mt-0.5">Premium Athleisure Intelligence</span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-socal-ocean-50 text-socal-ocean-700 shadow-sm'
                      : 'text-socal-stone-500 hover:text-socal-stone-800 hover:bg-socal-sand-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
