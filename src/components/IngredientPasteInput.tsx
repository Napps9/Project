'use client';

import { useState, useMemo } from 'react';
import { FvnForm, ParsedIngredientState } from '@/lib/types';
import { loadFvnOverrides } from '@/lib/storage';
import { calculateFvnFromState, isEffectivelyFvn } from '@/lib/rules/fvn-classifier';

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

      // Apply learned FVN overrides
      const overrides = loadFvnOverrides();
      const overrideMap = new Map(overrides.map((o) => [o.name, o]));

      const parsed: ParsedIngredientState[] = data.ingredients.map(
        (ing: ParsedIngredientState) => {
          const normalised = ing.name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
          const override = overrideMap.get(normalised);

          if (override) {
            return {
              ...ing,
              isFvn: override.isFvn,
              category: override.isFvn ? override.category : 'none',
              recognition: override.isFvn ? 'recognized_fvn' as const : 'recognized_non_fvn' as const,
              form: override.form ?? (override.isFvn ? 'fresh' : 'none'),
              userVote: null,
            };
          }

          return { ...ing, form: ing.form ?? 'none', userVote: null };
        }
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
      { name: '', proportion: 0, isFvn: false, category: 'none', recognition: 'unrecognized', form: 'none', userVote: null },
    ]);
  };

  /** Promote ingredient to FVN (thumbs up) */
  const handleThumbsUp = (index: number) => {
    const ing = ingredients[index];
    if (isEffectivelyFvn(ing)) return; // already FVN, no-op
    const updates: Partial<ParsedIngredientState> = {
      userVote: 'up' as const,
      isFvn: true,
      recognition: 'recognized_fvn' as const,
      form: (ing.form === 'excluded' || ing.form === 'none') ? 'fresh' : ing.form,
    };
    // Set a default category if the ingredient had none
    if (!ing.category || ing.category === 'none') {
      updates.category = 'fruit';
    }
    updateIngredient(index, updates);
  };

  /** Reject ingredient from FVN (thumbs down) */
  const handleThumbsDown = (index: number) => {
    if (!isEffectivelyFvn(ingredients[index])) return; // already non-FVN, no-op
    updateIngredient(index, { userVote: 'down' as const });
  };

  /** Change the FVN category for an ingredient (e.g. nut → fruit) */
  const handleCategoryChange = (index: number, newCategory: string) => {
    const defaultForm: FvnForm = newCategory === 'nut' ? 'nut' : 'fresh';
    updateIngredient(index, {
      category: newCategory,
      form: defaultForm,
      isFvn: true,
      recognition: 'recognized_fvn' as const,
      userVote: 'up' as const,
    });
  };

  /** Change the FVN form for an ingredient (fresh vs dried ×2) */
  const handleFormChange = (index: number, newForm: string) => {
    updateIngredient(index, {
      form: newForm as FvnForm,
      userVote: 'up' as const,
    });
  };

  const { totalProportion, unknownCount, liveFvnPct, liveBreakdown, hasValid } = useMemo(() => {
    let total = 0;
    let unknown = 0;
    const valid: ParsedIngredientState[] = [];
    for (const ing of ingredients) {
      total += ing.proportion;
      if (ing.name.trim()) {
        valid.push(ing);
        if (ing.recognition === 'unrecognized') unknown++;
      }
    }
    const { fvnPercentage, breakdown } = calculateFvnFromState(valid);
    return { totalProportion: total, unknownCount: unknown, liveFvnPct: fvnPercentage, liveBreakdown: breakdown, hasValid: valid.length > 0 };
  }, [ingredients]);

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
      <div className="flex flex-col gap-1">
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
        {hasValid && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Standard FVN: {liveBreakdown.standardFvn.toFixed(1)}%</span>
            <span>&middot;</span>
            <span>Dried (&times;2): {liveBreakdown.driedAndConcentrated.toFixed(1)}%</span>
            <span>&middot;</span>
            <span>Other: {liveBreakdown.other.toFixed(1)}%</span>
            <span>&middot;</span>
            <span className="font-medium text-gray-700">Effective FVN: {liveFvnPct.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {ingredients.map((ing, i) => {
          const effectiveFvn = isEffectivelyFvn(ing);
          return (
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

              {/* FVN classification area */}
              {ing.name.trim() && (
                effectiveFvn ? (
                  /* Editable category + form selects for FVN ingredients */
                  <div className="flex items-center gap-1">
                    <select
                      value={ing.category !== 'none' ? ing.category : 'fruit'}
                      onChange={(e) => handleCategoryChange(i, e.target.value)}
                      className="text-xs border border-green-200 rounded px-1 py-0.5 bg-green-50 text-green-800"
                      title="FVN category"
                    >
                      <option value="fruit">Fruit</option>
                      <option value="vegetable">Vegetable</option>
                      <option value="nut">Nut</option>
                      <option value="legume">Legume</option>
                    </select>
                    {(ing.category === 'fruit' || ing.category === 'vegetable') && (
                      <select
                        value={ing.form === 'dried' ? 'dried' : 'fresh'}
                        onChange={(e) => handleFormChange(i, e.target.value)}
                        className="text-xs border border-green-200 rounded px-1 py-0.5 bg-green-50 text-green-800"
                        title="Scoring form"
                      >
                        <option value="fresh">fresh</option>
                        <option value="dried">dried ×2</option>
                      </select>
                    )}
                  </div>
                ) : (
                  /* Static badge for non-FVN ingredients */
                  <NonFvnBadge ingredient={ing} />
                )
              )}

              {/* Thumbs — one is always active, reflecting current FVN state */}
              {ing.name.trim() && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleThumbsUp(i)}
                    className={`p-1 rounded transition-colors ${
                      effectiveFvn
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-300 hover:text-green-500'
                    }`}
                    title={effectiveFvn ? 'Counted as FVN' : 'Mark as FVN'}
                  >
                    <ThumbsUpIcon />
                  </button>
                  <button
                    onClick={() => handleThumbsDown(i)}
                    className={`p-1 rounded transition-colors ${
                      !effectiveFvn
                        ? 'text-red-500 bg-red-50'
                        : 'text-gray-300 hover:text-red-500'
                    }`}
                    title={effectiveFvn ? 'Exclude from FVN' : 'Not counted as FVN'}
                  >
                    <ThumbsDownIcon />
                  </button>
                </div>
              )}

              <button
                onClick={() => removeIngredient(i)}
                className="text-red-400 hover:text-red-600 text-sm px-1"
                title="Remove"
              >
                x
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={addIngredient} className="text-sm text-blue-600 hover:text-blue-800">
        + Add ingredient
      </button>
    </div>
  );
}

/** Badge shown for non-FVN ingredients (recognized non-FVN, unknown, excluded, rejected) */
function NonFvnBadge({ ingredient }: { ingredient: ParsedIngredientState }) {
  // Auto-FVN but excluded form (powder/leather/concentrate)
  if (ingredient.isFvn && ingredient.form === 'excluded') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700" title="Processed form excluded per UK NPM guidance">
        excluded (processed)
      </span>
    );
  }
  // Auto-FVN but user rejected it
  if (ingredient.isFvn && ingredient.userVote === 'down') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 line-through">
        FVN ({ingredient.category})
      </span>
    );
  }
  switch (ingredient.recognition) {
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
    default:
      return null;
  }
}

function ThumbsUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}
