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
      <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">
        No saved products yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {products.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect(p)}
          className={`flex items-center justify-between p-3 border cursor-pointer transition-colors ${
            selectedId === p.id
              ? 'border-accent bg-accent-50/50 dark:border-accent dark:bg-accent/5'
              : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{p.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <ScoreBadge isHfss={p.result.isHfss} score={p.result.totalScore} />
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono tabular-nums">
                {new Date(p.savedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(p.id);
            }}
            className="text-zinc-300 hover:text-accent dark:text-zinc-600 dark:hover:text-accent text-sm ml-2 p-1 transition-colors"
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
