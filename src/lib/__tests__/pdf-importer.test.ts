import { describe, it, expect } from 'vitest';
import {
  parsePdfText,
  splitRecipeBlocks,
  cleanIngredientLine,
  extractPdfNutrition,
} from '../pdf-importer';

describe('splitRecipeBlocks', () => {
  it('splits on explicit Recipe: markers', () => {
    const text = `
Recipe: Apple Pie
Some content here

Recipe: Banana Bread
Other content
    `;
    const blocks = splitRecipeBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('Apple Pie');
    expect(blocks[1]).toContain('Banana Bread');
  });

  it('splits on Recipe Name: markers', () => {
    const text = `Recipe Name: Cookie
detail
Recipe Name: Cake
detail`;
    const blocks = splitRecipeBlocks(text);
    expect(blocks).toHaveLength(2);
  });

  it('splits on Product: markers', () => {
    const text = `Product: Soup
detail
Product: Stew
detail`;
    const blocks = splitRecipeBlocks(text);
    expect(blocks).toHaveLength(2);
  });

  it('falls back to form-feed page breaks when no markers', () => {
    const text = `Apple Pie\nfilling info\f\nBanana Bread\nbatter info`;
    const blocks = splitRecipeBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('Apple Pie');
    expect(blocks[1]).toContain('Banana Bread');
  });

  it('treats whole document as single block when no markers or page breaks', () => {
    const text = `Just one big recipe\nwith some text\nand more text`;
    const blocks = splitRecipeBlocks(text);
    expect(blocks).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(splitRecipeBlocks('')).toEqual([]);
    expect(splitRecipeBlocks('   \n\n  ')).toEqual([]);
  });

  it('handles CRLF line endings', () => {
    const text = `Recipe: A\r\ndetail\r\nRecipe: B\r\ndetail`;
    const blocks = splitRecipeBlocks(text);
    expect(blocks).toHaveLength(2);
  });
});

describe('parsePdfText', () => {
  it('parses a single recipe block with full nutrition and ingredients', () => {
    const text = `
Recipe: Fruit Smoothie
Ingredients: Strawberry (50%), Banana (30%), Orange Juice (20%)
Nutrition per 100g
Energy: 450 kJ
Saturates: 0.5 g
Sugars: 25 g
Salt: 0.3 g
Fibre: 2.5 g
Protein: 3.5 g
    `;
    const result = parsePdfText(text);
    expect(result.rows).toHaveLength(1);
    expect(result.skippedCount).toBe(0);

    const row = result.rows[0];
    expect(row.name).toBe('Fruit Smoothie');
    expect(row.isDrink).toBe(true); // detected from "Smoothie"
    expect(row.ingredientText).toContain('Strawberry');
    expect(row.ingredientText).toContain('Banana');
    expect(row.nutrition.energyKj).toBe(450);
    expect(row.nutrition.saturatedFatG).toBe(0.5);
    expect(row.nutrition.totalSugarG).toBe(25);
    expect(row.nutrition.sodiumMg).toBe(120); // 0.3g salt × 400
    expect(row.nutrition.fibreAoacG).toBe(2.5);
    expect(row.nutrition.proteinG).toBe(3.5);
  });

  it('parses multiple recipes split by Recipe: markers', () => {
    const text = `
Recipe: Oat Cookie
Ingredients: Oats (45%), Sugar (25%), Butter (20%), Raisins (10%)
Energy 1800 kJ, Sat Fat 8 g, Sugars 22 g, Salt 0.75 g, Fibre 3.8 g, Protein 6.2 g

Recipe: Plain Bread
Ingredients: Wheat flour, water, yeast, salt
Energy 1100 kJ, Saturates 0.4 g, Sugars 2 g, Salt 1 g, Fibre 2.8 g, Protein 9 g
    `;
    const result = parsePdfText(text);
    expect(result.rows).toHaveLength(2);

    expect(result.rows[0].name).toBe('Oat Cookie');
    expect(result.rows[0].isDrink).toBe(false);
    expect(result.rows[0].nutrition.energyKj).toBe(1800);
    expect(result.rows[0].nutrition.totalSugarG).toBe(22);

    expect(result.rows[1].name).toBe('Plain Bread');
    expect(result.rows[1].nutrition.energyKj).toBe(1100);
    expect(result.rows[1].nutrition.proteinG).toBe(9);
  });

  it('falls back to page-break splitting when there are no markers', () => {
    const text =
      `Apple Pie\nIngredients: apples, pastry, sugar\nEnergy 1500 kJ, Saturates 5 g, Sugars 18 g, Salt 0.4 g, Fibre 2 g, Protein 3 g\f\n` +
      `Lemon Tart\nIngredients: lemon, eggs, butter, sugar\nEnergy 1700 kJ, Saturates 9 g, Sugars 30 g, Salt 0.2 g, Fibre 1 g, Protein 4 g`;
    const result = parsePdfText(text);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('Apple Pie');
    expect(result.rows[1].name).toBe('Lemon Tart');
  });

  it('reports missing nutrition fields as warnings but still imports the row', () => {
    const text = `
Recipe: Mystery Bar
Ingredients: oats, honey
Energy 1200 kJ
    `;
    const result = parsePdfText(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].nutrition.energyKj).toBe(1200);
    expect(result.rows[0].nutrition.totalSugarG).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Mystery Bar');
    expect(result.errors[0]).toContain('missing');
  });

  it('extracts ingredients up to the next section header', () => {
    const text = `
Recipe: Granola
Ingredients: oats, honey, almonds, raisins
Method: Mix and bake at 180C for 20 min
Nutrition: Energy 1900 kJ, Saturates 3 g, Sugars 18 g, Salt 0.1 g, Fibre 7 g, Protein 10 g
    `;
    const result = parsePdfText(text);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.ingredientText).toContain('oats');
    expect(row.ingredientText).toContain('almonds');
    expect(row.ingredientText).not.toContain('Mix and bake');
    expect(row.ingredientText).not.toContain('Energy');
  });

  it('detects drinks from name keywords', () => {
    const text = `
Recipe: Apple Juice
Ingredients: apple
Energy 200 kJ, Saturates 0 g, Sugars 11 g, Salt 0 g, Fibre 0 g, Protein 0 g
    `;
    const result = parsePdfText(text);
    expect(result.rows[0].isDrink).toBe(true);
  });

  it('does not detect normal foods as drinks', () => {
    const text = `
Recipe: Cheese Sandwich
Ingredients: bread, cheese, butter
Energy 1300 kJ, Saturates 8 g, Sugars 3 g, Salt 1.2 g, Fibre 2 g, Protein 12 g
    `;
    const result = parsePdfText(text);
    expect(result.rows[0].isDrink).toBe(false);
  });

  it('returns an error when text is empty', () => {
    const result = parsePdfText('');
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toContain('PDF contains no extractable text');
  });

  it('skips blocks with no detectable name', () => {
    // Two form-feed-separated blocks; first is just numbers, second has content
    const text =
      `123 456 789\f\nApple Pie\nIngredients: apple\nEnergy 1500 kJ, Saturates 5 g, Sugars 18 g, Salt 0.4 g, Fibre 2 g, Protein 3 g`;
    const result = parsePdfText(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Apple Pie');
    expect(result.skippedCount).toBe(1);
  });

  it('uses first non-empty line as name when there is no Recipe: marker', () => {
    const text = `Strawberry Jam
Ingredients: strawberries, sugar
Energy 1000 kJ, Saturates 0 g, Sugars 60 g, Salt 0 g, Fibre 1 g, Protein 0.5 g`;
    const result = parsePdfText(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Strawberry Jam');
  });
});

describe('cleanIngredientLine', () => {
  it('extracts name and weight from a GRAM unit catalog line', () => {
    const result = cleanIngredientLine(
      'Everyday Essentials Plain White Flour - GENERAL - 6-1.5kg (Everyday Favourites) [42018] GRAM 180.000'
    );
    expect(result).not.toBeNull();
    expect(result!.weightG).toBe(180);
    expect(result!.name).toContain('Plain White Flour');
    expect(result!.name).not.toContain('GENERAL');
    expect(result!.name).not.toContain('42018');
    expect(result!.name).not.toContain('GRAM');
    expect(result!.name).not.toContain('(');
    expect(result!.name).not.toMatch(/6-1\.5kg/);
  });

  it('handles MILLILITRE units as grams (density ~1)', () => {
    const result = cleanIngredientLine(
      'Sunflower Oil - AMBIENT - 1-1ltr (Supplier) [12345] MILLILITRE 170.000'
    );
    expect(result).not.toBeNull();
    expect(result!.weightG).toBe(170);
    expect(result!.name).toContain('Sunflower Oil');
  });

  it('handles PCE (piece) units with per-piece weight', () => {
    const result = cleanIngredientLine(
      'Medium Eggs - CHILLED - 1-30pk [99999] PCE 2.000 (1 PCE = 58 G)'
    );
    expect(result).not.toBeNull();
    expect(result!.weightG).toBe(116); // 2 × 58
    expect(result!.name).toContain('Eggs');
  });

  it('converts KILOGRAM to grams', () => {
    const result = cleanIngredientLine('Bulk Sugar [11111] KILOGRAM 1.5');
    expect(result).not.toBeNull();
    expect(result!.weightG).toBe(1500);
  });

  it('returns null for empty line', () => {
    expect(cleanIngredientLine('')).toBeNull();
    expect(cleanIngredientLine('   ')).toBeNull();
  });

  it('cleans a line with no unit, returning null weight', () => {
    const result = cleanIngredientLine('Caster Sugar');
    expect(result).not.toBeNull();
    expect(result!.weightG).toBeNull();
    expect(result!.name).toBe('Caster Sugar');
  });
});

describe('extractPdfNutrition — two-column format', () => {
  it('picks per-100g values when a two-column header is present', () => {
    // Real supplier-format block from the Courgette cake PDF
    const block = `NUTRIENTS QUANTITY PER SERVE PER 100G
Energy (kJ) 923.3 1,398.93
Saturated Fat (g) 1.2 1.82
Total Sugars (g) 11.48 17.39
Sodium (mg) 132 200
Fibre (g) 1.33 2.02
Protein (g) 3.22 4.87`;
    const { parsed } = extractPdfNutrition(block);
    expect(parsed.energyKj).toBeCloseTo(1398.93, 2);
    expect(parsed.saturatedFatG).toBeCloseTo(1.82, 2);
    expect(parsed.totalSugarG).toBeCloseTo(17.39, 2);
    expect(parsed.sodiumMg).toBe(200);
    expect(parsed.fibreAoacG).toBeCloseTo(2.02, 2);
    expect(parsed.proteinG).toBeCloseTo(4.87, 2);
  });

  it('picks the only value in a single-column block', () => {
    const block = `Energy 1500 kJ
Saturates 5 g
Sugars 18 g
Salt 0.4 g
Fibre 2 g
Protein 3 g`;
    const { parsed } = extractPdfNutrition(block);
    expect(parsed.energyKj).toBe(1500);
    expect(parsed.saturatedFatG).toBe(5);
    expect(parsed.totalSugarG).toBe(18);
    expect(parsed.sodiumMg).toBe(160); // 0.4 × 400
    expect(parsed.fibreAoacG).toBe(2);
    expect(parsed.proteinG).toBe(3);
  });

  it('strips thousand-separator commas', () => {
    const block = `per 100g
Energy (kJ) 1,398.93`;
    const { parsed } = extractPdfNutrition(block);
    expect(parsed.energyKj).toBeCloseTo(1398.93, 2);
  });

  it('falls back to salt → sodium conversion when no sodium line', () => {
    const block = `Energy 500 kJ
Salt 0.5 g`;
    const { parsed } = extractPdfNutrition(block);
    expect(parsed.sodiumMg).toBe(200); // 0.5 × 400
  });
});

describe('parsePdfText — supplier catalog format (Courgette cake)', () => {
  // Realistic supplier-export block: multi-line ingredients with
  // GRAM/MILLILITRE/PCE units, and two-column nutrition (per serve / per 100g).
  const courgetteCakeBlock = `Recipe: Courgette cake
Ingredients
Everyday Essentials Plain White Flour - GENERAL - 6-1.5kg (Everyday Favourites) [42018] GRAM 180.000
Everyday Essentials Caster Sugar - GENERAL - 10-1kg (Everyday Favourites) [42019] GRAM 30.000
Baking Powder - GENERAL - 1-1kg (Supplier Brand) [50001] GRAM 5.000
Ground Cinnamon - GENERAL - 1-500g (Supplier Brand) [50002] GRAM 3.000
Semi Skimmed Milk - CHILLED - 1-2ltr (Dairy Co) [60001] MILLILITRE 120.000
Sunflower Oil - AMBIENT - 1-1ltr (Oils Ltd) [70001] MILLILITRE 170.000
Medium Eggs - CHILLED - 1-30pk (Farm Fresh) [80001] PCE 2.000 (1 PCE = 58 G)
Fairtrade Cocoa Powder - Drinks, Snacks & Confectionery - 1-250g (Brand X) [90001] GRAM 60.000
Fresh Courgette - GENERAL - 1-5kg (Farm Fresh) [10001] GRAM 240.000
NUTRIENTS QUANTITY PER SERVE PER 100G
Energy (kJ) 923.3 1,398.93
Saturated Fat (g) 1.2 1.82
Total Sugars (g) 11.48 17.39
Sodium (mg) 132 200
Fibre (g) 1.33 2.02
Protein (g) 3.22 4.87`;

  it('detects the recipe name', () => {
    const result = parsePdfText(courgetteCakeBlock);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Courgette cake');
  });

  it('does NOT misclassify as a drink despite "Drinks" in cocoa powder line', () => {
    const result = parsePdfText(courgetteCakeBlock);
    expect(result.rows[0].isDrink).toBe(false);
  });

  it('extracts per-100g nutrition, not per-serve', () => {
    const result = parsePdfText(courgetteCakeBlock);
    const n = result.rows[0].nutrition;
    expect(n.energyKj).toBeCloseTo(1398.93, 2);
    expect(n.saturatedFatG).toBeCloseTo(1.82, 2);
    expect(n.totalSugarG).toBeCloseTo(17.39, 2);
    expect(n.sodiumMg).toBe(200);
    expect(n.fibreAoacG).toBeCloseTo(2.02, 2);
    expect(n.proteinG).toBeCloseTo(4.87, 2);
  });

  it('extracts all 9 ingredients from supplier multi-line format', () => {
    const result = parsePdfText(courgetteCakeBlock);
    const text = result.rows[0].ingredientText;
    // Should look like "Name pct%, Name pct%, ..."
    const parts = text.split(',').map((s) => s.trim()).filter(Boolean);
    expect(parts).toHaveLength(9);
  });

  it('computes ingredient proportions from gram weights', () => {
    const result = parsePdfText(courgetteCakeBlock);
    const text = result.rows[0].ingredientText;
    // Total = 180+30+5+3+120+170+116+60+240 = 924g
    // Courgette = 240/924 ≈ 25.97%
    expect(text).toMatch(/Courgette[^,]*?25\.97\s*%/i);
    // Flour = 180/924 ≈ 19.48%
    expect(text).toMatch(/Flour[^,]*?19\.48\s*%/i);
    // Eggs = 116/924 ≈ 12.55% (2 pieces × 58g)
    expect(text).toMatch(/Eggs[^,]*?12\.55\s*%/i);
  });

  it('strips supplier catalog noise from ingredient names', () => {
    const result = parsePdfText(courgetteCakeBlock);
    const text = result.rows[0].ingredientText;
    expect(text).not.toContain('GENERAL');
    expect(text).not.toContain('CHILLED');
    expect(text).not.toContain('AMBIENT');
    expect(text).not.toContain('[42018]');
    expect(text).not.toContain('GRAM');
    expect(text).not.toContain('MILLILITRE');
    expect(text).not.toContain('(Everyday Favourites)');
    expect(text).not.toContain('Drinks, Snacks');
  });
});
