import { describe, expect, it } from 'vitest';
import {
  calculateTargets,
  normalizeProfile,
  recipeNutrition,
  scaleMacros,
  validMacros,
} from './nutrition.model';
describe('Nutrition calculations', () => {
  const per100 = { calories: 200, protein: 20, carbs: 3, fat: 9 };
  it('scales food values for fractional gram quantities', () => {
    expect(scaleMacros(per100, 25 / 100)).toEqual({
      calories: 50,
      protein: 5,
      carbs: 0.75,
      fat: 2.25,
    });
  });
  it('sums ingredients, divides by recipe servings and scales portions eaten', () => {
    const total = recipeNutrition(
      [
        { foodId: 'steak', name: 'Steak', grams: 250, per100 },
        {
          foodId: 'side',
          name: 'Side',
          grams: 100,
          per100: { calories: 100, protein: 4, carbs: 20, fat: 1 },
        },
      ],
      4,
    );
    expect(total).toEqual({ calories: 150, protein: 13.5, carbs: 6.875, fat: 5.875 });
    expect(scaleMacros(total, 1.5).calories).toBe(225);
  });
  it('supports recipes with no tracked ingredients', () => {
    expect(recipeNutrition()).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
  it('rejects invalid nutrition values', () => {
    expect(validMacros(per100)).toBe(true);
    expect(validMacros({ ...per100, calories: NaN })).toBe(false);
    expect(validMacros({ ...per100, fat: -1 })).toBe(false);
    expect(validMacros({ ...per100, protein: Infinity })).toBe(false);
  });
});

describe('Automatic nutrition targets', () => {
  const profile = () => ({
    name: 'Test',
    age: 27,
    height: 179,
    weight: 95,
    goal: '',
    sex: 'female' as const,
    activity: 'sedentary' as const,
    goalWeight: 80,
    targets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    targetOverrides: { calories: null, protein: null, carbs: null, fat: null },
  });
  it('calculates blank targets from adult details and goal direction', () => {
    const targets = calculateTargets(profile());
    expect(targets).toEqual({ calories: 1915, protein: 119.7, carbs: 215.4, fat: 63.8 });
    expect(
      Math.abs(targets.protein * 4 + targets.carbs * 4 + targets.fat * 9 - targets.calories),
    ).toBeLessThan(1);
    expect(calculateTargets({ ...profile(), goalWeight: null }).calories).toBe(2127);
    expect(calculateTargets({ ...profile(), goalWeight: 100 }).calories).toBe(2340);
  });
  it('honors manual calories and allocates remaining energy to blank macros', () => {
    const input = {
      ...profile(),
      targetOverrides: { calories: 2000, protein: 150, carbs: null, fat: null },
    };
    const targets = calculateTargets(input);
    expect(targets).toEqual({ calories: 2000, protein: 150, carbs: 210, fat: 62.2 });
    expect(
      calculateTargets({ ...input, targetOverrides: { ...input.targetOverrides, protein: null } })
        .protein,
    ).toBe(125);
  });
  it('requires details for automatic calories, but supports fully manual targets', () => {
    expect(() => calculateTargets({ ...profile(), sex: '' })).toThrow('sex');
    expect(() => calculateTargets({ ...profile(), age: 12 })).toThrow('18+');
    const targets = { calories: 2000, protein: 150, carbs: 200, fat: 60 };
    expect(calculateTargets({ ...profile(), sex: '', targetOverrides: targets })).toEqual(targets);
  });
  it('rejects invalid overrides and impossible remaining calorie budgets', () => {
    expect(() => calculateTargets({ ...profile(), targetOverrides: { calories: -1 } })).toThrow(
      'non-negative',
    );
    expect(() =>
      calculateTargets({ ...profile(), targetOverrides: { calories: 2000, protein: 600 } }),
    ).toThrow('exceed');
  });
  it('migrates old numeric goals and keeps an explicitly cleared goal empty', () => {
    const { goalWeight, ...old } = profile();
    expect(normalizeProfile({ ...old, goal: '80' }).goalWeight).toBe(80);
    expect(normalizeProfile({ ...old, goal: '80', goalWeight: null }).goalWeight).toBeNull();
  });
  it('recalculates automatic values on reload while preserving manual overrides', () => {
    const initial = normalizeProfile(profile());
    expect(normalizeProfile({ ...initial, weight: 90 }).targets.calories).not.toBe(
      initial.targets.calories,
    );
    expect(
      normalizeProfile({ ...initial, weight: 90, targetOverrides: { calories: 2000 } }).targets
        .calories,
    ).toBe(2000);
  });
});
