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
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {overrides.length} learned ingredient{overrides.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={handleClearAll}
          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        >
          Clear All
        </button>
      </div>

      {fvnItems.length > 0 && (
        <section>
          <h2 className="text-md font-semibold text-green-800 dark:text-green-400 mb-3">
            FVN Ingredients ({fvnItems.length})
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Category</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Form</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Updated</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {fvnItems.map((item) => (
                    <tr key={item.name} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            item.form === 'dried'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-medium'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {item.form === 'dried' ? 'dried \u00D72' : item.form}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-xs">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDelete(item.name)}
                          className="text-xs text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
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
          <h2 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Non-FVN Ingredients ({nonFvnItems.length})
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Updated</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {nonFvnItems.map((item) => (
                    <tr key={item.name} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-4 py-2 text-gray-400 dark:text-gray-500 text-xs">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDelete(item.name)}
                          className="text-xs text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
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
