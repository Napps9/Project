import { Router, Request, Response } from 'express';
import { NutritionData, IngredientInput } from '../types';
import { calculateNpmScore } from '../rules/npm-engine';
import { classifyIngredient } from '../rules/fvn-classifier';
import * as productService from '../services/product-service';

const router = Router();

// POST /api/score — Stateless scoring (no DB persistence)
router.post('/score', (req: Request, res: Response) => {
  const { isDrink, nutrition, ingredients } = req.body as {
    isDrink: boolean;
    nutrition: NutritionData;
    ingredients: IngredientInput[];
  };

  if (!nutrition || !ingredients || !Array.isArray(ingredients)) {
    res.status(400).json({ error: 'Missing nutrition or ingredients' });
    return;
  }

  const score = calculateNpmScore(nutrition, ingredients, isDrink ?? false);
  res.json(score);
});

// POST /api/classify-ingredient — Classify a single ingredient
router.post('/classify-ingredient', (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: 'Missing ingredient name' });
    return;
  }
  const result = classifyIngredient(name);
  res.json(result);
});

// POST /api/products — Create a product and score it
router.post('/products', (req: Request, res: Response) => {
  const { name, isDrink, nutrition, ingredients } = req.body as {
    name: string;
    isDrink: boolean;
    nutrition: NutritionData;
    ingredients: IngredientInput[];
  };

  if (!name || !nutrition || !ingredients) {
    res.status(400).json({ error: 'Missing required fields: name, nutrition, ingredients' });
    return;
  }

  const result = productService.createProduct({ name, isDrink: isDrink ?? false, nutrition, ingredients });
  res.status(201).json(result);
});

// GET /api/products — List all products
router.get('/products', (_req: Request, res: Response) => {
  const products = productService.getAllProducts();
  res.json(products);
});

// GET /api/products/:id — Get product with full score breakdown
router.get('/products/:id', (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const product = productService.getProductById(id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const score = productService.getProductScore(id);
  res.json({ product, score });
});

// DELETE /api/products/:id — Delete a product
router.delete('/products/:id', (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const deleted = productService.deleteProduct(id);
  if (!deleted) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
