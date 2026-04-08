import { NutritionData } from './types';

/**
 * CSV bulk recipe importer.
 *
 * Accepts a CSV with one recipe per row. Column headers are matched
 * case-insensitively against a set of accepted variants. Quoted fields
 * (including commas inside quotes and escaped "" quotes) are supported.
 *
 * Salt → Sodium conversion: if a Salt (g) column is present but Sodium
 * is missing, sodium_mg is derived as salt_g × 400.
 */

export interface CsvImportRow {
  name: string;
  isDrink: boolean;
  nutrition: NutritionData;
  ingredientText: string;
}

export interface CsvImportResult {
  rows: CsvImportRow[];
  skippedCount: number;
  errors: string[];
}

type FieldKey =
  | 'name'
  | 'isDrink'
  | 'energyKj'
  | 'saturatedFatG'
  | 'totalSugarG'
  | 'sodiumMg'
  | 'saltG'
  | 'fibreAoacG'
  | 'proteinG'
  | 'ingredients';

/**
 * Map of accepted header variants (normalised: lowercased, trimmed, collapsed)
 * to the internal field key.
 */
const HEADER_ALIASES: Record<string, FieldKey> = {
  // name
  'name': 'name',
  'recipe name': 'name',
  'recipe': 'name',
  'product name': 'name',
  'product': 'name',

  // is drink
  'is drink': 'isDrink',
  'isdrink': 'isDrink',
  'drink': 'isDrink',
  'beverage': 'isDrink',

  // energy (kJ)
  'energy': 'energyKj',
  'energy (kj)': 'energyKj',
  'energy kj': 'energyKj',
  'kj': 'energyKj',
  'energy kilojoules': 'energyKj',

  // saturated fat (g)
  'saturated fat': 'saturatedFatG',
  'saturated fat (g)': 'saturatedFatG',
  'saturates': 'saturatedFatG',
  'saturates (g)': 'saturatedFatG',
  'sat fat': 'saturatedFatG',
  'sat fat (g)': 'saturatedFatG',
  'saturated fats': 'saturatedFatG',

  // total sugar (g)
  'sugar': 'totalSugarG',
  'sugars': 'totalSugarG',
  'sugar (g)': 'totalSugarG',
  'sugars (g)': 'totalSugarG',
  'total sugar': 'totalSugarG',
  'total sugars': 'totalSugarG',
  'total sugar (g)': 'totalSugarG',
  'total sugars (g)': 'totalSugarG',

  // sodium (mg)
  'sodium': 'sodiumMg',
  'sodium (mg)': 'sodiumMg',
  'sodium mg': 'sodiumMg',

  // salt (g) → converts to sodium
  'salt': 'saltG',
  'salt (g)': 'saltG',
  'salt g': 'saltG',

  // fibre (g)
  'fibre': 'fibreAoacG',
  'fiber': 'fibreAoacG',
  'fibre (g)': 'fibreAoacG',
  'fiber (g)': 'fibreAoacG',
  'dietary fibre': 'fibreAoacG',
  'dietary fiber': 'fibreAoacG',
  'fibre aoac': 'fibreAoacG',

  // protein (g)
  'protein': 'proteinG',
  'protein (g)': 'proteinG',
  'proteins': 'proteinG',

  // ingredients
  'ingredients': 'ingredients',
  'ingredient list': 'ingredients',
  'ingredient': 'ingredients',
};

function normaliseHeader(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Parse a single CSV line into an array of fields.
 * Supports quoted fields containing commas and escaped quotes ("").
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped double-quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }

  result.push(current);
  return result.map((f) => f.trim());
}

function parseBoolean(value: string): boolean {
  const v = value.toLowerCase().trim();
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 't';
}

function parseNumber(value: string): number {
  if (!value) return 0;
  // Strip common unit suffixes (kj, g, mg) and whitespace
  const cleaned = value.replace(/[a-zA-Z]/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse a CSV file text into import rows.
 */
export function parseCsvFile(text: string): CsvImportResult {
  const rows: CsvImportRow[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  // Normalise line endings and split
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Find the first non-empty line to use as headers
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      headerLineIdx = i;
      break;
    }
  }

  if (headerLineIdx === -1) {
    return { rows, skippedCount: 0, errors: ['CSV file is empty'] };
  }

  const rawHeaders = parseCsvLine(lines[headerLineIdx]);
  const headerMap: (FieldKey | null)[] = rawHeaders.map((h) => {
    const normalised = normaliseHeader(h);
    return HEADER_ALIASES[normalised] ?? null;
  });

  // Verify required column: name
  if (!headerMap.includes('name')) {
    return {
      rows,
      skippedCount: 0,
      errors: ['CSV is missing a required "Name" column'],
    };
  }

  // Process data rows
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = parseCsvLine(line);
    const row: Record<FieldKey, string> = {
      name: '',
      isDrink: '',
      energyKj: '',
      saturatedFatG: '',
      totalSugarG: '',
      sodiumMg: '',
      saltG: '',
      fibreAoacG: '',
      proteinG: '',
      ingredients: '',
    };

    for (let c = 0; c < cells.length && c < headerMap.length; c++) {
      const field = headerMap[c];
      if (field) {
        row[field] = cells[c];
      }
    }

    const name = row.name.trim();
    if (!name) {
      skippedCount++;
      errors.push(`Row ${i + 1}: skipped — missing Name`);
      continue;
    }

    // Sodium: prefer explicit value, otherwise derive from salt
    let sodiumMg = parseNumber(row.sodiumMg);
    if (sodiumMg === 0 && row.saltG) {
      sodiumMg = parseNumber(row.saltG) * 400;
    }

    const nutrition: NutritionData = {
      energyKj: parseNumber(row.energyKj),
      saturatedFatG: parseNumber(row.saturatedFatG),
      totalSugarG: parseNumber(row.totalSugarG),
      sodiumMg,
      fibreAoacG: parseNumber(row.fibreAoacG),
      proteinG: parseNumber(row.proteinG),
    };

    rows.push({
      name,
      isDrink: parseBoolean(row.isDrink),
      nutrition,
      ingredientText: row.ingredients.trim(),
    });
  }

  return { rows, skippedCount, errors };
}

/**
 * Returns a template CSV string that users can download as a starting point.
 */
export function getCsvTemplate(): string {
  const header =
    'Name,Is Drink,Energy (kJ),Saturated Fat (g),Total Sugar (g),Salt (g),Fibre (g),Protein (g),Ingredients';
  const example1 =
    'Fruit Smoothie,FALSE,450,0.5,25,0.3,2.5,3.5,"Strawberry (50%), Banana (30%), Orange Juice (20%)"';
  const example2 =
    'Oat Cookie,FALSE,1800,8,22,0.75,3.8,6.2,"Oats (45%), Sugar (25%), Butter (20%), Raisins (10%)"';
  return [header, example1, example2].join('\n') + '\n';
}
