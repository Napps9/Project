'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { loadProducts } from '@/lib/storage';
import { SavedProduct } from '@/lib/types';

const navCards: Array<{ href: string; label: string; icon: ReactNode }> = [
  {
    href: '/',
    label: 'Score',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10.01" />
        <line x1="12" y1="10" x2="12" y2="10.01" />
        <line x1="16" y1="10" x2="16" y2="10.01" />
        <line x1="8" y1="14" x2="8" y2="14.01" />
        <line x1="12" y1="14" x2="12" y2="14.01" />
        <line x1="16" y1="14" x2="16" y2="14.01" />
        <line x1="8" y1="18" x2="16" y2="18" />
      </svg>
    ),
  },
  {
    href: '/recipes',
    label: 'Recipes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
  {
    href: '/fvn-list',
    label: 'Learned',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="9" y1="18" x2="15" y2="18" />
        <line x1="10" y1="22" x2="14" y2="22" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
      </svg>
    ),
  },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<SavedProduct[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      setAllProducts(loadProducts());
      setSearchQuery('');
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  const displayProducts = searchQuery.trim()
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : allProducts.slice(0, 5);

  const handleProductClick = (product: SavedProduct) => {
    closeMenu();
    router.push(`/recipes/${product.id}`);
  };

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 group text-left"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
        >
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
              UK NPM Food Scoring
            </h1>
            <p className="text-[10px] uppercase tracking-instrument text-zinc-400 dark:text-zinc-500 hidden sm:block">
              Nutrient Profiling Model 2004/2005
            </p>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-200 flex-shrink-0 ${menuOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <>
          <style>{`
            @keyframes cmdBackdropIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes cmdMenuIn { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
          `}</style>

          <div
            onClick={closeMenu}
            className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/70"
            style={{ animation: 'cmdBackdropIn 150ms ease-out' }}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-label="Navigation menu"
            className="fixed inset-x-0 top-[49px] bottom-0 z-[70] bg-white dark:bg-zinc-900 overflow-y-auto
              sm:absolute sm:top-full sm:bottom-auto sm:max-h-[80vh] sm:inset-x-0 sm:max-w-xl sm:mx-auto sm:border sm:border-zinc-300 sm:dark:border-zinc-600 sm:mt-1"
            style={{ animation: 'cmdMenuIn 200ms ease-out' }}
          >
            <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="relative">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Jump to a product..."
                  aria-label="Search products"
                  className="w-full pl-9 pr-4 py-2.5 text-base sm:text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4">
              {navCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  onClick={closeMenu}
                  className={`flex flex-col items-center gap-2 p-3 sm:p-4 border transition-colors ${
                    isActive(card.href)
                      ? 'border-accent bg-accent-50 text-accent dark:bg-accent/10 dark:border-accent dark:text-accent-50'
                      : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-sm ${
                    isActive(card.href)
                      ? 'bg-accent/10 dark:bg-accent/20'
                      : 'bg-white dark:bg-zinc-900'
                  }`}>
                    {card.icon}
                  </div>
                  <span className="text-xs font-medium uppercase tracking-instrument">{card.label}</span>
                </Link>
              ))}
            </div>

            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
              <h3 className="text-[10px] font-medium uppercase tracking-instrument text-zinc-400 dark:text-zinc-500 mb-2">
                {searchQuery.trim() ? 'Matching Products' : 'Recent Products'}
              </h3>
              {displayProducts.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4 text-center">
                  {searchQuery.trim() ? 'No products match.' : 'No saved products yet.'}
                </p>
              ) : (
                <div className="space-y-0.5">
                  {displayProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {product.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium ${
                          product.result.isHfss
                            ? 'bg-accent-50 text-accent dark:bg-accent/10 dark:text-accent-50'
                            : 'bg-positive/10 text-positive dark:text-positive-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 ${product.result.isHfss ? 'bg-accent' : 'bg-positive'}`} />
                          {product.result.isHfss ? 'HFSS' : 'OK'}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono tabular-nums w-6 text-right">
                          {product.result.totalScore}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-zinc-200 dark:border-zinc-700">
              <h3 className="text-[10px] font-medium uppercase tracking-instrument text-zinc-400 dark:text-zinc-500 mb-3">
                Settings
              </h3>
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
