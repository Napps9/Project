import { NextResponse } from 'next/server';
import { NutritionData, IngredientInput } from '@/lib/types';
import { calculateNpmScore, calculateNpmScoreFromFvn } from '@/lib/rules/npm-engine';

export async function POST(request: Request) {
  const { isDrink, nutrition, ingredients, fvnPercentage } = (await request.json()) as {
    isDrink: boolean;
    nutrition: NutritionData;
    ingredients?: IngredientInput[];
    fvnPercentage?: number;
  };

  if (!nutrition) {
    return NextResponse.json({ error: 'Missing nutrition data' }, { status: 400 });
  }

  // If fvnPercentage is provided directly (from client-side calculation with user overrides), use it
  if (typeof fvnPercentage === 'number') {
    const score = calculateNpmScoreFromFvn(nutrition, fvnPercentage, isDrink ?? false);
    return NextResponse.json(score);
  }

  // Otherwise, calculate from ingredients list
  if (!ingredients || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: 'Missing ingredients or fvnPercentage' }, { status: 400 });
  }

  const score = calculateNpmScore(nutrition, ingredients, isDrink ?? false);
  return NextResponse.json(score);
}
