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

  const handleThumbsUp = (index: number) => {
    const ing = ingredients[index];
    if (isEffectivelyFvn(ing)) return;
    const updates: Partial<ParsedIngredientState> = {
      userVote: 'up' as const,
      isFvn: true,
      recognition: 'recognized_fvn' as const,
      form: (ing.form === 'excluded' || ing.form === 'none') ? 'fresh' : ing.form,
    };
    if (!ing.category || ing.category === 'none') {
      updates.category = 'fruit';
    }
    updateIngredient(index, updates);
  };

  const handleThumbsDown = (index: number) => {
    if (!isEffectivelyFvn(ingredients[index])) return;
    updateIngredient(index, { userVote: 'down' as const });
  };

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
          className="w-full border border-zinc-300 dark:border-zinc-600 rounded-sm px-3 py-2 text-sm bg-white dark:bg-zinc-800 dark:text-zinc-100 resize-y focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />
        <button
          onClick={handleParse}
          disabled={loading || !rawText.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-sm hover:bg-accent-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? 'Parsing...' : 'Parse Ingredients'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`text-xs font-mono tabular-nums font-medium ${Math.abs(totalProportion - 100) < 0.1 ? 'text-positive dark:text-positive-400' : 'text-amber-600 dark:text-amber-400'}`}>
              Total: {totalProportion.toFixed(1)}%
            </span>
            {unknownCount > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {unknownCount} unknown ingredient{unknownCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={handleReEnter} className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors flex-shrink-0 ml-2">
            Re-enter
          </button>
        </div>
        {hasValid && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            <span>FVN: {liveBreakdown.standardFvn.toFixed(1)}%</span>
            <span className="text-zinc-300 dark:text-zinc-600">&middot;</span>
            <span>Dried: {liveBreakdown.driedAndConcentrated.toFixed(1)}%</span>
            <span className="text-zinc-300 dark:text-zinc-600">&middot;</span>
            <span>Other: {liveBreakdown.other.toFixed(1)}%</span>
            <span className="text-zinc-300 dark:text-zinc-600">&middot;</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Effective: {liveFvnPct.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-2 sm:space-y-1.5">
        {ingredients.map((ing, i) => {
          const effectiveFvn = isEffectivelyFvn(ing);
          return (
            <div key={i} className="border border-zinc-100 dark:border-zinc-800 p-2 sm:p-0 sm:border-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs text-zinc-400 dark:text-zinc-500 w-5 flex-shrink-0 font-mono tabular-nums">{i + 1}.</span>
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                  className="flex-1 min-w-0 border border-zinc-300 dark:border-zinc-600 rounded-sm px-2 py-1.5 text-sm bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
                <input
                  type="number"
                  value={ing.proportion || ''}
                  onChange={(e) => updateIngredient(i, { proportion: parseFloat(e.target.value) || 0 })}
                  className="w-16 sm:w-20 border border-zinc-300 dark:border-zinc-600 rounded-sm px-2 py-1.5 text-sm text-right font-mono tabular-nums bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors flex-shrink-0"
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="%"
                />
                <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:inline">%</span>

                <div className="hidden sm:contents">
                  {ing.name.trim() && (
                    effectiveFvn ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={ing.category !== 'none' ? ing.category : 'fruit'}
                          onChange={(e) => handleCategoryChange(i, e.target.value)}
                          className="text-xs border border-positive/30 rounded-sm px-1 py-0.5 bg-positive/5 text-positive dark:text-positive-400 focus:outline-none focus:ring-1 focus:ring-positive"
                          aria-label={`FVN category for ${ing.name}`}
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
                            className="text-xs border border-positive/30 rounded-sm px-1 py-0.5 bg-positive/5 text-positive dark:text-positive-400 focus:outline-none focus:ring-1 focus:ring-positive"
                            aria-label={`Scoring form for ${ing.name}`}
                          >
                            <option value="fresh">fresh</option>
                            <option value="dried">dried &times;2</option>
                          </select>
                        )}
                      </div>
                    ) : (
                      <NonFvnBadge ingredient={ing} />
                    )
                  )}

                  {ing.name.trim() && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleThumbsUp(i)}
                        className={`p-1.5 rounded-sm transition-colors ${
                          effectiveFvn
                            ? 'text-positive bg-positive/10 dark:text-positive-400'
                            : 'text-zinc-300 hover:text-positive dark:text-zinc-600 dark:hover:text-positive-400'
                        }`}
                        aria-label={effectiveFvn ? `${ing.name} counted as FVN` : `Mark ${ing.name} as FVN`}
                      >
                        <ThumbsUpIcon />
                      </button>
                      <button
                        onClick={() => handleThumbsDown(i)}
                        className={`p-1.5 rounded-sm transition-colors ${
                          !effectiveFvn
                            ? 'text-accent bg-accent/10'
                            : 'text-zinc-300 hover:text-accent dark:text-zinc-600 dark:hover:text-accent'
                        }`}
                        aria-label={effectiveFvn ? `Exclude ${ing.name} from FVN` : `${ing.name} not counted as FVN`}
                      >
                        <ThumbsDownIcon />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeIngredient(i)}
                  className="text-zinc-300 hover:text-accent dark:text-zinc-600 dark:hover:text-accent p-2 sm:p-1.5 transition-colors flex-shrink-0"
                  aria-label={`Remove ${ing.name || 'ingredient'}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {ing.name.trim() && (
                <div className="flex items-center gap-1.5 mt-1.5 ml-6 sm:hidden">
                  {effectiveFvn ? (
                    <div className="flex items-center gap-1 flex-1">
                      <select
                        value={ing.category !== 'none' ? ing.category : 'fruit'}
                        onChange={(e) => handleCategoryChange(i, e.target.value)}
                        className="text-xs border border-positive/30 rounded-sm px-1.5 py-1 bg-positive/5 text-positive dark:text-positive-400 focus:outline-none focus:ring-1 focus:ring-positive"
                        aria-label={`FVN category for ${ing.name}`}
                      >
                        <option value="fruit">Fruit</option>
                        <option value="vegetable">Veg</option>
                        <option value="nut">Nut</option>
                        <option value="legume">Legume</option>
                      </select>
                      {(ing.category === 'fruit' || ing.category === 'vegetable') && (
                        <select
                          value={ing.form === 'dried' ? 'dried' : 'fresh'}
                          onChange={(e) => handleFormChange(i, e.target.value)}
                          className="text-xs border border-positive/30 rounded-sm px-1.5 py-1 bg-positive/5 text-positive dark:text-positive-400 focus:outline-none focus:ring-1 focus:ring-positive"
                          aria-label={`Scoring form for ${ing.name}`}
                        >
                          <option value="fresh">fresh</option>
                          <option value="dried">dried &times;2</option>
                        </select>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1">
                      <NonFvnBadge ingredient={ing} />
                    </div>
                  )}

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleThumbsUp(i)}
                      className={`p-2 rounded-sm transition-colors ${
                        effectiveFvn
                          ? 'text-positive bg-positive/10 dark:text-positive-400'
                          : 'text-zinc-300 hover:text-positive dark:text-zinc-600 dark:hover:text-positive-400'
                      }`}
                      aria-label={effectiveFvn ? `${ing.name} counted as FVN` : `Mark ${ing.name} as FVN`}
                    >
                      <ThumbsUpIcon />
                    </button>
                    <button
                      onClick={() => handleThumbsDown(i)}
                      className={`p-2 rounded-sm transition-colors ${
                        !effectiveFvn
                          ? 'text-accent bg-accent/10'
                          : 'text-zinc-300 hover:text-accent dark:text-zinc-600 dark:hover:text-accent'
                      }`}
                      aria-label={effectiveFvn ? `Exclude ${ing.name} from FVN` : `${ing.name} not counted as FVN`}
                    >
                      <ThumbsDownIcon />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={addIngredient} className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors py-1">
        + Add ingredient
      </button>
    </div>
  );
}

function NonFvnBadge({ ingredient }: { ingredient: ParsedIngredientState }) {
  if (ingredient.isFvn && ingredient.form === 'excluded') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" title="Processed form excluded per UK NPM guidance">
        excluded
      </span>
    );
  }
  if (ingredient.isFvn && ingredient.userVote === 'down') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent line-through">
        FVN ({ingredient.category})
      </span>
    );
  }
  switch (ingredient.recognition) {
    case 'recognized_non_fvn':
      return (
        <span className="text-xs px-1.5 py-0.5 rounded-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
          non-FVN
        </span>
      );
    case 'unrecognized':
      return (
        <span className="text-xs px-1.5 py-0.5 rounded-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
          Unknown
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
