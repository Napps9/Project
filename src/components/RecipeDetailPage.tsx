'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SavedProduct } from '@/lib/types';
import { getProductById } from '@/lib/storage';
import ProductForm from './ProductForm';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [product, setProduct] = useState<SavedProduct | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoaded(true);
      return;
    }
    const p = getProductById(id);
    setProduct(p ?? null);
    setLoaded(true);
  }, [id]);

  const handleSaved = () => {
    // After save, jump back to the directory so the user can see the full list
    router.push('/recipes');
  };

  const handleNewProduct = () => {
    router.push('/');
  };

  if (!loaded) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-500">
        Loading recipe...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-lg font-medium text-gray-700">Recipe not found</p>
        <p className="text-sm text-gray-500 mt-2">
          This recipe may have been deleted, or the link is incorrect.
        </p>
        <Link
          href="/recipes"
          className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/recipes" className="text-sm text-blue-600 hover:text-blue-800">
          ← Back to Recipes
        </Link>
        <h2 className="text-lg font-semibold text-gray-800">{product.name}</h2>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ProductForm
          initialProduct={product}
          onSaved={handleSaved}
          onNewProduct={handleNewProduct}
        />
      </div>
    </div>
  );
}
