import { NutritionData, IngredientInput, ScoreResult, ClassifyResult } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export function scoreProduct(
  nutrition: NutritionData,
  ingredients: IngredientInput[],
  isDrink: boolean
): Promise<ScoreResult> {
  return request('/score', {
    method: 'POST',
    body: JSON.stringify({ nutrition, ingredients, isDrink }),
  });
}

export function classifyIngredient(name: string): Promise<ClassifyResult> {
  return request('/classify-ingredient', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function createProduct(
  name: string,
  nutrition: NutritionData,
  ingredients: IngredientInput[],
  isDrink: boolean
): Promise<{ productId: number; score: ScoreResult }> {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify({ name, nutrition, ingredients, isDrink }),
  });
}

export function getProducts(): Promise<unknown[]> {
  return request('/products');
}

export function getProduct(id: number): Promise<{ product: unknown; score: ScoreResult }> {
  return request(`/products/${id}`);
}

export function deleteProduct(id: number): Promise<{ success: boolean }> {
  return request(`/products/${id}`, { method: 'DELETE' });
}
