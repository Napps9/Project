import { NutritionData } from './types';
import { parseNutritionText } from './nutrition-parser';
import { CsvImportRow, CsvImportResult } from './csv-importer';

/**
 * PDF bulk recipe importer.
 *
 * Two-stage process:
 *   1. Extract text from a PDF (per-page) using pdfjs-dist (browser-only).
 *   2. Split that text into recipe blocks heuristically and extract
 *      name / ingredients / nutrition from each block.
 *
 * Splitter heuristics, tried in order:
 *   - Explicit recipe markers ("Recipe:", "Recipe Name:", "Product:",
 *     "Product Name:", "Name:") at the start of a line.
 *   - Page-form-feed (\f) characters inserted between PDF pages.
 *   - Whole document treated as a single recipe.
 *
 * Limitations:
 *   - Image-only / scanned PDFs produce no extractable text and will
 *     return zero rows. OCR is out of scope.
 *   - Recipe blocks without recognisable nutrition fields are reported
 *     as errors but still imported (with zeros) so the user can fix
 *     them in the detail view.
 */

const RECIPE_MARKER_REGEX = /^\s*(?:recipe(?:\s*name)?|product(?:\s*name)?|name)\s*[:\-]\s*(.+)$/i;
const INGREDIENTS_HEADER_REGEX = /^\s*ingredients?\s*[:\-]\s*(.*)$/i;
const NUTRITION_HEADER_REGEX = /^\s*(?:nutrition(?:al)?(?:\s*(?:information|info|values|facts))?|nutrients?|per\s*100\s*g)\s*[:\-]?\s*$/i;
const SECTION_BREAK_REGEX = /^\s*(?:method|instructions?|directions?|preparation|notes?|allergens?|storage|serving\s*size|servings?)\s*[:\-]?\s*/i;

/** Drink detection from a name or text snippet. */
function looksLikeDrink(text: string): boolean {
  return /\b(drink|beverage|smoothie|juice|shake|cordial|squash|soda|tea|coffee|cola|lemonade)\b/i.test(text);
}

/**
 * Split a long PDF-extracted text into individual recipe blocks.
 */
export function splitRecipeBlocks(text: string): string[] {
  // Normalise line endings; preserve form-feed which marks PDF page breaks
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strategy 1: split on explicit "Recipe:" / "Name:" markers at line start
  const lines = normalised.split('\n');
  const markerIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (RECIPE_MARKER_REGEX.test(lines[i])) {
      markerIndices.push(i);
    }
  }

  if (markerIndices.length >= 1) {
    const blocks: string[] = [];
    for (let i = 0; i < markerIndices.length; i++) {
      const start = markerIndices[i];
      const end = i + 1 < markerIndices.length ? markerIndices[i + 1] : lines.length;
      blocks.push(lines.slice(start, end).join('\n').trim());
    }
    return blocks.filter((b) => b.length > 0);
  }

  // Strategy 2: split on form-feed page breaks (pdfjs-dist inserts \f between pages)
  if (normalised.includes('\f')) {
    return normalised
      .split('\f')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  }

  // Strategy 3: whole document is one recipe
  const trimmed = normalised.trim();
  return trimmed.length > 0 ? [trimmed] : [];
}

/**
 * Extract a recipe name from a block.
 *  - Prefer the value following an explicit "Recipe:" / "Name:" marker.
 *  - Otherwise the first non-empty line that doesn't look like a section header.
 */
function extractName(block: string): string {
  const lines = block.split('\n');
  for (const line of lines) {
    const m = line.match(RECIPE_MARKER_REGEX);
    if (m && m[1].trim()) return m[1].trim();
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (INGREDIENTS_HEADER_REGEX.test(trimmed)) continue;
    if (NUTRITION_HEADER_REGEX.test(trimmed)) continue;
    if (SECTION_BREAK_REGEX.test(trimmed)) continue;
    // Skip lines that are just numbers / units
    if (/^[\d\s.,kjmgL%]+$/i.test(trimmed)) continue;
    return trimmed;
  }
  return '';
}

/**
 * Extract the ingredient text from a block.
 * Looks for an "Ingredients:" header and captures everything until the next
 * section header (Nutrition, Method, Allergens, etc.) or the end of the block.
 */
function extractIngredients(block: string): string {
  const lines = block.split('\n');
  let inIngredients = false;
  const collected: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inIngredients) {
      const m = trimmed.match(INGREDIENTS_HEADER_REGEX);
      if (m) {
        inIngredients = true;
        if (m[1] && m[1].trim()) collected.push(m[1].trim());
      }
      continue;
    }

    // Stop on next section
    if (NUTRITION_HEADER_REGEX.test(trimmed) || SECTION_BREAK_REGEX.test(trimmed)) {
      break;
    }
    // Stop on a line that starts with a typical nutrient name
    if (/^(?:energy|kcal|fat|saturate|sugar|salt|sodium|fibre|fiber|protein|carbohydrate)/i.test(trimmed)) {
      break;
    }
    if (trimmed) collected.push(trimmed);
  }

  return collected.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse a single recipe block into a CsvImportRow.
 * Returns { row, missingFields } — caller decides whether missing nutrition
 * counts as an error or a warning.
 */
function parseBlock(block: string): { row: CsvImportRow | null; missingFields: string[] } {
  const name = extractName(block);
  if (!name) {
    return { row: null, missingFields: [] };
  }

  const ingredientText = extractIngredients(block);
  const { parsed, notFound } = parseNutritionText(block);

  const nutrition: NutritionData = {
    energyKj: parsed.energyKj ?? 0,
    saturatedFatG: parsed.saturatedFatG ?? 0,
    totalSugarG: parsed.totalSugarG ?? 0,
    sodiumMg: parsed.sodiumMg ?? 0,
    fibreAoacG: parsed.fibreAoacG ?? 0,
    proteinG: parsed.proteinG ?? 0,
  };

  const isDrink = looksLikeDrink(name) || looksLikeDrink(block);

  return {
    row: { name, isDrink, nutrition, ingredientText },
    missingFields: notFound,
  };
}

/**
 * Parse PDF-extracted text into import rows.
 * Pure function — no PDF library calls. Easy to test.
 */
export function parsePdfText(text: string): CsvImportResult {
  const rows: CsvImportRow[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  if (!text || !text.trim()) {
    return { rows, skippedCount: 0, errors: ['PDF contains no extractable text'] };
  }

  const blocks = splitRecipeBlocks(text);
  if (blocks.length === 0) {
    return { rows, skippedCount: 0, errors: ['No recipes found in PDF'] };
  }

  blocks.forEach((block, idx) => {
    const { row, missingFields } = parseBlock(block);
    if (!row) {
      skippedCount++;
      errors.push(`Block ${idx + 1}: skipped — could not detect a recipe name`);
      return;
    }
    rows.push(row);
    if (missingFields.length > 0) {
      errors.push(
        `"${row.name}": missing nutrition fields (${missingFields.join(', ')}) — defaulted to 0`
      );
    }
  });

  return { rows, skippedCount, errors };
}

/**
 * Browser-only: extract text from a PDF File and parse it.
 * Uses pdfjs-dist via dynamic import so it doesn't bloat the server bundle.
 * Form-feed (\f) separators are inserted between pages so the splitter can
 * fall back to per-page recipes when no explicit markers are present.
 */
export async function parsePdfFile(file: File): Promise<CsvImportResult> {
  if (typeof window === 'undefined') {
    return { rows: [], skippedCount: 0, errors: ['PDF parsing only works in the browser'] };
  }

  try {
    // Dynamic import — keeps pdfjs out of the server bundle and only loads
    // it when the user actually uploads a PDF.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Webpack 5 / Next.js: bundle the worker via URL constructor.
    // This is the canonical pattern recommended by pdfjs-dist for modern bundlers.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;

    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      // Join text items with spaces, insert newlines on Y-coordinate jumps
      let lastY: number | null = null;
      let pageText = '';
      for (const item of content.items as Array<{ str: string; transform?: number[] }>) {
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          pageText += '\n';
        }
        pageText += item.str + ' ';
        if (y !== null) lastY = y;
      }
      pageTexts.push(pageText.trim());
    }

    // Form-feed between pages so the splitter can use page boundaries as fallback
    const fullText = pageTexts.join('\n\f\n');
    return parsePdfText(fullText);
  } catch (err) {
    return {
      rows: [],
      skippedCount: 0,
      errors: [
        `Failed to read PDF: ${err instanceof Error ? err.message : 'unknown error'}`,
      ],
    };
  }
}
