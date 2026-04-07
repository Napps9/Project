import { NutritionData } from './types';

/**
 * Parse freeform nutrition label text and extract the 6 NPM-required nutrients.
 * Handles common UK packaging formats: colon-separated, tab-separated, newline-separated.
 *
 * Key conversion: salt (g) → sodium (mg) using factor × 400.
 *
 * Returns a partial NutritionData with only the fields successfully extracted.
 */
export function parseNutritionText(text: string): { parsed: Partial<NutritionData>; found: string[]; notFound: string[] } {
  const normalised = text.toLowerCase();
  const parsed: Partial<NutritionData> = {};
  const found: string[] = [];

  // Energy in kJ
  const energyKj = extractValue(normalised, /energy[^0-9]*?(\d+(?:\.\d+)?)\s*kj/);
  if (energyKj !== null) {
    parsed.energyKj = energyKj;
    found.push('Energy (kJ)');
  }

  // Saturated fat — match "saturates", "saturated fat", "sat fat", "sat. fat"
  const satFat = extractValue(normalised, /sat(?:urate[ds]?|\.?\s*fat)[^0-9]*?(\d+(?:\.\d+)?)\s*g/);
  if (satFat !== null) {
    parsed.saturatedFatG = satFat;
    found.push('Saturated Fat');
  }

  // Total sugars — match "sugars", "sugar", "of which sugars"
  const sugar = extractValue(normalised, /sugar[s]?[^0-9]*?(\d+(?:\.\d+)?)\s*g/);
  if (sugar !== null) {
    parsed.totalSugarG = sugar;
    found.push('Sugar');
  }

  // Sodium (mg) directly, or convert from salt (g)
  const sodium = extractValue(normalised, /sodium[^0-9]*?(\d+(?:\.\d+)?)\s*mg/);
  if (sodium !== null) {
    parsed.sodiumMg = sodium;
    found.push('Sodium');
  } else {
    // Try salt → sodium conversion (salt_g × 400 = sodium_mg)
    const salt = extractValue(normalised, /salt[^0-9]*?(\d+(?:\.\d+)?)\s*g/);
    if (salt !== null) {
      parsed.sodiumMg = Math.round(salt * 400);
      found.push('Sodium (from salt)');
    }
  }

  // Fibre — match "fibre", "fiber", "dietary fibre"
  const fibre = extractValue(normalised, /fib(?:re|er)[^0-9]*?(\d+(?:\.\d+)?)\s*g/);
  if (fibre !== null) {
    parsed.fibreAoacG = fibre;
    found.push('Fibre');
  }

  // Protein
  const protein = extractValue(normalised, /protein[^0-9]*?(\d+(?:\.\d+)?)\s*g/);
  if (protein !== null) {
    parsed.proteinG = protein;
    found.push('Protein');
  }

  // Determine what's missing
  const allFields = ['Energy (kJ)', 'Saturated Fat', 'Sugar', 'Sodium', 'Fibre', 'Protein'];
  const notFound = allFields.filter((f) => !found.some((found) => found.startsWith(f.split(' ')[0])));

  return { parsed, found, notFound };
}

function extractValue(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return isNaN(value) ? null : value;
}
