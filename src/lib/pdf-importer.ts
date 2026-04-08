import { NutritionData } from './types';
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
// Allow either a colon-led variant ("Ingredients: x") OR the word "Ingredients"
// alone on a line.
const INGREDIENTS_HEADER_REGEX = /^\s*ingredients?\s*(?:[:\-]\s*(.*))?$/i;
// Section start (no trailing $ — handles "NUTRIENTS QUANTITY PER SERVE...")
const NUTRITION_HEADER_REGEX = /^\s*(?:nutrition(?:al)?\b|nutrients?\b|per\s*100\s*g\b)/i;
const SECTION_BREAK_REGEX = /^\s*(?:method|instructions?|directions?|preparation|notes?|allergens?|storage|serving\s*size|servings?|portions?)\s*[:\-]?\s*/i;

// Two-column header marker — when present, prefer the per-100g column.
const PER_100G_REGEX = /\bper\s*100\s*g\b/i;

// Supplier-format unit/weight extraction.
// "PCE 2.000 (1 PCE = 58 G)" → 2 pieces × 58g = 116g
const PCE_REGEX = /\bPCE\s+(\d+(?:\.\d+)?)\s*\(?\s*1\s*PCE\s*=\s*(\d+(?:\.\d+)?)\s*G\s*\)?/i;
// "GRAM 180.000", "MILLILITRE 170.000", "KILOGRAM 1.5"
const UNIT_WEIGHT_REGEX = /\b(GRAMS?|MILLILITRES?|KILOGRAMS?)\s+(\d+(?:\.\d+)?)/i;

/** Drink detection — call only on the recipe NAME, not the whole block. */
function looksLikeDrink(name: string): boolean {
  return /\b(drink|beverage|smoothie|juice|shake|cordial|squash|soda|tea|coffee|cola|lemonade)\b/i.test(name);
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
 * Strip a single supplier-catalog ingredient line down to a clean name and
 * extract its weight (if a GRAM/MILLILITRE/PCE unit is present).
 *
 * Example input:
 *   "Everyday Essentials Plain White Flour - GENERAL - 6-1.5kg (Foo) [42018] GRAM 180.000"
 * Example output:
 *   { name: "Everyday Essentials Plain White Flour", weightG: 180 }
 */
export function cleanIngredientLine(
  line: string
): { name: string; weightG: number | null } | null {
  let s = line.trim();
  if (!s) return null;

  let weightG: number | null = null;

  // 1. Extract piece-count with per-piece weight first (eggs, etc.)
  const pceMatch = s.match(PCE_REGEX);
  if (pceMatch) {
    const count = parseFloat(pceMatch[1]);
    const perPiece = parseFloat(pceMatch[2]);
    weightG = count * perPiece;
    s = s.replace(pceMatch[0], ' ');
  } else {
    // 2. Plain unit + weight (GRAM 180.000, MILLILITRE 170.000)
    const unitMatch = s.match(UNIT_WEIGHT_REGEX);
    if (unitMatch) {
      const val = parseFloat(unitMatch[2]);
      const unit = unitMatch[1].toUpperCase();
      // Treat ml as g (density ≈ 1 for typical baking liquids); kg → g
      weightG = unit.startsWith('KILO') ? val * 1000 : val;
      s = s.replace(unitMatch[0], ' ');
    }
  }

  // 3. SKU codes [12345]
  s = s.replace(/\[\d+\]/g, ' ');

  // 4. Brand/sub-name parentheticals — there can be several
  s = s.replace(/\([^)]*\)/g, ' ');

  // 5. Pack size patterns: "6-1.5kg", "1-1kg", "500g", "5ltr", "1-60pk"
  s = s.replace(/\b\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?\s*(?:kg|g|ltr|l|ml|pk)\b/gi, ' ');

  // 6. State markers: "- GENERAL -", "- CHILLED -", "- FROZEN -", "- AMBIENT -"
  s = s.replace(/\s*-\s*(?:GENERAL|CHILLED|FROZEN|AMBIENT|ROOM\s*TEMP(?:ERATURE)?)\s*-?\s*/gi, ' ');

  // 7. Strip leftover all-numeric tokens (4+ digits — usually catalog ids)
  s = s.replace(/\b\d{4,}\b/g, ' ');

  // 8. Remove commas — they'd later confuse the comma-split ingredient parser
  s = s.replace(/,/g, ' ');

  // 9. Collapse whitespace and trim trailing dashes/punctuation
  s = s.replace(/\s+/g, ' ').replace(/^[\s\-]+|[\s\-]+$/g, '').trim();

  if (!s) return null;
  return { name: s, weightG };
}

/**
 * Extract the ingredient text from a block. Handles both:
 *  - Supplier multi-line format (one ingredient per line, with GRAM/PCE
 *    weights) → cleans each line, computes proportions from weights, and
 *    returns a percentage-annotated comma-separated string.
 *  - Loose / single-line format → joins lines with spaces (caller will
 *    comma-split as before).
 */
function extractIngredients(block: string): string {
  const lines = block.split('\n');
  let inIngredients = false;
  const collected: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!inIngredients) {
      const m = trimmed.match(INGREDIENTS_HEADER_REGEX);
      if (m) {
        inIngredients = true;
        if (m[1] && m[1].trim()) collected.push(m[1].trim());
      }
      continue;
    }

    // Stop on next section header
    if (NUTRITION_HEADER_REGEX.test(trimmed) || SECTION_BREAK_REGEX.test(trimmed)) {
      break;
    }
    // Stop on a line that starts with a typical nutrient name
    if (/^(?:energy|kcal|fat|saturate|sugar|salt|sodium|fibre|fiber|protein|carbohydrate)/i.test(trimmed)) {
      break;
    }
    if (trimmed) collected.push(trimmed);
  }

  if (collected.length === 0) return '';

  // Multi-line supplier format detection: 2+ lines, at least half have unit
  // markers (GRAM/MILLILITRE/PCE)
  const linesWithUnits = collected.filter((l) => PCE_REGEX.test(l) || UNIT_WEIGHT_REGEX.test(l));
  const isMultiLineCatalog =
    collected.length >= 2 && linesWithUnits.length >= Math.ceil(collected.length / 2);

  if (!isMultiLineCatalog) {
    // Loose format: join with spaces, let the caller's comma-splitter handle it
    return collected.join(' ').replace(/\s+/g, ' ').trim();
  }

  const cleaned = collected
    .map(cleanIngredientLine)
    .filter((c): c is { name: string; weightG: number | null } => c !== null);

  if (cleaned.length === 0) return '';

  const totalWeight = cleaned.reduce((sum, c) => sum + (c.weightG ?? 0), 0);

  if (totalWeight > 0) {
    return cleaned
      .map((c) => {
        const pct = c.weightG ? ((c.weightG / totalWeight) * 100).toFixed(2) : '0';
        return `${c.name} ${pct}%`;
      })
      .join(', ');
  }

  // No weights extracted — at least return cleaned names
  return cleaned.map((c) => c.name).join(', ');
}

/**
 * Extract nutrition from a PDF recipe block, with two-column awareness.
 *
 * Handles three common layouts:
 *  - Single-nutrient-per-line ("Energy 450 kJ\nSaturates 0.5 g\n…")
 *  - All-on-one-line ("Energy 1800 kJ, Sat Fat 8 g, Sugars 22 g, …")
 *  - Two-column supplier tables with a "per 100g" header row:
 *      "Energy (kJ) 923.3 1,398.93"
 *    — the unit sits in the row header rather than after each number, and
 *    the NPM model requires the per-100g (rightmost) value.
 *
 * Thousand-separators (e.g. "1,398.93") are stripped before parsing.
 */
export function extractPdfNutrition(
  block: string
): { parsed: Partial<NutritionData>; notFound: string[] } {
  const has100gColumn = PER_100G_REGEX.test(block);

  // Strip thousand-separators: "1,398.93" → "1398.93"
  let clean = block;
  while (/(\d),(\d{3})/.test(clean)) {
    clean = clean.replace(/(\d),(\d{3})/g, '$1$2');
  }
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  // Only a genuine nutritional unit parenthetical counts as a unit annotation
  // when deciding whether a line is a two-column table row. "(25%)", "(Foo
  // Brand)", "(estimated)" must not qualify — otherwise ingredient lines like
  // "Sugar (25%), Butter (20%), Raisins (10%)" get mis-read as a sugar row.
  const UNIT_PAREN_REGEX = /^\s*\(\s*(?:kj|kcal|g|mg|mcg|µg|kj\/kcal)\s*\)/i;

  function extract(nameRegex: RegExp, unitPattern: string): number | null {
    for (const line of lines) {
      const nameMatch = line.match(nameRegex);
      if (!nameMatch || nameMatch.index === undefined) continue;

      // Only look at the portion of the line AFTER the matched nutrient name.
      // This is what keeps "Sat Fat 8 g, Sugars 22 g, …" from returning 8
      // as the sugar value.
      let after = line.slice(nameMatch.index + nameMatch[0].length);

      // Strip a parenthetical unit annotation sitting right after the name
      // (supplier tables: "Energy (kJ) 923.3 1398.93", "Protein (g) 3.22 4.87").
      // Track whether we actually stripped one — it's the signal that this is
      // a table row where the unit lives in the header rather than after each
      // number.
      const strippedUnitParen = UNIT_PAREN_REGEX.test(after);
      if (strippedUnitParen) {
        after = after.replace(UNIT_PAREN_REGEX, '');
      }

      // Prefer numbers followed by an explicit unit.
      const withUnitRe = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\b`, 'gi');
      const numbers: number[] = [];
      let m: RegExpExecArray | null;
      while ((m = withUnitRe.exec(after)) !== null) {
        numbers.push(parseFloat(m[1]));
      }

      // Fallback for the two-column format where the unit lives in the row
      // header, not after each number — take plain numbers. Only fire this
      // fallback when we actually saw a unit parenthetical: that's our only
      // reliable signal that the line is a nutrition table row and not, say,
      // an ingredient line with a catalog weight.
      if (numbers.length === 0 && strippedUnitParen && has100gColumn) {
        const plainRe = /(\d+(?:\.\d+)?)/g;
        while ((m = plainRe.exec(after)) !== null) {
          numbers.push(parseFloat(m[1]));
        }
      }

      if (numbers.length === 0) continue;

      // Two-column layout → take the rightmost (per-100g) value; otherwise first.
      return has100gColumn && numbers.length >= 2
        ? numbers[numbers.length - 1]
        : numbers[0];
    }
    return null;
  }

  const parsed: Partial<NutritionData> = {};
  const found: string[] = [];

  // Energy in kJ
  const energy = extract(/\benergy\b/i, 'kj');
  if (energy !== null) {
    parsed.energyKj = energy;
    found.push('Energy');
  }

  // Saturated fat — matches "saturated", "saturates", "saturated fat", "sat fat", "sat. fat"
  const satFat = extract(/\b(?:saturate[ds]?(?:\s*fat)?|sat\.?\s*fat)\b/i, 'g');
  if (satFat !== null) {
    parsed.saturatedFatG = satFat;
    found.push('Saturated Fat');
  }

  // Sugars
  const sugar = extract(/\bsugars?\b/i, 'g');
  if (sugar !== null) {
    parsed.totalSugarG = sugar;
    found.push('Sugar');
  }

  // Sodium (direct) or salt → sodium
  const sodium = extract(/\bsodium\b/i, 'mg');
  if (sodium !== null) {
    parsed.sodiumMg = sodium;
    found.push('Sodium');
  } else {
    const salt = extract(/\bsalt\b/i, 'g');
    if (salt !== null) {
      parsed.sodiumMg = Math.round(salt * 400);
      found.push('Sodium (from salt)');
    }
  }

  // Fibre / Fiber / Dietary Fibre
  const fibre = extract(/\bfib(?:re|er)\b/i, 'g');
  if (fibre !== null) {
    parsed.fibreAoacG = fibre;
    found.push('Fibre');
  }

  // Protein
  const protein = extract(/\bprotein\b/i, 'g');
  if (protein !== null) {
    parsed.proteinG = protein;
    found.push('Protein');
  }

  const allFields = ['Energy', 'Saturated Fat', 'Sugar', 'Sodium', 'Fibre', 'Protein'];
  const notFound = allFields.filter((f) => !found.some((fd) => fd.startsWith(f.split(' ')[0])));

  return { parsed, notFound };
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
  const { parsed, notFound } = extractPdfNutrition(block);

  const nutrition: NutritionData = {
    energyKj: parsed.energyKj ?? 0,
    saturatedFatG: parsed.saturatedFatG ?? 0,
    totalSugarG: parsed.totalSugarG ?? 0,
    sodiumMg: parsed.sodiumMg ?? 0,
    fibreAoacG: parsed.fibreAoacG ?? 0,
    proteinG: parsed.proteinG ?? 0,
  };

  // Drink detection only from the NAME — checking the whole block produces
  // false positives from supplier categories like "Drinks, Snacks & Confectionery".
  const isDrink = looksLikeDrink(name);

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
