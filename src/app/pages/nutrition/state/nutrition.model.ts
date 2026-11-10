export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface Food extends Macros {
  category?: string;
  brand?: string;
  description?: string;
  preparation?: string;
  barcode?: string;
  baseUnit?: 'g' | 'ml';
  defaultUnit?: string;
  density?: number;
  portions?: IngredientServingConversion[];
  fibre?: number;
  sugar?: number;
  saturatedFat?: number;
  sodium?: number;
  archived?: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  id: string;
  name: string;
}
export interface NutritionIngredient {
  foodId: string;
  quantity?: number;
  unit?: string;
  linked?: boolean;
  name: string;
  grams: number;
  per100: Macros;
}
export interface FoodLog {
  meal?: MealCategory;
  sourceId?: string;
  sourceType?: 'recipe' | 'ingredient' | 'manual';
  quantity?: number;
  unit?: string;
  plannedMealId?: string;
  createdAt?: string;
  goalSnapshot?: Macros;
  id: string;
  date: string;
  name: string;
  amount: string;
  nutrition: Macros;
}
export interface NutritionProfile {
  name: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  targets: Macros;
  sex?: '' | 'female' | 'male';
  activity?: 'sedentary' | 'light' | 'moderate' | 'active';
  goalWeight?: number | null;
  calorieDeficit?: number | null;
  targetOverrides?: Partial<Record<keyof Macros, number | null>>;
}
export const zeroMacros = (): Macros => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
export function validMacros(value: Macros): boolean {
  return (
    Object.values(value).length === 4 &&
    ['calories', 'protein', 'carbs', 'fat'].every(
      (key) => Number.isFinite(value[key as keyof Macros]) && value[key as keyof Macros] >= 0,
    )
  );
}
export function scaleMacros(value: Macros, factor: number): Macros {
  return {
    calories: value.calories * factor,
    protein: value.protein * factor,
    carbs: value.carbs * factor,
    fat: value.fat * factor,
  };
}
export function recipeNutrition(items: NutritionIngredient[] = [], servings = 1): Macros {
  const total = zeroMacros();
  for (const item of items) {
    const scaled = scaleMacros(item.per100, item.grams / 100);
    for (const key of Object.keys(total) as (keyof Macros)[]) total[key] += scaled[key];
  }
  return scaleMacros(total, 1 / Math.max(1, servings));
}
export function nutritionLabel(value: Macros): string {
  return `${Math.round(value.calories)} kcal | P ${value.protein.toFixed(1)} g | C ${value.carbs.toFixed(1)} g | F ${value.fat.toFixed(1)} g`;
}
export function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
} as const;
export function profileOverrides(
  profile: NutritionProfile,
): Partial<Record<keyof Macros, number | null>> {
  if (profile.targetOverrides) return { ...profile.targetOverrides };
  return Object.fromEntries(
    Object.entries(profile.targets).map(([key, value]) => [key, value > 0 ? value : null]),
  );
}
/** Adult estimates: Mifflin-St Jeor, activity multiplier, +/-10% for goal direction.
 * Source for resting energy equation: https://pubmed.ncbi.nlm.nih.gov/2305711/
 * The activity factors, goal adjustment and 25/45/30 split are app defaults.
 */
export function calculateTargets(profile: NutritionProfile): Macros {
  const overrides = profileOverrides(profile);
  const manual = (key: keyof Macros) => overrides[key] !== null && overrides[key] !== undefined;
  for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
    if (manual(key) && (!Number.isFinite(overrides[key]) || overrides[key]! < 0))
      throw new Error('Targets must be non-negative numbers or blank for automatic calculation.');
  }
  const deficit = profile.calorieDeficit;
  if (deficit != null && (!Number.isFinite(deficit) || deficit < 0))
    throw new Error('Enter a non-negative calorie deficit or leave it blank.');
  let calories = overrides.calories ?? 0;
  if (!manual('calories')) {
    if (
      !['female', 'male'].includes(profile.sex ?? '') ||
      !Number.isFinite(profile.age) ||
      profile.age < 18 ||
      !Number.isFinite(profile.height) ||
      profile.height <= 0 ||
      !Number.isFinite(profile.weight) ||
      profile.weight <= 0
    ) {
      throw new Error(
        'For automatic calories, enter age (18+), height, weight and sex used for the calculation.',
      );
    }
    const activity = ACTIVITY_FACTORS[profile.activity ?? 'sedentary'];
    if (!activity) throw new Error('Choose an activity level.');
    const resting =
      10 * profile.weight +
      6.25 * profile.height -
      5 * profile.age +
      (profile.sex === 'male' ? 5 : -161);
    const goal = profile.goalWeight;
    const adjustment =
      goal && goal < profile.weight ? 0.9 : goal && goal > profile.weight ? 1.1 : 1;
    const maintenance = resting * activity;
    if (deficit != null && deficit >= maintenance)
      throw new Error('The deficit must be smaller than your estimated maintenance calories.');
    calories = Math.round(deficit != null ? maintenance - deficit : maintenance * adjustment);
    if (calories <= 0) throw new Error('Check your profile details before calculating targets.');
  }
  const targets: Macros = { calories, protein: 0, carbs: 0, fat: 0 };
  const shares = { protein: 0.25, carbs: 0.45, fat: 0.3 };
  const energy = { protein: 4, carbs: 4, fat: 9 };
  let remaining = calories;
  let autoShare = 0;
  for (const key of ['protein', 'carbs', 'fat'] as const) {
    if (manual(key)) {
      targets[key] = overrides[key]!;
      remaining -= targets[key] * energy[key];
    } else autoShare += shares[key];
  }
  if (autoShare > 0 && remaining < 0)
    throw new Error(
      'Your manual macros exceed the calorie target. Increase calories or reduce the manual macros.',
    );
  for (const key of ['protein', 'carbs', 'fat'] as const) {
    if (!manual(key))
      targets[key] = Math.round(((remaining * shares[key]) / autoShare / energy[key]) * 10) / 10;
  }
  return targets;
}
export function normalizeProfile(profile: NutritionProfile): NutritionProfile {
  const goalWeight =
    profile.goalWeight === undefined
      ? /^\d+(\.\d+)?$/.test(profile.goal.trim())
        ? Number(profile.goal)
        : null
      : profile.goalWeight;
  const result = {
    ...profile,
    sex: profile.sex ?? ('' as const),
    activity: profile.activity ?? ('sedentary' as const),
    goalWeight,
    calorieDeficit: profile.calorieDeficit ?? null,
    targetOverrides: profileOverrides(profile),
  };
  try {
    result.targets = calculateTargets(result);
  } catch {
    /* Incomplete profiles can still be edited. */
  }
  return result;
}
export const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];
export interface IngredientServingConversion {
  unit: string;
  amount: number;
  baseUnit: 'g' | 'ml';
}
export type Ingredient = Food;
export interface IngredientNutrition extends Macros {
  fibre?: number;
  sugar?: number;
  saturatedFat?: number;
  sodium?: number;
}
export type RecipeIngredient = NutritionIngredient;
export interface RecipeNutritionSummary {
  total: IngredientNutrition;
  perServing: IngredientNutrition;
  complete: boolean;
  issues: string[];
}
export interface NutritionGoal {
  date: string;
  targets: Macros;
}
export type NutritionLogEntry = FoodLog;
export interface DailyNutritionSummary {
  date: string;
  consumed: IngredientNutrition;
  planned: IngredientNutrition;
}
