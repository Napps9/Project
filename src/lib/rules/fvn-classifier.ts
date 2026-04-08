import { FvnCategory, FvnRecognition, FvnForm, FvnOverride, ParsedIngredient } from '../types';

/**
 * FVN (Fruit, Vegetable & Nut) ingredient classifier.
 *
 * Based on the UK NPM 2011 Technical Guidance, "fruit, vegetables and nuts" includes:
 * - Fresh, canned, frozen fruit and vegetables
 * - 100% fruit juice (whether freshly squeezed or from concentrate)
 * - Dried fruit and vegetables (counted at WEIGHT × 2)
 * - Concentrated tomato puree (counted at WEIGHT × 2)
 * - Nuts (commonly called nuts — brazil, cashew, pine nut, etc.)
 * - Beans, pulses, lentils (legumes count as vegetables)
 *
 * Does NOT include:
 * - Cereals/grains (wheat, rice, oats, corn flour)
 * - Potatoes, yams and other starchy vegetables
 * - Herbs and spices in small quantities
 * - Fruit/vegetable powders, leathers, crystals
 * - Concentrated fruit juice sugars (NOT "from concentrate" reconstituted juices)
 * - Seeds (except those commonly regarded as nuts like brazil, cashew)
 */

interface FvnEntry {
  category: FvnCategory;
  keywords: string[];
}

const FVN_DATABASE: FvnEntry[] = [
  // ── Fruits ──
  {
    category: 'fruit',
    keywords: [
      'apple', 'apricot', 'avocado', 'banana', 'blackberry', 'blackcurrant',
      'blueberry', 'cherry', 'clementine', 'coconut', 'cranberry', 'currant',
      'date', 'dragonfruit', 'elderberry', 'fig', 'gooseberry', 'grape',
      'grapefruit', 'guava', 'kiwi', 'lemon', 'lime', 'lychee', 'mango',
      'mandarin', 'melon', 'nectarine', 'orange', 'papaya', 'passion fruit',
      'passionfruit', 'peach', 'pear', 'pineapple', 'plum', 'pomegranate',
      'prune', 'raisin', 'raspberry', 'redcurrant', 'satsuma', 'strawberry',
      'sultana', 'tangerine', 'watermelon',
      // Generic terms
      'fruit', 'fruits', 'berry', 'berries', 'citrus',
      'dried fruit', 'fruit puree', 'fruit juice',
      'apple juice', 'orange juice', 'lemon juice', 'lime juice',
      'grape juice', 'pineapple juice', 'cranberry juice',
    ],
  },
  // ── Vegetables ──
  {
    category: 'vegetable',
    keywords: [
      'artichoke', 'asparagus', 'aubergine', 'eggplant', 'beetroot', 'beet',
      'broccoli', 'brussels sprout', 'cabbage', 'carrot', 'cauliflower',
      'celeriac', 'celery', 'chard', 'courgette', 'zucchini', 'cucumber',
      'fennel', 'garlic', 'ginger', 'green bean', 'kale', 'leek', 'lettuce',
      'mushroom', 'okra', 'olive', 'onion', 'parsnip', 'pea', 'peas',
      'pepper', 'bell pepper', 'capsicum', 'chilli', 'chili', 'jalapeno',
      'pumpkin', 'radish', 'rocket', 'arugula', 'shallot', 'spinach',
      'spring onion', 'squash', 'butternut', 'sweetcorn', 'sweet corn',
      'corn on the cob', 'tomato', 'turnip', 'watercress',
      // Generic terms
      'vegetable', 'vegetables', 'veg', 'mixed vegetables',
      'tomato puree', 'tomato paste', 'tomato sauce', 'passata',
    ],
  },
  // ── Nuts (commonly called nuts — seeds are excluded separately) ──
  {
    category: 'nut',
    keywords: [
      'almond', 'brazil nut', 'cashew', 'chestnut', 'hazelnut', 'macadamia',
      'peanut', 'pecan', 'pine nut', 'pistachio', 'walnut',
      'nut', 'nuts', 'mixed nuts', 'nut butter', 'peanut butter',
      'almond butter', 'almond milk', 'coconut milk', 'coconut cream',
    ],
  },
  // ── Legumes (count as vegetables in NPM) ──
  {
    category: 'legume',
    keywords: [
      'bean', 'beans', 'black bean', 'kidney bean', 'butter bean', 'lima bean',
      'cannellini', 'haricot', 'borlotti', 'navy bean', 'pinto bean',
      'broad bean', 'fava bean', 'mung bean', 'adzuki',
      'lentil', 'lentils', 'red lentil', 'green lentil', 'puy lentil',
      'chickpea', 'chickpeas', 'hummus',
      'soybean', 'soya', 'soy', 'edamame', 'tofu', 'tempeh',
      'pulse', 'pulses', 'legume', 'legumes', 'dal', 'dhal', 'daal',
    ],
  },
];

/** Normalise an ingredient name for matching */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Detect the scoring form of an ingredient based on its name.
 *
 * Per UK NPM 2011 guidance:
 * - Dried fruit/veg and concentrated tomato puree count at weight × 2
 * - Fruit powders, leathers, crystals, and concentrated juices (used as sugar) are excluded
 * - Fresh/frozen/tinned/100% juice count at face weight
 */
function detectForm(name: string, isFvn: boolean, category: FvnCategory): FvnForm {
  if (!isFvn) return 'none';
  const n = name.toLowerCase();

  // 1. Excluded forms (highly processed)
  if (/\bpowders?\b/.test(n)) return 'excluded';
  if (/\bleathers?\b/.test(n)) return 'excluded';
  if (/\bcrystals?\b|\bcrystalline\b/.test(n)) return 'excluded';
  if (/\bflakes?\b/.test(n) && !n.includes('coconut')) return 'excluded';

  // "concentrate" as a noun (juice concentrate, fruit concentrate) → excluded
  // BUT "from concentrate" → fresh (it's reconstituted 100% juice)
  if (/\bconcentrate[ds]?\b/.test(n) && !/from concentrate/.test(n)) {
    // Exception: concentrated tomato puree IS counted (×2 per guidance)
    if (n.includes('tomato') && (n.includes('puree') || n.includes('paste'))) {
      return 'dried';
    }
    return 'excluded';
  }

  // 2. Dried forms (×2)
  if (/\bdried\b/.test(n)) return 'dried';
  if (/\bdesiccated\b/.test(n)) return 'dried';
  if (/\bdehydrated\b/.test(n)) return 'dried';
  // Inherently dried fruit
  if (/\b(raisin|sultana|currant|prune|date)s?\b/.test(n)) return 'dried';
  // Tomato paste / puree → per guidance, concentrated tomato puree is ×2
  if (n.includes('tomato') && (n.includes('paste') || n.includes('puree'))) {
    return 'dried';
  }

  // 3. Nut form (category-driven)
  if (category === 'nut') return 'nut';

  // 4. Default FVN → fresh (includes fresh/frozen/tinned/100% juice/purees)
  return 'fresh';
}

/**
 * Classify a single ingredient as FVN or not.
 *
 * Uses substring matching against the FVN keyword database.
 * Returns the category, form, and whether it counts as FVN.
 */
export function classifyIngredient(name: string): { isFvn: boolean; category: FvnCategory; recognition: FvnRecognition; form: FvnForm } {
  const normalised = normalise(name);

  // Check against exclusions first (potatoes, grains, seeds, etc.)
  if (isExcluded(normalised)) {
    return { isFvn: false, category: 'none', recognition: 'recognized_non_fvn', form: 'none' };
  }

  for (const entry of FVN_DATABASE) {
    for (const keyword of entry.keywords) {
      if (normalised.includes(keyword) || keyword.includes(normalised)) {
        const form = detectForm(name, true, entry.category);
        return { isFvn: true, category: entry.category, recognition: 'recognized_fvn', form };
      }
    }
  }

  return { isFvn: false, category: 'none', recognition: 'unrecognized', form: 'none' };
}

/**
 * Classify an ingredient, checking learned overrides first.
 * Priority: exact match in overrides → fall back to built-in classifier.
 */
export function classifyWithOverrides(
  name: string,
  overrides: FvnOverride[]
): { isFvn: boolean; category: FvnCategory; recognition: FvnRecognition; form: FvnForm } {
  const normalised = normalise(name);

  // Check exact match in learned overrides
  for (const override of overrides) {
    if (override.name === normalised) {
      return {
        isFvn: override.isFvn,
        category: (override.isFvn ? override.category : 'none') as FvnCategory,
        recognition: override.isFvn ? 'recognized_fvn' : 'recognized_non_fvn',
        form: override.form ?? (override.isFvn ? 'fresh' : 'none'),
      };
    }
  }

  // Fall back to built-in classifier
  return classifyIngredient(name);
}

/** Items that look like they could match but are NOT FVN */
const EXCLUSIONS = [
  'potato', 'potatoes', 'chips', 'french fries', 'crisps',
  // Starchy vegetables (per 5-a-day definition)
  'yam', 'yams', 'cassava', 'plantain', 'plantains',
  'wheat', 'flour', 'corn flour', 'cornflour', 'cornstarch', 'corn starch',
  'rice', 'oat', 'oats', 'barley', 'rye', 'millet', 'quinoa', 'buckwheat',
  'bread', 'pasta', 'noodle', 'cereal',
  'sugar', 'glucose', 'fructose', 'sucrose', 'dextrose', 'maltose',
  'syrup', 'honey', 'treacle', 'molasses', 'caramel',
  'butter', 'cream', 'milk', 'cheese', 'yogurt', 'yoghurt',
  'egg', 'eggs',
  'meat', 'beef', 'pork', 'lamb', 'chicken', 'turkey', 'duck',
  'fish', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp',
  'oil', 'margarine', 'lard', 'dripping',
  'salt', 'vinegar', 'soy sauce',
  'water', 'stock',
  'gelatine', 'gelatin',
  'chocolate', 'cocoa',
  // Seeds (per guidance: seeds are NOT included unless commonly called nuts)
  'seed', 'seeds', 'sesame', 'sesame seed', 'sunflower seed', 'pumpkin seed',
  'flaxseed', 'linseed', 'chia seed', 'chia seeds', 'hemp seed', 'poppy seed',
];

function isExcluded(normalised: string): boolean {
  // Any ingredient ending in "seed" or "seeds" is excluded
  // (seeds are NOT FVN unless commonly called nuts like brazil/cashew/pine — those
  // are matched via the nut keywords BEFORE this function runs)
  if (/\bseeds?$/.test(normalised)) {
    return true;
  }

  // Exact match or the normalised name starts with an exclusion
  for (const excl of EXCLUSIONS) {
    if (normalised === excl || normalised.startsWith(excl + ' ')) {
      return true;
    }
  }
  return false;
}

/** Get the scoring multiplier for a form */
function formMultiplier(form: FvnForm): number {
  if (form === 'dried') return 2;
  if (form === 'excluded' || form === 'none') return 0;
  return 1; // fresh, nut
}

/**
 * Classify a list of ingredients and calculate the total FVN percentage.
 * Applies the form multiplier: dried fruit/veg and concentrated tomato puree count × 2.
 */
export function calculateFvnFromIngredients(
  ingredients: Array<{ name: string; proportion: number }>
): { fvnPercentage: number; classifications: Array<{ name: string; isFvn: boolean; category: FvnCategory; form: FvnForm }> } {
  let fvnPercentage = 0;
  const classifications = ingredients.map((ing) => {
    const result = classifyIngredient(ing.name);
    if (result.isFvn) {
      fvnPercentage += ing.proportion * formMultiplier(result.form);
    }
    return { name: ing.name, ...result };
  });

  return { fvnPercentage: Math.min(fvnPercentage, 100), classifications };
}

/**
 * Parse a comma-separated ingredient string and classify each ingredient.
 * Handles real-world formats: strips parenthetical content, extracts embedded percentages.
 *
 * Examples:
 *   "tomatoes (40%), sugar, wheat flour" →
 *     [{ name: "tomatoes", proportion: 40, ... }, { name: "sugar", proportion: 0, ... }, ...]
 */
export function parseAndClassifyIngredients(rawText: string): ParsedIngredient[] {
  // Strip parenthetical content BEFORE splitting on commas,
  // since parentheticals may contain commas (e.g. "chocolate (cocoa mass, sugar)")
  const stripped = rawText.replace(/\([^)]*\)/g, (match) => {
    // Preserve percentage values from parentheticals before removing
    const pctMatch = match.match(/(\d+(?:\.\d+)?)\s*%/);
    return pctMatch ? ` ${pctMatch[1]}%` : '';
  });

  const parts = stripped.split(',').map((s) => s.trim()).filter(Boolean);

  return parts.map((raw) => {
    // Extract percentage if present, e.g. "tomatoes 40%" or "sugar 15%"
    let proportion = 0;
    const percentMatch = raw.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      proportion = parseFloat(percentMatch[1]);
    }

    // Strip percentage annotations to get clean name
    const name = raw
      .replace(/\d+(?:\.\d+)?\s*%/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!name) {
      return null;
    }

    const result = classifyIngredient(name);

    return {
      name,
      proportion,
      isFvn: result.isFvn,
      category: result.category,
      recognition: result.recognition,
      form: result.form,
    };
  }).filter((item): item is ParsedIngredient => item !== null);
}
