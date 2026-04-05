import { NextResponse } from 'next/server';
import { NutritionData, IngredientInput } from '@/lib/types';
import { calculateNpmScore } from '@/lib/rules/npm-engine';

export async function POST(request: Request) {
  const { isDrink, nutrition, ingredients } = (await request.json()) as {
    isDrink: boolean;
    nutrition: NutritionData;
    ingredients: IngredientInput[];
  };

  if (!nutrition || !ingredients || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: 'Missing nutrition or ingredients' }, { status: 400 });
  }

  const score = calculateNpmScore(nutrition, ingredients, isDrink ?? false);
  return NextResponse.json(score);
}
