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
    router.push('/recipes');
  };

  const handleNewProduct = () => {
    router.push('/');
  };

  if (!loaded) {
    return (
      <div className="border border-zinc-300 dark:border-zinc-700 p-8 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading&hellip;
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="border border-zinc-300 dark:border-zinc-700 p-8 text-center">
        <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Recipe not found</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          This recipe may have been deleted.
        </p>
        <Link
          href="/recipes"
          className="inline-block mt-4 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          &larr; Back to Recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/recipes" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
          &larr; Back to Recipes
        </Link>
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{product.name}</h2>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 p-6">
        <ProductForm
          initialProduct={product}
          onSaved={handleSaved}
          onNewProduct={handleNewProduct}
        />
      </div>
    </div>
  );
}
