'use client';

import { useState } from 'react';
import { SavedProduct } from '@/lib/types';
import ProductForm from './ProductForm';
import ProductHistory from './ProductHistory';

export default function ScoringPage() {
  const [selectedProduct, setSelectedProduct] = useState<SavedProduct | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleSelect = (product: SavedProduct) => {
    setSelectedProduct(product);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 min-w-0">
        <h2 className="text-xs font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 mb-4">Score a Product</h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-6">
          <ProductForm
            initialProduct={selectedProduct}
            onSaved={handleSaved}
            onNewProduct={handleNewProduct}
          />
        </div>
      </div>

      <div className="w-full lg:w-80 flex-shrink-0">
        <h2 className="text-xs font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 mb-4">Saved Products</h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-4 max-h-[60vh] lg:max-h-none overflow-y-auto">
          <ProductHistory
            refreshKey={refreshKey}
            selectedId={selectedProduct?.id ?? null}
            onSelect={handleSelect}
            onDeselect={handleNewProduct}
          />
        </div>
      </div>
    </div>
  );
}
