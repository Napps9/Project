/**
 * UK Nutrient Profiling Model (2004/2005) scoring threshold tables.
 *
 * Each array lists the upper bounds for points 0, 1, 2, … n.
 * A value scores k points if it is > thresholds[k-1] (and ≤ thresholds[k]).
 * The generic `calculatePoints` function walks these arrays.
 */

// ── A Points thresholds (per 100g) ──
// Index = point value. Value exceeding the threshold earns that many points.

/** Energy in kJ — thresholds for points 0-10 */
export const ENERGY_KJ_THRESHOLDS = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];

/** Saturated fat in g — thresholds for points 0-10 */
export const SATURATED_FAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Total sugar in g — thresholds for points 0-10 */
export const TOTAL_SUGAR_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];

/** Sodium in mg — thresholds for points 0-10 */
export const SODIUM_THRESHOLDS = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];

// ── C Points thresholds (per 100g) ──

/**
 * Fruit, vegetables & nuts (FVN) percentage.
 * Only scores 0, 1, 2, or 5 — there are no 3 or 4 point bands.
 * Thresholds: >40% = 1pt, >60% = 2pts, >80% = 5pts.
 */
export const FVN_PERCENTAGE_THRESHOLDS = [40, 60, 80];
export const FVN_POINT_VALUES = [0, 1, 2, 5]; // maps to: ≤40=0, >40=1, >60=2, >80=5

/** Fibre (AOAC method) in g — thresholds for points 0-5 */
export const FIBRE_AOAC_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7];

/** Fibre (NSP method) in g — thresholds for points 0-5 (not used by default) */
export const FIBRE_NSP_THRESHOLDS = [0.7, 1.4, 2.1, 2.8, 3.5];

/** Protein in g — thresholds for points 0-5 */
export const PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0];

// ── Classification thresholds ──

/** Foods scoring ≥ this value are classified as HFSS ("less healthy") */
export const FOOD_HFSS_THRESHOLD = 4;

/** Drinks scoring ≥ this value are classified as HFSS ("less healthy") */
export const DRINK_HFSS_THRESHOLD = 1;

/** If total A points ≥ this, protein can only count if FVN = 5 */
export const PROTEIN_RULE_A_THRESHOLD = 11;

/** FVN points must equal this to unlock protein when A ≥ 11 */
export const PROTEIN_RULE_FVN_REQUIRED = 5;
