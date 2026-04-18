import { NextResponse } from 'next/server';
import { NutritionData, IngredientInput, FvnBreakdown } from '@/lib/types';
import { calculateNpmScore, calculateNpmScoreFromFvn } from '@/lib/rules/npm-engine';
import { effectiveFvnPercentage } from '@/lib/rules/fvn-classifier';

export async function POST(request: Request) {
  const { isDrink, nutrition, ingredients, fvnPercentage, fvnBreakdown } =
    (await request.json()) as {
      isDrink: boolean;
      nutrition: NutritionData;
      ingredients?: IngredientInput[];
      fvnPercentage?: number;
      fvnBreakdown?: FvnBreakdown;
    };

  if (!nutrition) {
    return NextResponse.json({ error: 'Missing nutrition data' }, { status: 400 });
  }

  if (typeof fvnPercentage === 'number') {
    const verifiedPct = fvnBreakdown ? effectiveFvnPercentage(fvnBreakdown) : fvnPercentage;
    const score = calculateNpmScoreFromFvn(nutrition, verifiedPct, isDrink ?? false, fvnBreakdown);
    return NextResponse.json(score);
  }

  // Otherwise, calculate from ingredients list
  if (!ingredients || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: 'Missing ingredients or fvnPercentage' }, { status: 400 });
  }

  const score = calculateNpmScore(nutrition, ingredients, isDrink ?? false);
  return NextResponse.json(score);
}
