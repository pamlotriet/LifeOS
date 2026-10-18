import { describe, expect, it } from 'vitest';
import {
  aggregateGroceries,
  assertNotLogged,
  baseQuantity,
  calculateRecipe,
  ingredientNutrition,
  normalizeNutrition,
  nutritionStats,
  scaleNutrition,
  snapshotLog,
  sumNutrition,
} from './nutrition.calculations';
import { Food, IngredientNutrition, NutritionIngredient } from './nutrition.model';
const steak: Food = {
  id: 'steak',
  name: 'Lean steak raw',
  calories: 150,
  protein: 22,
  carbs: 0,
  fat: 6,
  baseUnit: 'g',
  portions: [{ unit: 'piece', amount: 80, baseUnit: 'g' }],
};
const ref = (grams = 200): NutritionIngredient => ({
  foodId: steak.id,
  name: steak.name,
  grams,
  quantity: grams,
  unit: 'g',
  linked: true,
  per100: steak,
});
describe('Nutrition calculations and connected workflow', () => {
  it('normalizes per-100g labels without replacing explicit calories with macro energy', () => {
    expect(normalizeNutrition(steak, 100)).toMatchObject({ calories: 1.5, protein: 0.22 });
    expect(ingredientNutrition(steak, 1, 'g').calories).toBe(1.5);
    expect(ingredientNutrition(steak, 180, 'g').calories).toBe(270);
    expect(ingredientNutrition(steak, 0.2, 'kg').calories).toBe(300);
  });
  it('supports volume bases, density and defined household portions only', () => {
    const oil: Food = {
      ...steak,
      baseUnit: 'ml',
      density: 0.8,
      portions: [{ unit: 'tablespoon', amount: 15, baseUnit: 'ml' }],
    };
    expect(baseQuantity(oil, 0.1, 'l')).toBe(100);
    expect(baseQuantity(oil, 80, 'g')).toBe(100);
    expect(baseQuantity(oil, 2, 'tablespoon')).toBe(30);
    expect(baseQuantity(steak, 2, 'piece')).toBe(160);
    expect(() => baseQuantity(steak, 100, 'ml')).toThrow('grams per ml');
    expect(() => baseQuantity(steak, 1, 'cup')).toThrow('Define a weight');
  });
  it('validates invalid and missing quantities and nutrition', () => {
    for (const q of [0, -1, NaN, Infinity])
      expect(() => ingredientNutrition(steak, q, 'g')).toThrow();
    expect(() => normalizeNutrition({ ...steak, calories: NaN }, 100)).toThrow();
  });
  it('aggregates total, fractional servings and explicit recipe scaling', () => {
    const recipe = calculateRecipe([ref(), ref(100)], 4, [steak]);
    expect(recipe.complete).toBe(true);
    expect(recipe.total.calories).toBe(450);
    expect(recipe.perServing.calories).toBe(112.5);
    expect(scaleNutrition(recipe.perServing, 1.5).calories).toBe(168.75);
    expect(calculateRecipe([ref(600)], 8, [steak]).perServing.calories).toBe(112.5);
    expect(calculateRecipe([ref()], 0.5, [steak]).perServing.calories).toBe(600);
  });
  it('reports missing conversion, missing references and legacy text as incomplete', () => {
    expect(calculateRecipe([{ ...ref(), unit: 'cup' }], 1, [steak]).complete).toBe(false);
    expect(calculateRecipe([ref()], 1, []).complete).toBe(false);
    expect(calculateRecipe([ref()], 1, [steak], ['salt']).issues).toContain(
      'Unlinked ingredient: salt',
    );
    expect(calculateRecipe([ref()], 0, [steak]).complete).toBe(false);
  });
  it('creates ingredient ? recipe ? plan ? consumed snapshot ? daily totals ? stats', () => {
    const ingredients = [structuredClone(steak)];
    const recipe = { id: 'recipe', ingredients: [ref()], servings: 2 };
    const plan = { id: 'meal', recipeId: recipe.id, date: '2026-10-18', servings: 1.5 };
    const logs: IngredientNutrition[] = [];
    expect(sumNutrition(logs).calories).toBe(0); // planning never writes consumption
    const result = calculateRecipe(recipe.ingredients, recipe.servings, ingredients);
    const snapshot = snapshotLog(
      {
        date: plan.date,
        name: 'Steak bowl',
        sourceId: recipe.id,
        plannedMealId: plan.id,
        amount: '1.5 servings',
        quantity: 1.5,
        nutrition: scaleNutrition(result.perServing, plan.servings),
        goalSnapshot: { calories: 1800, protein: 100, carbs: 200, fat: 60 },
      },
      'log',
    );
    logs.push(snapshot.nutrition);
    expect(sumNutrition(logs).calories).toBe(225);
    ingredients[0].calories = 200;
    expect(
      calculateRecipe(recipe.ingredients, recipe.servings, ingredients).perServing.calories,
    ).toBe(200);
    expect(snapshot.nutrition.calories).toBe(225);
    result.perServing.calories = 999;
    expect(snapshot.nutrition.calories).toBe(225);
    const stats = nutritionStats([snapshot], '2026-10-01', '2026-10-31');
    expect(stats.average.calories).toBe(225);
    expect(stats.daysMeetingGoal).toBe(1);
    expect(stats.daily).toHaveLength(1);
    expect(() => assertNotLogged([snapshot], plan.id)).toThrow('already logged');
    expect(() => assertNotLogged([snapshot], 'other-meal')).not.toThrow();
  });
  it('sums days and averages only logged days within the selected range', () => {
    const log = snapshotLog(
      {
        date: '2026-10-01',
        name: 'food',
        amount: '1 portion',
        nutrition: { calories: 100, protein: 10, carbs: 0, fat: 1 },
      },
      'a',
    );
    const stats = nutritionStats([
      log,
      { ...log, id: 'b', date: '2026-10-03', nutrition: { ...log.nutrition, calories: 300 } },
    ]);
    expect(stats.total.calories).toBe(400);
    expect(stats.average.calories).toBe(200);
    expect(nutritionStats([log], '2026-10-02').daily).toEqual([]);
  });
  it('combines compatible groceries scaled by planned servings and skips archived ingredients', () => {
    const items = [
      { ingredients: [ref(200)], factor: 0.5 },
      { ingredients: [{ ...ref(), quantity: 0.1, unit: 'kg' }], factor: 2 },
    ];
    expect(aggregateGroceries(items, [steak])[0]).toMatchObject({ quantity: 300, unit: 'g' });
    expect(aggregateGroceries(items, [{ ...steak, archived: true }])).toEqual([]);
    expect(
      aggregateGroceries([{ ingredients: [ref(), { ...ref(), unit: 'ml' }], factor: 1 }], [steak]),
    ).toHaveLength(2);
  });
});
