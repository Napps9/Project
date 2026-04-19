'use client';

import { useState } from 'react';
import { NutritionData, ParsedIngredientState, ScoreResult } from '@/lib/types';
import { saveProduct, saveFvnOverridesFromIngredients } from '@/lib/storage';

interface Props {
  isDrink: boolean;
  nutrition: NutritionData;
  ingredients: ParsedIngredientState[];
  result: ScoreResult;
  onSaved: () => void;
}

export default function SaveProductDialog({ isDrink, nutrition, ingredients, result, onSaved }: Props) {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    saveProduct({ name: name.trim(), isDrink, nutrition, ingredients, result });
    saveFvnOverridesFromIngredients(ingredients);
    setSaved(true);
    onSaved();
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-sm text-positive dark:text-positive-400 bg-positive/5 border border-positive/20 px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className="font-medium">Saved.</span>
        <span className="opacity-80">&ldquo;{name}&rdquo; added to history.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 sm:px-4 py-3">
      <input
        type="text"
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className="flex-1 border border-zinc-300 dark:border-zinc-600 rounded-sm px-3 py-2 sm:py-1.5 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
      />
      <button
        onClick={handleSave}
        disabled={!name.trim()}
        className="px-4 py-2 sm:py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-sm hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-50 text-sm font-medium whitespace-nowrap transition-colors"
      >
        Save Product
      </button>
    </div>
  );
}
