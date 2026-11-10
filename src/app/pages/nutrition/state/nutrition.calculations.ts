import {
  Food,
  FoodLog,
  IngredientNutrition,
  Macros,
  NutritionIngredient,
  RecipeNutritionSummary,
  scaleMacros,
  validMacros,
  zeroMacros,
} from './nutrition.model';
const nutrients = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fibre',
  'sugar',
  'saturatedFat',
  'sodium',
] as const;
export function positive(value: number): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a positive quantity.');
  return value;
}
export function normalizeNutrition(
  label: IngredientNutrition,
  baseAmount: number,
): IngredientNutrition {
  positive(baseAmount);
  if (
    !validMacros({
      calories: label.calories,
      protein: label.protein,
      carbs: label.carbs,
      fat: label.fat,
    })
  )
    throw new Error('Enter all four nutrition values.');
  const result: IngredientNutrition = zeroMacros();
  for (const key of nutrients)
    if (label[key] !== undefined) {
      if (!Number.isFinite(label[key]) || label[key]! < 0)
        throw new Error('Nutrition must be non-negative.');
      result[key] = label[key]! / baseAmount;
    }
  return result;
}
export function baseQuantity(food: Food, quantity: number, unit: string): number {
  positive(quantity);
  const base = food.baseUnit ?? 'g';
  const standard: Record<string, { base: 'g' | 'ml'; factor: number }> = {
    g: { base: 'g', factor: 1 },
    kg: { base: 'g', factor: 1000 },
    ml: { base: 'ml', factor: 1 },
    l: { base: 'ml', factor: 1000 },
  };
  const portion = food.portions?.find((p) => p.unit === unit);
  const conversion =
    standard[unit] ??
    (portion ? { base: portion.baseUnit, factor: positive(portion.amount) } : undefined);
  if (!conversion) throw new Error(`Define a weight or volume for ${unit} of ${food.name}.`);
  let amount = quantity * conversion.factor;
  if (conversion.base !== base) {
    if (!food.density)
      throw new Error(`Define grams per ml for ${food.name} before converting mass and volume.`);
    positive(food.density);
    amount = base === 'g' ? amount * food.density : amount / food.density;
  }
  return amount;
}
export function ingredientNutrition(
  food: Food,
  quantity: number,
  unit: string,
): IngredientNutrition {
  const normalized = normalizeNutrition(food, 100);
  const amount = baseQuantity(food, quantity, unit);
  const result: IngredientNutrition = zeroMacros();
  for (const key of nutrients)
    if (normalized[key] !== undefined) result[key] = normalized[key]! * amount;
  return result;
}
export function sumNutrition(values: IngredientNutrition[]): IngredientNutrition {
  const total: IngredientNutrition = zeroMacros();
  for (const value of values)
    for (const key of nutrients)
      if (value[key] !== undefined) total[key] = (total[key] ?? 0) + value[key]!;
  return total;
}
export function scaleNutrition(value: IngredientNutrition, factor: number): IngredientNutrition {
  positive(factor);
  const result = { ...value };
  for (const key of nutrients) if (value[key] !== undefined) result[key] = value[key]! * factor;
  return result;
}
export function calculateRecipe(
  items: NutritionIngredient[],
  servings: number,
  foods: Food[],
  unlinked: string[] = [],
): RecipeNutritionSummary {
  const issues: string[] = unlinked.filter(Boolean).map((name) => `Unlinked ingredient: ${name}`);
  const values: IngredientNutrition[] = [];
  if (!items.length) issues.push('No structured ingredients.');
  for (const item of items) {
    try {
      const food = foods.find((f) => f.id === item.foodId);
      if (food)
        values.push(ingredientNutrition(food, item.quantity ?? item.grams, item.unit ?? 'g'));
      else if (!item.linked && item.per100) {
        values.push(scaleMacros(item.per100, positive(item.grams) / 100));
        issues.push(`Link legacy ingredient: ${item.name}`);
      } else issues.push(`Ingredient unavailable: ${item.name}`);
    } catch (e) {
      issues.push(e instanceof Error ? e.message : 'Incomplete nutrition');
    }
  }
  const total = sumNutrition(values);
  let perServing = zeroMacros();
  try {
    perServing = scaleNutrition(total, 1 / positive(servings));
  } catch {
    issues.push('Set a positive serving count.');
  }
  return { total, perServing, issues, complete: issues.length === 0 };
}
export function nutritionStats(logs: FoodLog[], start = '', end = '9999-12-31') {
  const entries = logs.filter((l) => l.date >= start && l.date <= end);
  const dates = [...new Set(entries.map((l) => l.date))].sort();
  const daily = dates.map((date) => ({
    date,
    nutrition: sumNutrition(entries.filter((l) => l.date === date).map((l) => l.nutrition)),
    goal: entries.find((l) => l.date === date)?.goalSnapshot,
  }));
  const total = sumNutrition(entries.map((l) => l.nutrition));
  return {
    daily,
    total,
    average: dates.length ? scaleNutrition(total, 1 / dates.length) : zeroMacros(),
    daysMeetingGoal: daily.filter(
      (d) => d.goal && d.goal.calories > 0 && d.nutrition.calories <= d.goal.calories,
    ).length,
  };
}
export function snapshotLog(input: Omit<FoodLog, 'id'>, id: string): FoodLog {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !input.name.trim() ||
    !validMacros({
      calories: input.nutrition.calories,
      protein: input.nutrition.protein,
      carbs: input.nutrition.carbs,
      fat: input.nutrition.fat,
    })
  )
    throw new Error('Enter a date, food and valid nutrition.');
  if (input.quantity !== undefined) positive(input.quantity);
  return structuredClone({ ...input, id });
}
export function assertNotLogged(logs: FoodLog[], plannedMealId?: string): void {
  if (plannedMealId && logs.some((l) => l.plannedMealId === plannedMealId))
    throw new Error('This meal is already logged. Choose Log again to deliberately repeat it.');
}
export interface GroceryAmount {
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}
export function aggregateGroceries(
  items: { ingredients: NutritionIngredient[]; factor: number }[],
  foods: Food[],
): GroceryAmount[] {
  const groups = new Map<string, GroceryAmount>();
  for (const item of items)
    for (const ref of item.ingredients) {
      const food = foods.find((f) => f.id === ref.foodId);
      if (!food || food.archived) continue;
      let unit = ref.unit ?? 'g';
      let quantity = positive(ref.quantity ?? ref.grams) * positive(item.factor);
      try {
        quantity = baseQuantity(food, quantity, unit);
        unit = food.baseUnit ?? 'g';
      } catch {
        /* Preserve incompatible units as separate grocery lines. */
      }
      const key = `${food.id}:${unit}`;
      const previous = groups.get(key);
      groups.set(key, {
        foodId: food.id,
        name: food.name,
        category: food.category ?? 'Other',
        unit,
        quantity: quantity + (previous?.quantity ?? 0),
      });
    }
  return [...groups.values()];
}
