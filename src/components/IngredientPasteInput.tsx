'use client';

import { useState } from 'react';
import { ParsedIngredientState } from '@/lib/types';

export type { ParsedIngredientState };

interface Props {
  ingredients: ParsedIngredientState[];
  onChange: (ingredients: ParsedIngredientState[]) => void;
}

export default function IngredientPasteInput({ ingredients, onChange }: Props) {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'input' | 'results'>(
    ingredients.length > 0 ? 'results' : 'input'
  );

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/parse-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      const parsed: ParsedIngredientState[] = data.ingredients.map(
        (ing: ParsedIngredientState) => ({
          ...ing,
          userOverrideFvn: false,
        })
      );
      onChange(parsed);
      setPhase('results');
    } catch {
      // keep input phase on error
    } finally {
      setLoading(false);
    }
  };

  const handleReEnter = () => {
    setPhase('input');
  };

  const updateIngredient = (index: number, updates: Partial<ParsedIngredientState>) => {
    const updated = ingredients.map((ing, i) => (i === index ? { ...ing, ...updates } : ing));
    onChange(updated);
  };

  const removeIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    onChange([
      ...ingredients,
      { name: '', proportion: 0, isFvn: false, category: 'none', recognition: 'unrecognized', userOverrideFvn: false },
    ]);
  };

  const totalProportion = ingredients.reduce((sum, ing) => sum + ing.proportion, 0);
  const unknownCount = ingredients.filter((i) => i.recognition === 'unrecognized' && i.name.trim()).length;

  if (phase === 'input') {
    return (
      <div className="space-y-3">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste ingredients list here, e.g.: tomatoes (40%), sugar, wheat flour, olive oil, garlic, salt, xanthan gum"
          rows={4}
          className="w-full border rounded px-3 py-2 text-sm resize-y"
        />
        <button
          onClick={handleParse}
          disabled={loading || !rawText.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Parsing...' : 'Parse Ingredients'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs ${Math.abs(totalProportion - 100) < 0.1 ? 'text-green-600' : 'text-amber-600'}`}>
            Total: {totalProportion.toFixed(1)}%
          </span>
          {unknownCount > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              {unknownCount} unknown ingredient{unknownCount > 1 ? 's' : ''} — please verify
            </span>
          )}
        </div>
        <button onClick={handleReEnter} className="text-xs text-blue-600 hover:text-blue-800">
          Re-enter ingredients
        </button>
      </div>

      <div className="space-y-1.5">
        {ingredients.map((ing, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
            <input
              type="text"
              value={ing.name}
              onChange={(e) => updateIngredient(i, { name: e.target.value })}
              className="flex-1 border rounded px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              value={ing.proportion || ''}
              onChange={(e) => updateIngredient(i, { proportion: parseFloat(e.target.value) || 0 })}
              className="w-20 border rounded px-2 py-1.5 text-sm text-right"
              min={0}
              max={100}
              step={0.1}
              placeholder="%"
            />
            <span className="text-xs text-gray-400">%</span>

            <RecognitionBadge ingredient={ing} />

            {ing.recognition === 'unrecognized' && ing.name.trim() && (
              <label className="flex items-center gap-1 text-xs text-amber-700 cursor-pointer" title="Manually mark as FVN">
                <input
                  type="checkbox"
                  checked={ing.userOverrideFvn}
                  onChange={(e) => updateIngredient(i, { userOverrideFvn: e.target.checked })}
                  className="rounded"
                />
                FVN
              </label>
            )}

            <button
              onClick={() => removeIngredient(i)}
              className="text-red-400 hover:text-red-600 text-sm px-1"
              title="Remove"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <button onClick={addIngredient} className="text-sm text-blue-600 hover:text-blue-800">
        + Add ingredient
      </button>
    </div>
  );
}

function RecognitionBadge({ ingredient }: { ingredient: ParsedIngredientState }) {
  if (!ingredient.name.trim()) return null;

  switch (ingredient.recognition) {
    case 'recognized_fvn':
      return (
        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
          FVN ({ingredient.category})
        </span>
      );
    case 'recognized_non_fvn':
      return (
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          non-FVN
        </span>
      );
    case 'unrecognized':
      return (
        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
          Unknown — verify
        </span>
      );
  }
}
