'use client';

import { useState, useEffect } from 'react';
import { NutritionData, SavedProduct, ScoreResult, ParsedIngredientState } from '@/lib/types';
import { parseNutritionText } from '@/lib/nutrition-parser';
import { calculateFvnFromState } from '@/lib/rules/fvn-classifier';
import IngredientPasteInput from './IngredientPasteInput';
import ScoreResultDisplay from './ScoreResult';
import SaveProductDialog from './SaveProductDialog';

const emptyNutrition: NutritionData = {
  energyKj: 0,
  saturatedFatG: 0,
  totalSugarG: 0,
  sodiumMg: 0,
  fibreAoacG: 0,
  proteinG: 0,
};

interface Props {
  initialProduct?: SavedProduct | null;
  onSaved?: () => void;
  onNewProduct?: () => void;
}

export default function ProductForm({ initialProduct, onSaved, onNewProduct }: Props) {
  const [isDrink, setIsDrink] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionData>(emptyNutrition);
  const [ingredients, setIngredients] = useState<ParsedIngredientState[]>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [nutritionText, setNutritionText] = useState('');
  const [parseInfo, setParseInfo] = useState<{ found: string[]; notFound: string[] } | null>(null);

  useEffect(() => {
    if (initialProduct) {
      setIsDrink(initialProduct.isDrink);
      setNutrition(initialProduct.nutrition);
      setIngredients(initialProduct.ingredients);
      setResult(initialProduct.result);
      setResetKey((k) => k + 1);
      setNutritionText('');
      setParseInfo(null);
    }
  }, [initialProduct?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    setIsDrink(false);
    setNutrition(emptyNutrition);
    setIngredients([]);
    setResult(null);
    setError('');
    setNutritionText('');
    setParseInfo(null);
    setResetKey((k) => k + 1);
    onNewProduct?.();
  };

  const handleParseNutrition = () => {
    if (!nutritionText.trim()) return;
    const { parsed, found, notFound } = parseNutritionText(nutritionText);
    setNutrition((prev) => ({ ...prev, ...parsed }));
    setParseInfo({ found, notFound });
  };

  const updateNutrition = (field: keyof NutritionData, value: string) => {
    setNutrition((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handleScore = async () => {
    setError('');
    setLoading(true);
    try {
      const validIngredients = ingredients.filter((i) => i.name.trim());
      const { fvnPercentage, breakdown } = calculateFvnFromState(validIngredients);

      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nutrition, fvnPercentage, fvnBreakdown: breakdown, isDrink }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || res.statusText);
      }
      const score = await res.json();
      setResult(score);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isDrink}
            onChange={(e) => setIsDrink(e.target.checked)}
            className="rounded-sm border-zinc-300 dark:border-zinc-600 text-accent focus:ring-accent"
          />
          This is a drink
        </label>
        <button
          onClick={handleReset}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          New Product
        </button>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 mb-3">Nutrition per 100g</h3>

        <div className="mb-4">
          <textarea
            value={nutritionText}
            onChange={(e) => setNutritionText(e.target.value)}
            placeholder="Paste nutrition information here (e.g. Energy: 1500kJ, Sat Fat: 4g, Sugars: 15g, Salt: 1.2g, Fibre: 3g, Protein: 5g)"
            rows={3}
            className="w-full border border-zinc-300 dark:border-zinc-600 rounded-sm px-3 py-2 text-sm bg-white dark:bg-zinc-800 dark:text-zinc-100 resize-y mb-2 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleParseNutrition}
              disabled={!nutritionText.trim()}
              className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-sm hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-50 text-xs font-medium transition-colors"
            >
              Parse Nutrition
            </button>
            {parseInfo && (
              <div className="text-xs">
                {parseInfo.found.length > 0 && (
                  <span className="text-positive dark:text-positive-400">Found: {parseInfo.found.join(', ')}</span>
                )}
                {parseInfo.notFound.length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 ml-2">Not found: {parseInfo.notFound.join(', ')}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <NutrientField label="Energy (kJ)" value={nutrition.energyKj} field="energyKj" onChange={updateNutrition} />
          <NutrientField label="Saturated Fat (g)" value={nutrition.saturatedFatG} field="saturatedFatG" onChange={updateNutrition} />
          <NutrientField label="Total Sugar (g)" value={nutrition.totalSugarG} field="totalSugarG" onChange={updateNutrition} />
          <NutrientField label="Sodium (mg)" value={nutrition.sodiumMg} field="sodiumMg" onChange={updateNutrition} />
          <NutrientField label="Fibre AOAC (g)" value={nutrition.fibreAoacG} field="fibreAoacG" onChange={updateNutrition} />
          <NutrientField label="Protein (g)" value={nutrition.proteinG} field="proteinG" onChange={updateNutrition} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 mb-3">
          Ingredients
          <span className="normal-case tracking-normal font-normal text-zinc-400 dark:text-zinc-500 ml-1">(paste comma-separated list for automatic FVN classification)</span>
        </h3>
        <IngredientPasteInput
          key={resetKey}
          ingredients={ingredients}
          onChange={setIngredients}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-accent bg-accent-50 dark:bg-accent/10 border border-accent/30 px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleScore}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-sm hover:bg-accent-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? 'Calculating...' : 'Calculate Score'}
        </button>
      </div>

      {result && (
        <>
          <ScoreResultDisplay result={result} />
          <SaveProductDialog
            key={result.totalScore + '-' + Date.now()}
            isDrink={isDrink}
            nutrition={nutrition}
            ingredients={ingredients}
            result={result}
            onSaved={() => onSaved?.()}
          />
        </>
      )}
    </div>
  );
}

function NutrientField({
  label,
  value,
  field,
  onChange,
}: {
  label: string;
  value: number;
  field: keyof NutritionData;
  onChange: (field: keyof NutritionData, value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1 font-mono">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(field, e.target.value)}
        className="w-full border border-zinc-300 dark:border-zinc-600 rounded-sm px-2 py-1.5 text-sm font-mono tabular-nums bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
        min={0}
        step={0.1}
      />
    </div>
  );
}
