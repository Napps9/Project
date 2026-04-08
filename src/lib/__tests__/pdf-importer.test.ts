import { describe, it, expect } from 'vitest';
import { parsePdfText, splitRecipeBlocks } from '../pdf-importer';

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
