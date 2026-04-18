'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/', label: 'Score' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/fvn-list', label: 'Learned Ingredients' },
];

export default function AppHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">UK NPM Food Scoring</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nutrient Profiling Model (2004/2005) — HFSS Classification
          </p>
        </Link>
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1 mr-2">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isActive(href)
                    ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
