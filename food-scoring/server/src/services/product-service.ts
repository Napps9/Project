import { getDb } from '../db';
import { NutritionData, IngredientInput, ScoreResult } from '../types';
import { calculateNpmScore, calculateNpmScoreFromFvn } from '../rules/npm-engine';
import { classifyIngredient } from '../rules/fvn-classifier';

interface CreateProductInput {
  name: string;
  isDrink: boolean;
  nutrition: NutritionData;
  ingredients: IngredientInput[];
}

interface ProductRow {
  id: number;
  name: string;
  is_drink: number;
  energy_kj: number;
  saturated_fat_g: number;
  total_sugar_g: number;
  sodium_mg: number;
  fibre_aoac_g: number;
  protein_g: number;
  fvn_percentage: number;
  npm_score: number | null;
  is_hfss: number | null;
  created_at: string;
  updated_at: string;
}

interface IngredientRow {
  id: number;
  product_id: number;
  name: string;
  proportion: number;
  is_fvn: number;
  created_at: string;
}

export function createProduct(input: CreateProductInput): { productId: number; score: ScoreResult } {
  const db = getDb();

  const score = calculateNpmScore(input.nutrition, input.ingredients, input.isDrink);

  const insertProduct = db.prepare(`
    INSERT INTO products (name, is_drink, energy_kj, saturated_fat_g, total_sugar_g,
      sodium_mg, fibre_aoac_g, protein_g, fvn_percentage, npm_score, is_hfss)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertIngredient = db.prepare(`
    INSERT INTO ingredients (product_id, name, proportion, is_fvn)
    VALUES (?, ?, ?, ?)
  `);

  const result = db.transaction(() => {
    const { lastInsertRowid } = insertProduct.run(
      input.name,
      input.isDrink ? 1 : 0,
      input.nutrition.energyKj,
      input.nutrition.saturatedFatG,
      input.nutrition.totalSugarG,
      input.nutrition.sodiumMg,
      input.nutrition.fibreAoacG,
      input.nutrition.proteinG,
      score.fvnPercentage,
      score.totalScore,
      score.isHfss ? 1 : 0
    );

    const productId = Number(lastInsertRowid);

    for (const ing of input.ingredients) {
      const { isFvn } = classifyIngredient(ing.name);
      insertIngredient.run(productId, ing.name, ing.proportion, isFvn ? 1 : 0);
    }

    return productId;
  })();

  return { productId: result, score };
}

export function getAllProducts(): Array<ProductRow & { ingredients: IngredientRow[] }> {
  const db = getDb();
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as ProductRow[];
  const getIngredients = db.prepare('SELECT * FROM ingredients WHERE product_id = ?');

  return products.map((p) => ({
    ...p,
    ingredients: getIngredients.all(p.id) as IngredientRow[],
  }));
}

export function getProductById(id: number): (ProductRow & { ingredients: IngredientRow[] }) | null {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined;
  if (!product) return null;

  const ingredients = db.prepare('SELECT * FROM ingredients WHERE product_id = ?').all(id) as IngredientRow[];
  return { ...product, ingredients };
}

export function getProductScore(id: number): ScoreResult | null {
  const product = getProductById(id);
  if (!product) return null;

  const nutrition: NutritionData = {
    energyKj: product.energy_kj,
    saturatedFatG: product.saturated_fat_g,
    totalSugarG: product.total_sugar_g,
    sodiumMg: product.sodium_mg,
    fibreAoacG: product.fibre_aoac_g,
    proteinG: product.protein_g,
  };

  return calculateNpmScoreFromFvn(nutrition, product.fvn_percentage, product.is_drink === 1);
}

export function deleteProduct(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return result.changes > 0;
}
