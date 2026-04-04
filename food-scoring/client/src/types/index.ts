export interface NutritionData {
  energyKj: number;
  saturatedFatG: number;
  totalSugarG: number;
  sodiumMg: number;
  fibreAoacG: number;
  proteinG: number;
}

export interface IngredientInput {
  name: string;
  proportion: number;
}

export interface APointsBreakdown {
  energy: number;
  saturatedFat: number;
  sugar: number;
  sodium: number;
  total: number;
}

export interface CPointsBreakdown {
  fruitVegNuts: number;
  fibre: number;
  protein: number;
  proteinApplied: number;
  total: number;
}

export interface ScoreResult {
  aPoints: APointsBreakdown;
  cPoints: CPointsBreakdown;
  fvnPercentage: number;
  totalScore: number;
  isDrink: boolean;
  isHfss: boolean;
  classification: 'healthier' | 'less healthy';
}

export interface ClassifyResult {
  isFvn: boolean;
  category: string;
}
