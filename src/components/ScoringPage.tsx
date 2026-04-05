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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Score a Product</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ProductForm
            initialProduct={selectedProduct}
            onSaved={handleSaved}
            onNewProduct={handleNewProduct}
          />
        </div>
      </div>

      <div className="lg:w-80 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Saved Products</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
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
