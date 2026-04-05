'use client';

import { useState } from 'react';
import { NutritionData, ParsedIngredientState, ScoreResult } from '@/lib/types';
import { saveProduct } from '@/lib/storage';

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
    setSaved(true);
    onSaved();
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-3">
        <span className="font-medium">Saved!</span>
        <span className="text-green-600">Product &ldquo;{name}&rdquo; saved to history.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded px-4 py-3">
      <input
        type="text"
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        className="flex-1 border rounded px-2 py-1.5 text-sm"
      />
      <button
        onClick={handleSave}
        disabled={!name.trim()}
        className="px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
      >
        Save Product
      </button>
    </div>
  );
}
