'use client';

import { useEffect, useState } from 'react';
import { SavedProduct } from '@/lib/types';
import { loadProducts, deleteProduct } from '@/lib/storage';
import ScoreBadge from './ScoreBadge';

interface Props {
  refreshKey: number;
  selectedId: string | null;
  onSelect: (product: SavedProduct) => void;
  onDeselect: () => void;
}

export default function ProductHistory({ refreshKey, selectedId, onSelect, onDeselect }: Props) {
  const [products, setProducts] = useState<SavedProduct[]>([]);

  useEffect(() => {
    setProducts(loadProducts());
  }, [refreshKey]);

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setProducts(loadProducts());
    if (selectedId === id) {
      onDeselect();
    }
  };

  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
        No saved products yet. Score a product and save it to see it here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect(p)}
          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
            selectedId === p.id
              ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <ScoreBadge isHfss={p.result.isHfss} score={p.result.totalScore} />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(p.savedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(p.id);
            }}
            className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 text-sm ml-2 p-1 transition-colors"
            aria-label={`Delete ${p.name}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
