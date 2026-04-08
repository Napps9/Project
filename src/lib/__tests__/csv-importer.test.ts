import { describe, it, expect } from 'vitest';
import { parseCsvFile, getCsvTemplate } from '../csv-importer';

describe('parseCsvFile', () => {
  it('parses a minimal valid CSV', () => {
    const csv = [
      'Name,Energy (kJ),Saturated Fat (g),Total Sugar (g),Salt (g),Fibre (g),Protein (g),Ingredients',
      'Fruit Smoothie,450,0.5,25,0.3,2.5,3.5,"Strawberry (50%), Banana (30%)"',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.skippedCount).toBe(0);
    expect(result.errors).toEqual([]);

    const row = result.rows[0];
    expect(row.name).toBe('Fruit Smoothie');
    expect(row.isDrink).toBe(false);
    expect(row.nutrition.energyKj).toBe(450);
    expect(row.nutrition.saturatedFatG).toBe(0.5);
    expect(row.nutrition.totalSugarG).toBe(25);
    expect(row.nutrition.fibreAoacG).toBe(2.5);
    expect(row.nutrition.proteinG).toBe(3.5);
    // Salt 0.3g → sodium 120mg
    expect(row.nutrition.sodiumMg).toBe(120);
    expect(row.ingredientText).toBe('Strawberry (50%), Banana (30%)');
  });

  it('parses multiple rows', () => {
    const csv = [
      'Name,Is Drink,Energy (kJ),Sat Fat (g),Sugars (g),Salt (g),Fibre (g),Protein (g),Ingredients',
      'Fruit Smoothie,TRUE,450,0.5,25,0.3,2.5,3.5,"Strawberry (50%), Banana (30%)"',
      'Oat Cookie,FALSE,1800,8,22,0.75,3.8,6.2,"Oats (45%), Sugar (25%)"',
      'Plain Yogurt,FALSE,270,1.8,5,0.1,0,4.5,',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].isDrink).toBe(true);
    expect(result.rows[1].isDrink).toBe(false);
    expect(result.rows[2].ingredientText).toBe('');
  });

  it('handles quoted fields with commas', () => {
    const csv = [
      'Name,Energy,Ingredients',
      '"Smith, Jr Recipe",500,"tomato, onion, garlic"',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Smith, Jr Recipe');
    expect(result.rows[0].ingredientText).toBe('tomato, onion, garlic');
  });

  it('handles escaped double quotes inside quoted fields', () => {
    const csv = [
      'Name,Energy',
      '"He said ""hello""",100',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('He said "hello"');
  });

  it('handles CRLF line endings', () => {
    const csv = 'Name,Energy\r\nCookie,1800\r\nBread,1100\r\n';
    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('Cookie');
    expect(result.rows[1].name).toBe('Bread');
  });

  it('matches header aliases case-insensitively', () => {
    const csv = [
      'recipe name,energy,saturates,sugars,salt,fiber,protein,ingredient list',
      'Test,500,2,10,0.5,1,3,apple',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.name).toBe('Test');
    expect(row.nutrition.energyKj).toBe(500);
    expect(row.nutrition.saturatedFatG).toBe(2);
    expect(row.nutrition.totalSugarG).toBe(10);
    expect(row.nutrition.fibreAoacG).toBe(1);
    expect(row.nutrition.proteinG).toBe(3);
    expect(row.nutrition.sodiumMg).toBe(200); // salt 0.5g × 400
    expect(row.ingredientText).toBe('apple');
  });

  it('prefers explicit Sodium over Salt conversion', () => {
    const csv = [
      'Name,Sodium (mg),Salt (g)',
      'Test,350,1',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows[0].nutrition.sodiumMg).toBe(350);
  });

  it('converts Salt to Sodium when Sodium column is absent', () => {
    const csv = [
      'Name,Salt (g)',
      'Test,1.2',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows[0].nutrition.sodiumMg).toBe(480); // 1.2 × 400
  });

  it('skips rows with empty Name and counts them as errors', () => {
    const csv = [
      'Name,Energy',
      'Cookie,1800',
      ',500',
      'Bread,1100',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.skippedCount).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when Name column is missing', () => {
    const csv = [
      'Product Code,Energy',
      'ABC123,1800',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toContain('CSV is missing a required "Name" column');
  });

  it('returns error when CSV is empty', () => {
    const result = parseCsvFile('');
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toContain('CSV file is empty');
  });

  it('defaults missing numeric fields to 0', () => {
    const csv = [
      'Name,Energy',
      'Minimal,',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].nutrition.energyKj).toBe(0);
    expect(result.rows[0].nutrition.saturatedFatG).toBe(0);
    expect(result.rows[0].nutrition.totalSugarG).toBe(0);
    expect(result.rows[0].nutrition.sodiumMg).toBe(0);
  });

  it('parses boolean Is Drink variants', () => {
    const csv = [
      'Name,Is Drink',
      'A,true',
      'B,YES',
      'C,1',
      'D,false',
      'E,no',
      'F,',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows[0].isDrink).toBe(true);
    expect(result.rows[1].isDrink).toBe(true);
    expect(result.rows[2].isDrink).toBe(true);
    expect(result.rows[3].isDrink).toBe(false);
    expect(result.rows[4].isDrink).toBe(false);
    expect(result.rows[5].isDrink).toBe(false);
  });

  it('ignores unknown columns without failing', () => {
    const csv = [
      'Name,Category,Energy,Notes',
      'Test,Snack,500,For kids',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Test');
    expect(result.rows[0].nutrition.energyKj).toBe(500);
  });

  it('strips unit suffixes from numeric fields', () => {
    const csv = [
      'Name,Energy,Saturated Fat,Sugars',
      'Test,1500 kJ,4.5 g,15g',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows[0].nutrition.energyKj).toBe(1500);
    expect(result.rows[0].nutrition.saturatedFatG).toBe(4.5);
    expect(result.rows[0].nutrition.totalSugarG).toBe(15);
  });

  it('skips blank lines between data rows', () => {
    const csv = [
      'Name,Energy',
      'Cookie,1800',
      '',
      'Bread,1100',
      '',
    ].join('\n');

    const result = parseCsvFile(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.skippedCount).toBe(0);
  });
});

describe('getCsvTemplate', () => {
  it('returns a parseable CSV template', () => {
    const template = getCsvTemplate();
    expect(template).toContain('Name');
    expect(template).toContain('Ingredients');

    const result = parseCsvFile(template);
    expect(result.errors).toEqual([]);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0].name).toBeTruthy();
  });
});
