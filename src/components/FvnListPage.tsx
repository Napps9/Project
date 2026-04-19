'use client';

import { useState, useEffect } from 'react';
import { FvnOverride } from '@/lib/types';
import { loadFvnOverrides, deleteFvnOverride } from '@/lib/storage';

export default function FvnListPage() {
  const [overrides, setOverrides] = useState<FvnOverride[]>([]);

  useEffect(() => {
    setOverrides(loadFvnOverrides());
  }, []);

  const fvnItems = overrides.filter((o) => o.isFvn).sort((a, b) => a.name.localeCompare(b.name));
  const nonFvnItems = overrides.filter((o) => !o.isFvn).sort((a, b) => a.name.localeCompare(b.name));

  const handleDelete = (name: string) => {
    deleteFvnOverride(name);
    setOverrides(loadFvnOverrides());
  };

  const handleClearAll = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('npm-scorer:fvn-overrides');
      setOverrides([]);
    }
  };

  if (overrides.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
        <p className="text-lg font-medium">No learned ingredients yet</p>
        <p className="text-sm mt-2">
          Score products and use the thumbs up/down buttons to teach the system about FVN classifications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
          {overrides.length} learned ingredient{overrides.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={handleClearAll}
          className="text-xs text-accent hover:text-accent-700 dark:hover:text-accent-50 transition-colors"
        >
          Clear All
        </button>
      </div>

      {fvnItems.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-instrument text-positive dark:text-positive-400 mb-3">
            FVN Ingredients ({fvnItems.length})
          </h2>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
                  <tr>
                    <th className="text-left px-3 sm:px-4 py-2 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400">Name</th>
                    <th className="text-left px-3 sm:px-4 py-2 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400">Category</th>
                    <th className="text-left px-3 sm:px-4 py-2 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Form</th>
                    <th className="text-left px-3 sm:px-4 py-2 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Updated</th>
                    <th className="w-12 sm:w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {fvnItems.map((item) => (
                    <tr key={item.name} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-3 sm:px-4 py-2 text-zinc-900 dark:text-zinc-100">{item.name}</td>
                      <td className="px-3 sm:px-4 py-2">
                        <span className="text-xs px-1.5 py-0.5 rounded-sm bg-positive/10 text-positive dark:text-positive-400">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 hidden sm:table-cell">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-sm ${
                            item.form === 'dried'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium'
                              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {item.form === 'dried' ? 'dried \u00D72' : item.form}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 text-zinc-400 dark:text-zinc-500 text-xs font-mono tabular-nums hidden md:table-cell">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-4 py-2">
                        <button
                          onClick={() => handleDelete(item.name)}
                          className="text-xs text-zinc-400 hover:text-accent dark:text-zinc-500 dark:hover:text-accent transition-colors p-1"
                          aria-label={`Delete ${item.name}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {nonFvnItems.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 mb-3">
            Non-FVN Ingredients ({nonFvnItems.length})
          </h2>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
                  <tr>
                    <th className="text-left px-3 sm:px-4 py-2 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400">Name</th>
                    <th className="text-left px-3 sm:px-4 py-2 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Updated</th>
                    <th className="w-12 sm:w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {nonFvnItems.map((item) => (
                    <tr key={item.name} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-3 sm:px-4 py-2 text-zinc-900 dark:text-zinc-100">{item.name}</td>
                      <td className="px-3 sm:px-4 py-2 text-zinc-400 dark:text-zinc-500 text-xs font-mono tabular-nums hidden sm:table-cell">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-4 py-2">
                        <button
                          onClick={() => handleDelete(item.name)}
                          className="text-xs text-zinc-400 hover:text-accent dark:text-zinc-500 dark:hover:text-accent transition-colors p-1"
                          aria-label={`Delete ${item.name}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
