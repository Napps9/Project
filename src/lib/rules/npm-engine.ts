import { NutritionData, IngredientInput, ScoreResult, FvnBreakdown } from '../types';
import { calculateAPoints, calculateCPoints } from './nutrient-scorer';
import { calculateFvnFromIngredients } from './fvn-classifier';
import {
  FOOD_HFSS_THRESHOLD,
  DRINK_HFSS_THRESHOLD,
  PROTEIN_RULE_A_THRESHOLD,
  PROTEIN_RULE_FVN_REQUIRED,
} from './scoring-tables';

/**
 * Calculate the full UK NPM score for a food product.
 *
 * @param nutrition  - Nutritional values per 100g (provided by user)
 * @param ingredients - List of ingredients with proportions (for FVN calculation)
 * @param isDrink    - Whether the product is a drink
 */
export function calculateNpmScore(
  nutrition: NutritionData,
  ingredients: IngredientInput[],
  isDrink: boolean
): ScoreResult {
  // Step 1: Determine FVN percentage + breakdown from ingredients
  const { fvnPercentage, breakdown } = calculateFvnFromIngredients(ingredients);

  // Step 2: Calculate A and C points
  const aPoints = calculateAPoints(nutrition);
  const cPoints = calculateCPoints(nutrition, fvnPercentage);

  // Step 3: Apply the protein rule
  // If total A ≥ 11, protein only counts if FVN = 5
  let proteinApplied = cPoints.protein;
  if (aPoints.total >= PROTEIN_RULE_A_THRESHOLD && cPoints.fruitVegNuts < PROTEIN_RULE_FVN_REQUIRED) {
    proteinApplied = 0;
  }
  cPoints.proteinApplied = proteinApplied;

  // Step 4: Calculate total C (with adjusted protein)
  const adjustedCTotal = cPoints.fruitVegNuts + cPoints.fibre + proteinApplied;
  cPoints.total = adjustedCTotal;

  // Step 5: Final score
  const totalScore = aPoints.total - adjustedCTotal;

  // Step 6: Classification
  const threshold = isDrink ? DRINK_HFSS_THRESHOLD : FOOD_HFSS_THRESHOLD;
  const isHfss = totalScore >= threshold;

  return {
    aPoints,
    cPoints,
    fvnPercentage,
    fvnBreakdown: breakdown,
    totalScore,
    isDrink,
    isHfss,
    classification: isHfss ? 'less healthy' : 'healthier',
  };
}

/**
 * Quick score from nutrition data + pre-calculated FVN percentage.
 * Useful when FVN is already known (e.g., from stored product data or from
 * client-side calculation honouring user overrides).
 *
 * `breakdown` is optional — when supplied, it's attached to the result for
 * display. Pass it through if the caller already has the three raw weight
 * buckets (they can't be reconstructed from `fvnPercentage` alone).
 */
export function calculateNpmScoreFromFvn(
  nutrition: NutritionData,
  fvnPercentage: number,
  isDrink: boolean,
  breakdown?: FvnBreakdown
): ScoreResult {
  const aPoints = calculateAPoints(nutrition);
  const cPoints = calculateCPoints(nutrition, fvnPercentage);

  let proteinApplied = cPoints.protein;
  if (aPoints.total >= PROTEIN_RULE_A_THRESHOLD && cPoints.fruitVegNuts < PROTEIN_RULE_FVN_REQUIRED) {
    proteinApplied = 0;
  }
  cPoints.proteinApplied = proteinApplied;

  const adjustedCTotal = cPoints.fruitVegNuts + cPoints.fibre + proteinApplied;
  cPoints.total = adjustedCTotal;

  const totalScore = aPoints.total - adjustedCTotal;
  const threshold = isDrink ? DRINK_HFSS_THRESHOLD : FOOD_HFSS_THRESHOLD;
  const isHfss = totalScore >= threshold;

  return {
    aPoints,
    cPoints,
    fvnPercentage,
    fvnBreakdown: breakdown,
    totalScore,
    isDrink,
    isHfss,
    classification: isHfss ? 'less healthy' : 'healthier',
  };
}
