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
      <p className="text-sm text-gray-400 text-center py-8">
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
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <ScoreBadge isHfss={p.result.isHfss} score={p.result.totalScore} />
              <span className="text-xs text-gray-400">
                {new Date(p.savedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(p.id);
            }}
            className="text-gray-300 hover:text-red-500 text-sm ml-2 p-1"
            title="Delete"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
