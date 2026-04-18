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

  // Nutrition paste state
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isDrink}
            onChange={(e) => setIsDrink(e.target.checked)}
            className="rounded"
          />
          This is a drink
        </label>
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          New Product
        </button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Nutrition per 100g</h3>

        {/* Nutrition paste input */}
        <div className="mb-4">
          <textarea
            value={nutritionText}
            onChange={(e) => setNutritionText(e.target.value)}
            placeholder="Paste nutrition information here (e.g. Energy: 1500kJ, Sat Fat: 4g, Sugars: 15g, Salt: 1.2g, Fibre: 3g, Protein: 5g)"
            rows={3}
            className="w-full border rounded px-3 py-2 text-sm resize-y mb-2"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleParseNutrition}
              disabled={!nutritionText.trim()}
              className="px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 text-xs font-medium"
            >
              Parse Nutrition
            </button>
            {parseInfo && (
              <div className="text-xs">
                {parseInfo.found.length > 0 && (
                  <span className="text-green-600">Found: {parseInfo.found.join(', ')}</span>
                )}
                {parseInfo.notFound.length > 0 && (
                  <span className="text-amber-600 ml-2">Not found: {parseInfo.notFound.join(', ')}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NutrientField label="Energy (kJ)" value={nutrition.energyKj} field="energyKj" onChange={updateNutrition} />
          <NutrientField label="Saturated Fat (g)" value={nutrition.saturatedFatG} field="saturatedFatG" onChange={updateNutrition} />
          <NutrientField label="Total Sugar (g)" value={nutrition.totalSugarG} field="totalSugarG" onChange={updateNutrition} />
          <NutrientField label="Sodium (mg)" value={nutrition.sodiumMg} field="sodiumMg" onChange={updateNutrition} />
          <NutrientField label="Fibre AOAC (g)" value={nutrition.fibreAoacG} field="fibreAoacG" onChange={updateNutrition} />
          <NutrientField label="Protein (g)" value={nutrition.proteinG} field="proteinG" onChange={updateNutrition} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Ingredients
          <span className="font-normal text-gray-400 ml-1">(paste comma-separated list for automatic FVN classification)</span>
        </h3>
        <IngredientPasteInput
          key={resetKey}
          ingredients={ingredients}
          onChange={setIngredients}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleScore}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
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
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(field, e.target.value)}
        className="w-full border rounded px-2 py-1.5 text-sm"
        min={0}
        step={0.1}
      />
    </div>
  );
}
