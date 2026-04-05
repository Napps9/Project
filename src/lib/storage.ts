import { SavedProduct, NutritionData, ParsedIngredientState, ScoreResult } from './types';

const STORAGE_KEY = 'npm-scorer:products';
const MAX_PRODUCTS = 50;

export function loadProducts(): SavedProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedProduct[];
  } catch {
    return [];
  }
}

export function saveProduct(data: {
  name: string;
  isDrink: boolean;
  nutrition: NutritionData;
  ingredients: ParsedIngredientState[];
  result: ScoreResult;
}): SavedProduct {
  const product: SavedProduct = {
    id: crypto.randomUUID(),
    ...data,
    savedAt: new Date().toISOString(),
  };

  const existing = loadProducts();
  const updated = [product, ...existing].slice(0, MAX_PRODUCTS);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return product;
}

export function deleteProduct(id: string): void {
  if (typeof window === 'undefined') return;
  const products = loadProducts().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function clearAllProducts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
