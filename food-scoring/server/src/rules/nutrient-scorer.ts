import { NutritionData, APointsBreakdown, CPointsBreakdown } from '../types';
import {
  ENERGY_KJ_THRESHOLDS,
  SATURATED_FAT_THRESHOLDS,
  TOTAL_SUGAR_THRESHOLDS,
  SODIUM_THRESHOLDS,
  FVN_PERCENTAGE_THRESHOLDS,
  FVN_POINT_VALUES,
  FIBRE_AOAC_THRESHOLDS,
  PROTEIN_THRESHOLDS,
} from './scoring-tables';

/**
 * Generic threshold scorer.
 * Returns how many thresholds the value exceeds.
 * E.g., thresholds [335, 670, 1005] and value 800 → 2 points (exceeds 335 and 670).
 */
export function calculatePoints(value: number, thresholds: number[]): number {
  let points = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (value > thresholds[i]) {
      points = i + 1;
    } else {
      break;
    }
  }
  return points;
}

/**
 * Calculate A points (negative nutrients) from nutrition data.
 * Each component scores 0-10, max total 40.
 */
export function calculateAPoints(nutrition: NutritionData): APointsBreakdown {
  const energy = calculatePoints(nutrition.energyKj, ENERGY_KJ_THRESHOLDS);
  const saturatedFat = calculatePoints(nutrition.saturatedFatG, SATURATED_FAT_THRESHOLDS);
  const sugar = calculatePoints(nutrition.totalSugarG, TOTAL_SUGAR_THRESHOLDS);
  const sodium = calculatePoints(nutrition.sodiumMg, SODIUM_THRESHOLDS);

  return {
    energy,
    saturatedFat,
    sugar,
    sodium,
    total: energy + saturatedFat + sugar + sodium,
  };
}

/**
 * Calculate FVN points from the FVN percentage.
 * Special scoring: only 0, 1, 2, or 5 points (no 3 or 4).
 */
export function calculateFvnPoints(fvnPercentage: number): number {
  let index = 0;
  for (let i = 0; i < FVN_PERCENTAGE_THRESHOLDS.length; i++) {
    if (fvnPercentage > FVN_PERCENTAGE_THRESHOLDS[i]) {
      index = i + 1;
    } else {
      break;
    }
  }
  return FVN_POINT_VALUES[index];
}

/**
 * Calculate C points (positive nutrients).
 * Each component scores 0-5, max total 15.
 *
 * Note: `proteinApplied` may differ from `protein` due to the A≥11 rule
 * (handled by the npm-engine, not here). This function returns raw protein points.
 */
export function calculateCPoints(nutrition: NutritionData, fvnPercentage: number): CPointsBreakdown {
  const fruitVegNuts = calculateFvnPoints(fvnPercentage);
  const fibre = calculatePoints(nutrition.fibreAoacG, FIBRE_AOAC_THRESHOLDS);
  const protein = calculatePoints(nutrition.proteinG, PROTEIN_THRESHOLDS);

  return {
    fruitVegNuts,
    fibre,
    protein,
    proteinApplied: protein, // default; npm-engine may override
    total: fruitVegNuts + fibre + protein,
  };
}
