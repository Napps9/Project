import { NextResponse } from 'next/server';
import { parseAndClassifyIngredients } from '@/lib/rules/fvn-classifier';

export async function POST(request: Request) {
  const { text } = (await request.json()) as { text: string };

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing ingredient text' }, { status: 400 });
  }

  const ingredients = parseAndClassifyIngredients(text);
  return NextResponse.json({ ingredients });
}
