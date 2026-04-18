// ── Nutrition input (per 100g of the product) ──

export interface NutritionData {
  energyKj: number;
  saturatedFatG: number;
  totalSugarG: number;
  sodiumMg: number;
  fibreAoacG: number;
  proteinG: number;
}

// ── Ingredient input (for FVN calculation) ──

export interface IngredientInput {
  name: string;
  proportion: number; // weight % of the product (0-100)
}

// ── Score breakdowns ──

export interface APointsBreakdown {
  energy: number;
  saturatedFat: number;
  sugar: number;
  sodium: number;
  total: number;
}

export interface CPointsBreakdown {
  fruitVegNuts: number;
  fibre: number;
  protein: number;
  /** protein points actually applied (may be 0 due to the A≥11 rule) */
  proteinApplied: number;
  total: number;
}

/**
 * Raw weight shares of the three NPM 2011 FVN buckets.
 * Sum of all three equals the sum of input proportions (≈100 when complete).
 * These are pre-multiplier weights; the ×2 on `driedAndConcentrated` is
 * applied inside the effective `fvnPercentage` formula, not here.
 */
export interface FvnBreakdown {
  /** Fresh/frozen/tinned/juiced/puréed fruit & veg + beans/pulses/coconut/nuts */
  standardFvn: number;
  /** Dried fruit/veg + concentrated tomato purée (counted ×2 in scoring) */
  driedAndConcentrated: number;
  /** Everything else */
  other: number;
}

export interface ScoreResult {
  aPoints: APointsBreakdown;
  cPoints: CPointsBreakdown;
  fvnPercentage: number;
  /** Optional — present on results computed from an ingredient list. */
  fvnBreakdown?: FvnBreakdown;
  totalScore: number;
  isDrink: boolean;
  isHfss: boolean;
  classification: 'healthier' | 'less healthy';
}

// ── Stored models ──

export interface ParsedIngredientState {
  name: string;
  proportion: number;
  isFvn: boolean;
  category: string;
  recognition: FvnRecognition;
  form: FvnForm;
  userVote: 'up' | 'down' | null;
}

export interface SavedProduct {
  id: string;
  name: string;
  isDrink: boolean;
  nutrition: NutritionData;
  ingredients: ParsedIngredientState[];
  result: ScoreResult;
  savedAt: string;
}

// ── FVN learning ──

export interface FvnOverride {
  name: string;
  isFvn: boolean;
  category: string;
  form: FvnForm;
  updatedAt: string;
}

// ── FVN classification ──

export type FvnCategory = 'fruit' | 'vegetable' | 'nut' | 'legume' | 'none';

export type FvnRecognition = 'recognized_fvn' | 'recognized_non_fvn' | 'unrecognized';

/**
 * The form of an FVN ingredient, which determines its scoring weight:
 * - fresh: fresh/frozen/tinned/100% juice → weight × 1
 * - dried: dried fruit/veg or concentrated tomato puree → weight × 2
 * - nut: nuts (commonly called nuts) → weight × 1
 * - excluded: powders, leathers, concentrates → weight × 0 (not counted)
 * - none: not FVN at all
 */
export type FvnForm = 'fresh' | 'dried' | 'nut' | 'excluded' | 'none';

export interface ParsedIngredient {
  name: string;
  proportion: number;
  isFvn: boolean;
  category: FvnCategory;
  recognition: FvnRecognition;
  form: FvnForm;
}
