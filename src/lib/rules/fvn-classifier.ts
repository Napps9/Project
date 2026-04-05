import { FvnCategory, FvnRecognition, ParsedIngredient } from '../types';

/**
 * FVN (Fruit, Vegetable & Nut) ingredient classifier.
 *
 * Based on the UK NPM guidance, "fruit, vegetables and nuts" includes:
 * - Fresh, canned, frozen, dried fruit and vegetables
 * - Beans, pulses, lentils (legumes count as vegetables)
 * - Nuts and seeds
 * - Coconut, ginger, mushrooms, sweetcorn
 * - Concentrated/pureed fruit/veg (counted at reconstituted weight)
 *
 * Does NOT include:
 * - Cereals/grains (wheat, rice, oats, corn flour)
 * - Potatoes (tubers used as starchy staple)
 * - Herbs and spices in small quantities
 * - Fruit juices beyond reconstitution
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
      'dried fruit', 'fruit puree', 'fruit concentrate', 'fruit juice',
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
  // ── Nuts & seeds ──
  {
    category: 'nut',
    keywords: [
      'almond', 'brazil nut', 'cashew', 'chestnut', 'hazelnut', 'macadamia',
      'peanut', 'pecan', 'pine nut', 'pistachio', 'walnut',
      'nut', 'nuts', 'mixed nuts', 'nut butter', 'peanut butter',
      'almond butter', 'almond milk', 'coconut milk', 'coconut cream',
      'seed', 'seeds', 'sesame', 'sunflower seed', 'pumpkin seed',
      'flaxseed', 'linseed', 'chia seed', 'hemp seed', 'poppy seed',
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
 * Classify a single ingredient as FVN or not.
 *
 * Uses substring matching against the FVN keyword database.
 * Returns the category and whether it counts as FVN.
 */
export function classifyIngredient(name: string): { isFvn: boolean; category: FvnCategory; recognition: FvnRecognition } {
  const normalised = normalise(name);

  // Check against exclusions first (potatoes, grains, etc.)
  if (isExcluded(normalised)) {
    return { isFvn: false, category: 'none', recognition: 'recognized_non_fvn' };
  }

  for (const entry of FVN_DATABASE) {
    for (const keyword of entry.keywords) {
      if (normalised.includes(keyword) || keyword.includes(normalised)) {
        return { isFvn: true, category: entry.category, recognition: 'recognized_fvn' };
      }
    }
  }

  return { isFvn: false, category: 'none', recognition: 'unrecognized' };
}

/** Items that look like they could match but are NOT FVN */
const EXCLUSIONS = [
  'potato', 'potatoes', 'chips', 'french fries', 'crisps',
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
];

function isExcluded(normalised: string): boolean {
  // Exact match or the normalised name starts with an exclusion
  for (const excl of EXCLUSIONS) {
    if (normalised === excl || normalised.startsWith(excl + ' ')) {
      return true;
    }
  }
  return false;
}

/**
 * Classify a list of ingredients and calculate the total FVN percentage.
 */
export function calculateFvnFromIngredients(
  ingredients: Array<{ name: string; proportion: number }>
): { fvnPercentage: number; classifications: Array<{ name: string; isFvn: boolean; category: FvnCategory }> } {
  let fvnPercentage = 0;
  const classifications = ingredients.map((ing) => {
    const result = classifyIngredient(ing.name);
    if (result.isFvn) {
      fvnPercentage += ing.proportion;
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
    };
  }).filter((item): item is ParsedIngredient => item !== null);
}
