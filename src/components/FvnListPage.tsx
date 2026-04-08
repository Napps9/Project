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
      <div className="text-center py-12 text-gray-500">
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
        <p className="text-sm text-gray-500">
          {overrides.length} learned ingredient{overrides.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={handleClearAll}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Clear All
        </button>
      </div>

      {fvnItems.length > 0 && (
        <section>
          <h2 className="text-md font-semibold text-green-800 mb-3">
            FVN Ingredients ({fvnItems.length})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Form</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Updated</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {fvnItems.map((item) => (
                  <tr key={item.name} className="border-b last:border-0">
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          item.form === 'dried'
                            ? 'bg-orange-100 text-orange-700 font-medium'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.form === 'dried' ? 'dried \u00D72' : item.form}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(item.name)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {nonFvnItems.length > 0 && (
        <section>
          <h2 className="text-md font-semibold text-gray-700 mb-3">
            Non-FVN Ingredients ({nonFvnItems.length})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Updated</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {nonFvnItems.map((item) => (
                  <tr key={item.name} className="border-b last:border-0">
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(item.name)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
