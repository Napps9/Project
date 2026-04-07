import { SavedProduct, NutritionData, ParsedIngredientState, ScoreResult, FvnOverride } from './types';

const STORAGE_KEY = 'npm-scorer:products';
const FVN_OVERRIDES_KEY = 'npm-scorer:fvn-overrides';
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

// ── FVN Overrides ──

export function loadFvnOverrides(): FvnOverride[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FVN_OVERRIDES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FvnOverride[];
  } catch {
    return [];
  }
}

function normaliseName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

export function saveFvnOverridesFromIngredients(ingredients: ParsedIngredientState[]): void {
  if (typeof window === 'undefined') return;
  const existing = loadFvnOverrides();
  const overrideMap = new Map(existing.map((o) => [o.name, o]));
  const now = new Date().toISOString();

  for (const ing of ingredients) {
    if (!ing.name.trim()) continue;
    const normalised = normaliseName(ing.name);

    // Determine effective FVN status based on auto-classification + user vote
    const effectiveFvn = ing.isFvn ? ing.userVote !== 'down' : ing.userVote === 'up';

    // Save if: auto-FVN (confirmed or rejected), or user explicitly promoted
    if (ing.isFvn || ing.userVote === 'up') {
      overrideMap.set(normalised, {
        name: normalised,
        isFvn: effectiveFvn,
        category: effectiveFvn ? ing.category : 'none',
        updatedAt: now,
      });
    }

    // Also save explicit rejections of auto-FVN
    if (ing.isFvn && ing.userVote === 'down') {
      overrideMap.set(normalised, {
        name: normalised,
        isFvn: false,
        category: 'none',
        updatedAt: now,
      });
    }
  }

  localStorage.setItem(FVN_OVERRIDES_KEY, JSON.stringify(Array.from(overrideMap.values())));
}

export function deleteFvnOverride(name: string): void {
  if (typeof window === 'undefined') return;
  const overrides = loadFvnOverrides().filter((o) => o.name !== name);
  localStorage.setItem(FVN_OVERRIDES_KEY, JSON.stringify(overrides));
}
