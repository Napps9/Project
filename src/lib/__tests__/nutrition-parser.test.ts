import { describe, it, expect } from 'vitest';
import { parseNutritionText } from '../nutrition-parser';

describe('parseNutritionText', () => {
  it('parses a standard UK label format', () => {
    const text = `
      Energy: 1500kJ
      Saturates: 4.5g
      Sugars: 15g
      Salt: 1.2g
      Fibre: 3g
      Protein: 5g
    `;
    const { parsed, found, notFound } = parseNutritionText(text);
    expect(parsed.energyKj).toBe(1500);
    expect(parsed.saturatedFatG).toBe(4.5);
    expect(parsed.totalSugarG).toBe(15);
    expect(parsed.sodiumMg).toBe(480); // 1.2 * 400
    expect(parsed.fibreAoacG).toBe(3);
    expect(parsed.proteinG).toBe(5);
    expect(found).toHaveLength(6);
    expect(notFound).toHaveLength(0);
  });

  it('handles comma-separated inline format', () => {
    const text = 'Energy 800kJ, Sat Fat 2.1g, Sugars 8g, Salt 0.5g, Fibre 1.5g, Protein 3g';
    const { parsed } = parseNutritionText(text);
    expect(parsed.energyKj).toBe(800);
    expect(parsed.saturatedFatG).toBe(2.1);
    expect(parsed.totalSugarG).toBe(8);
    expect(parsed.sodiumMg).toBe(200); // 0.5 * 400
    expect(parsed.fibreAoacG).toBe(1.5);
    expect(parsed.proteinG).toBe(3);
  });

  it('prefers explicit sodium over salt conversion', () => {
    const text = 'Sodium 300mg, Salt 1.0g';
    const { parsed } = parseNutritionText(text);
    expect(parsed.sodiumMg).toBe(300); // explicit sodium, not 400 from salt
  });

  it('returns partial data when only some fields found', () => {
    const text = 'Energy 1000kJ, Protein 8g';
    const { parsed, found, notFound } = parseNutritionText(text);
    expect(parsed.energyKj).toBe(1000);
    expect(parsed.proteinG).toBe(8);
    expect(parsed.saturatedFatG).toBeUndefined();
    expect(parsed.totalSugarG).toBeUndefined();
    expect(found).toHaveLength(2);
    expect(notFound.length).toBeGreaterThan(0);
  });

  it('handles decimal values', () => {
    const text = 'Saturates 0.3g, Sugar 2.5g';
    const { parsed } = parseNutritionText(text);
    expect(parsed.saturatedFatG).toBe(0.3);
    expect(parsed.totalSugarG).toBe(2.5);
  });

  it('returns empty parsed for garbage input', () => {
    const { parsed, found } = parseNutritionText('lorem ipsum dolor sit amet');
    expect(Object.keys(parsed)).toHaveLength(0);
    expect(found).toHaveLength(0);
  });
});
