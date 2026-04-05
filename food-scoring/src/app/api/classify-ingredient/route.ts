import { NextResponse } from 'next/server';
import { classifyIngredient } from '@/lib/rules/fvn-classifier';

export async function POST(request: Request) {
  const { name } = (await request.json()) as { name: string };

  if (!name) {
    return NextResponse.json({ error: 'Missing ingredient name' }, { status: 400 });
  }

  const result = classifyIngredient(name);
  return NextResponse.json(result);
}
