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

export interface ScoreResult {
  aPoints: APointsBreakdown;
  cPoints: CPointsBreakdown;
  fvnPercentage: number;
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
  userOverrideFvn: boolean;
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

// ── FVN classification ──

export type FvnCategory = 'fruit' | 'vegetable' | 'nut' | 'legume' | 'none';

export type FvnRecognition = 'recognized_fvn' | 'recognized_non_fvn' | 'unrecognized';

export interface ParsedIngredient {
  name: string;
  proportion: number;
  isFvn: boolean;
  category: FvnCategory;
  recognition: FvnRecognition;
}
