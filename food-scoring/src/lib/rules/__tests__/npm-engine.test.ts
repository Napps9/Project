import { describe, it, expect } from 'vitest';
import { calculatePoints, calculateAPoints, calculateCPoints, calculateFvnPoints } from '../nutrient-scorer';
import { calculateNpmScore, calculateNpmScoreFromFvn } from '../npm-engine';
import { classifyIngredient, calculateFvnFromIngredients } from '../fvn-classifier';
import { NutritionData } from '../../types';

// ── Generic point calculator ──

describe('calculatePoints', () => {
  it('returns 0 when value is at or below first threshold', () => {
    expect(calculatePoints(335, [335, 670, 1005])).toBe(0);
    expect(calculatePoints(100, [335, 670, 1005])).toBe(0);
  });

  it('returns correct points for mid-range values', () => {
    expect(calculatePoints(336, [335, 670, 1005])).toBe(1);
    expect(calculatePoints(670.1, [335, 670, 1005])).toBe(2);
    expect(calculatePoints(1500, [335, 670, 1005])).toBe(3);
  });

  it('returns max points when value exceeds all thresholds', () => {
    expect(calculatePoints(5000, [335, 670, 1005])).toBe(3);
  });
});

// ── A Points ──

describe('calculateAPoints', () => {
  it('scores 0 for all nutrients at or below base thresholds', () => {
    const nutrition: NutritionData = {
      energyKj: 335, saturatedFatG: 1, totalSugarG: 4.5,
      sodiumMg: 90, fibreAoacG: 0, proteinG: 0,
    };
    const result = calculateAPoints(nutrition);
    expect(result.total).toBe(0);
    expect(result.energy).toBe(0);
    expect(result.saturatedFat).toBe(0);
    expect(result.sugar).toBe(0);
    expect(result.sodium).toBe(0);
  });

  it('scores max 10 for each nutrient exceeding all thresholds', () => {
    const nutrition: NutritionData = {
      energyKj: 4000, saturatedFatG: 15, totalSugarG: 50,
      sodiumMg: 1000, fibreAoacG: 0, proteinG: 0,
    };
    const result = calculateAPoints(nutrition);
    expect(result.energy).toBe(10);
    expect(result.saturatedFat).toBe(10);
    expect(result.sugar).toBe(10);
    expect(result.sodium).toBe(10);
    expect(result.total).toBe(40);
  });

  it('scores correctly for mid-range values', () => {
    const nutrition: NutritionData = {
      energyKj: 1500, saturatedFatG: 5.5, totalSugarG: 20,
      sodiumMg: 400, fibreAoacG: 0, proteinG: 0,
    };
    const result = calculateAPoints(nutrition);
    expect(result.energy).toBe(4);       // >1340
    expect(result.saturatedFat).toBe(5); // >5
    expect(result.sugar).toBe(4);        // >18
    expect(result.sodium).toBe(4);       // >360
    expect(result.total).toBe(17);
  });
});

// ── FVN Points ──

describe('calculateFvnPoints', () => {
  it('scores 0 for ≤40%', () => {
    expect(calculateFvnPoints(0)).toBe(0);
    expect(calculateFvnPoints(40)).toBe(0);
  });

  it('scores 1 for >40% and ≤60%', () => {
    expect(calculateFvnPoints(41)).toBe(1);
    expect(calculateFvnPoints(60)).toBe(1);
  });

  it('scores 2 for >60% and ≤80%', () => {
    expect(calculateFvnPoints(61)).toBe(2);
    expect(calculateFvnPoints(80)).toBe(2);
  });

  it('scores 5 for >80%', () => {
    expect(calculateFvnPoints(81)).toBe(5);
    expect(calculateFvnPoints(100)).toBe(5);
  });
});

// ── C Points ──

describe('calculateCPoints', () => {
  it('scores 0 for all zeros', () => {
    const nutrition: NutritionData = {
      energyKj: 0, saturatedFatG: 0, totalSugarG: 0,
      sodiumMg: 0, fibreAoacG: 0, proteinG: 0,
    };
    const result = calculateCPoints(nutrition, 0);
    expect(result.total).toBe(0);
  });

  it('scores max for high positive nutrients with >80% FVN', () => {
    const nutrition: NutritionData = {
      energyKj: 0, saturatedFatG: 0, totalSugarG: 0,
      sodiumMg: 0, fibreAoacG: 5, proteinG: 9,
    };
    const result = calculateCPoints(nutrition, 90);
    expect(result.fruitVegNuts).toBe(5);
    expect(result.fibre).toBe(5);
    expect(result.protein).toBe(5);
    expect(result.total).toBe(15);
  });
});

// ── FVN Classifier ──

describe('classifyIngredient', () => {
  it('classifies common fruits', () => {
    expect(classifyIngredient('Apple').isFvn).toBe(true);
    expect(classifyIngredient('Strawberry').isFvn).toBe(true);
    expect(classifyIngredient('Dried Mango').isFvn).toBe(true);
  });

  it('classifies common vegetables', () => {
    expect(classifyIngredient('Carrot').isFvn).toBe(true);
    expect(classifyIngredient('Broccoli').isFvn).toBe(true);
    expect(classifyIngredient('Tomato Puree').isFvn).toBe(true);
  });

  it('classifies nuts and seeds', () => {
    expect(classifyIngredient('Almonds').isFvn).toBe(true);
    expect(classifyIngredient('Peanut Butter').isFvn).toBe(true);
    expect(classifyIngredient('Chia Seeds').isFvn).toBe(true);
  });

  it('classifies legumes as FVN', () => {
    expect(classifyIngredient('Chickpeas').isFvn).toBe(true);
    expect(classifyIngredient('Red Lentils').isFvn).toBe(true);
  });

  it('excludes potatoes', () => {
    expect(classifyIngredient('Potato').isFvn).toBe(false);
    expect(classifyIngredient('Potatoes').isFvn).toBe(false);
  });

  it('excludes grains and cereals', () => {
    expect(classifyIngredient('Wheat Flour').isFvn).toBe(false);
    expect(classifyIngredient('Rice').isFvn).toBe(false);
    expect(classifyIngredient('Oats').isFvn).toBe(false);
  });

  it('excludes sugar and sweeteners', () => {
    expect(classifyIngredient('Sugar').isFvn).toBe(false);
    expect(classifyIngredient('Glucose Syrup').isFvn).toBe(false);
  });

  it('excludes dairy, meat, fish', () => {
    expect(classifyIngredient('Butter').isFvn).toBe(false);
    expect(classifyIngredient('Chicken').isFvn).toBe(false);
    expect(classifyIngredient('Salmon').isFvn).toBe(false);
  });
});

describe('calculateFvnFromIngredients', () => {
  it('calculates FVN percentage from ingredient proportions', () => {
    const result = calculateFvnFromIngredients([
      { name: 'Apple', proportion: 50 },
      { name: 'Sugar', proportion: 30 },
      { name: 'Flour', proportion: 20 },
    ]);
    expect(result.fvnPercentage).toBe(50);
  });

  it('sums multiple FVN ingredients', () => {
    const result = calculateFvnFromIngredients([
      { name: 'Apple', proportion: 40 },
      { name: 'Carrot', proportion: 30 },
      { name: 'Sugar', proportion: 30 },
    ]);
    expect(result.fvnPercentage).toBe(70);
  });
});

// ── Full NPM Engine ──

describe('calculateNpmScore', () => {
  it('scores a healthy fruit salad correctly', () => {
    const nutrition: NutritionData = {
      energyKj: 200, saturatedFatG: 0.1, totalSugarG: 10,
      sodiumMg: 5, fibreAoacG: 2.5, proteinG: 1,
    };
    const ingredients = [
      { name: 'Apple', proportion: 40 },
      { name: 'Banana', proportion: 30 },
      { name: 'Strawberry', proportion: 30 },
    ];
    const result = calculateNpmScore(nutrition, ingredients, false);

    expect(result.aPoints.total).toBeLessThan(11);
    expect(result.fvnPercentage).toBe(100);
    expect(result.cPoints.fruitVegNuts).toBe(5);
    expect(result.isHfss).toBe(false);
    expect(result.classification).toBe('healthier');
  });

  it('scores a high-sugar, low-FVN product as HFSS', () => {
    const nutrition: NutritionData = {
      energyKj: 2000, saturatedFatG: 8, totalSugarG: 40,
      sodiumMg: 500, fibreAoacG: 1, proteinG: 5,
    };
    const ingredients = [
      { name: 'Sugar', proportion: 50 },
      { name: 'Flour', proportion: 30 },
      { name: 'Butter', proportion: 20 },
    ];
    const result = calculateNpmScore(nutrition, ingredients, false);

    expect(result.aPoints.total).toBeGreaterThanOrEqual(11);
    expect(result.fvnPercentage).toBe(0);
    // Protein should NOT be applied (A≥11, FVN<5)
    expect(result.cPoints.proteinApplied).toBe(0);
    expect(result.isHfss).toBe(true);
    expect(result.classification).toBe('less healthy');
  });

  it('applies the protein rule: A≥11 but FVN=5 allows protein', () => {
    const nutrition: NutritionData = {
      energyKj: 2500, saturatedFatG: 6, totalSugarG: 30,
      sodiumMg: 600, fibreAoacG: 3, proteinG: 7,
    };
    const ingredients = [
      { name: 'Apple', proportion: 85 }, // >80% FVN → 5 points
      { name: 'Sugar', proportion: 15 },
    ];
    const result = calculateNpmScore(nutrition, ingredients, false);

    expect(result.aPoints.total).toBeGreaterThanOrEqual(11);
    expect(result.cPoints.fruitVegNuts).toBe(5);
    // Protein IS applied because FVN = 5
    expect(result.cPoints.proteinApplied).toBe(result.cPoints.protein);
  });

  it('classifies drinks with lower threshold', () => {
    const nutrition: NutritionData = {
      energyKj: 400, saturatedFatG: 0.5, totalSugarG: 5,
      sodiumMg: 50, fibreAoacG: 0, proteinG: 0.5,
    };
    const ingredients = [
      { name: 'Water', proportion: 90 },
      { name: 'Sugar', proportion: 10 },
    ];
    const result = calculateNpmScore(nutrition, ingredients, true);

    // Drink threshold is ≥1
    expect(result.totalScore).toBeGreaterThanOrEqual(1);
    expect(result.isHfss).toBe(true);
  });

  it('classifies a drink with score 0 as healthier', () => {
    const nutrition: NutritionData = {
      energyKj: 100, saturatedFatG: 0, totalSugarG: 0,
      sodiumMg: 10, fibreAoacG: 0, proteinG: 0,
    };
    const ingredients = [
      { name: 'Water', proportion: 100 },
    ];
    const result = calculateNpmScore(nutrition, ingredients, true);

    expect(result.totalScore).toBeLessThan(1);
    expect(result.isHfss).toBe(false);
  });
});

describe('calculateNpmScoreFromFvn', () => {
  it('produces same result as full calculation when FVN matches', () => {
    const nutrition: NutritionData = {
      energyKj: 1500, saturatedFatG: 4, totalSugarG: 15,
      sodiumMg: 300, fibreAoacG: 2, proteinG: 5,
    };
    const result = calculateNpmScoreFromFvn(nutrition, 50, false);

    expect(result.fvnPercentage).toBe(50);
    expect(result.cPoints.fruitVegNuts).toBe(1); // >40%
    expect(typeof result.totalScore).toBe('number');
  });
});
