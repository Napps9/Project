import { useState } from 'react';
import { NutritionData, IngredientInput, ScoreResult as ScoreResultType } from '../types';
import { scoreProduct, createProduct } from '../api/client';
import IngredientRow from './IngredientRow';
import ScoreResult from './ScoreResult';

interface Props {
  onProductSaved?: () => void;
}

const emptyNutrition: NutritionData = {
  energyKj: 0,
  saturatedFatG: 0,
  totalSugarG: 0,
  sodiumMg: 0,
  fibreAoacG: 0,
  proteinG: 0,
};

export default function ProductForm({ onProductSaved }: Props) {
  const [productName, setProductName] = useState('');
  const [isDrink, setIsDrink] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionData>(emptyNutrition);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: '', proportion: 0 },
  ]);
  const [result, setResult] = useState<ScoreResultType | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateNutrition = (field: keyof NutritionData, value: string) => {
    setNutrition((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const updateIngredient = (index: number, field: 'name' | 'proportion', value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) =>
        i === index
          ? { ...ing, [field]: field === 'proportion' ? parseFloat(value) || 0 : value }
          : ing
      )
    );
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', proportion: 0 }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const totalProportion = ingredients.reduce((sum, ing) => sum + ing.proportion, 0);

  const handleScore = async () => {
    setError('');
    setLoading(true);
    try {
      const validIngredients = ingredients.filter((i) => i.name.trim());
      const score = await scoreProduct(nutrition, validIngredients, isDrink);
      setResult(score);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      setError('Product name is required to save');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const validIngredients = ingredients.filter((i) => i.name.trim());
      const { score } = await createProduct(productName, nutrition, validIngredients, isDrink);
      setResult(score);
      onProductSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Product meta */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Product name (optional for quick score)"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isDrink}
            onChange={(e) => setIsDrink(e.target.checked)}
            className="rounded"
          />
          Drink
        </label>
      </div>

      {/* Nutrition per 100g */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Nutrition per 100g</h3>
        <div className="grid grid-cols-3 gap-3">
          <NutrientField label="Energy (kJ)" value={nutrition.energyKj} field="energyKj" onChange={updateNutrition} />
          <NutrientField label="Saturated Fat (g)" value={nutrition.saturatedFatG} field="saturatedFatG" onChange={updateNutrition} />
          <NutrientField label="Total Sugar (g)" value={nutrition.totalSugarG} field="totalSugarG" onChange={updateNutrition} />
          <NutrientField label="Sodium (mg)" value={nutrition.sodiumMg} field="sodiumMg" onChange={updateNutrition} />
          <NutrientField label="Fibre AOAC (g)" value={nutrition.fibreAoacG} field="fibreAoacG" onChange={updateNutrition} />
          <NutrientField label="Protein (g)" value={nutrition.proteinG} field="proteinG" onChange={updateNutrition} />
        </div>
      </div>

      {/* Ingredients for FVN */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Ingredients
            <span className="font-normal text-gray-400 ml-1">(for FVN % calculation)</span>
          </h3>
          <span className={`text-xs ${Math.abs(totalProportion - 100) < 0.1 ? 'text-green-600' : 'text-amber-600'}`}>
            Total: {totalProportion.toFixed(1)}%
          </span>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <IngredientRow
              key={i}
              index={i}
              name={ing.name}
              proportion={ing.proportion}
              onChange={updateIngredient}
              onRemove={removeIngredient}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add ingredient
        </button>
      </div>

      {/* Actions */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleScore}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Calculating...' : 'Calculate Score'}
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50 text-sm font-medium"
        >
          Save Product
        </button>
      </div>

      {/* Result */}
      {result && <ScoreResult result={result} />}
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
