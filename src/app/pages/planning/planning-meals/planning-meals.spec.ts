import translationTestProviders from '@src/test-providers';
import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PlanningMeals } from '@pages/planning/planning-meals/planning-meals';
import { PlanningStore } from '@pages/planning/state/plan/planning-store';
import { RecipeStore } from '@pages/recipes/state/recipe/recipe-store';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';
import { Ingredients } from '@pages/planning/ingredients/ingredients';

const setup = () => {
  const store = { saveGrocery: vi.fn(), loading: signal(false), error: signal('') };
  const page = runInInjectionContext(
    Injector.create({
      providers: [
        ...translationTestProviders,
        { provide: PlanningStore, useValue: store },
        { provide: RecipeStore, useValue: {} },
        { provide: NutritionService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: {}, fragment: of(null) } },
        { provide: DestroyRef, useValue: { onDestroy: () => () => {} } },
      ],
    }),
    () => new PlanningMeals(),
  );
  return { page, store };
};
describe('Meal planning updates', () => {
  it('preserves a shopping item and reports a failed save', async () => {
    const { page, store } = setup();
    page.groceryName.set('Tomatoes');
    store.saveGrocery.mockRejectedValue(new Error('Offline'));
    await page.addGrocery();
    expect(page.groceryName()).toBe('Tomatoes');
    expect(page.nutritionError()).toBe('Offline');
    expect(page.logging()).toBe(false);
  });
  it('prevents duplicate shopping saves while a request is pending', async () => {
    const { page, store } = setup();
    let finish!: () => void;
    store.saveGrocery.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    page.groceryName.set('  Tomatoes  ');
    const saving = page.addGrocery();
    await page.addGrocery();
    expect(store.saveGrocery).toHaveBeenCalledOnce();
    expect(store.saveGrocery).toHaveBeenCalledWith({
      name: 'Tomatoes',
      section: 'Produce',
      checked: false,
    });
    finish();
    await saving;
    expect(page.groceryName()).toBe('');
  });
  it('resets ingredient quantity and units for a new meal', () => {
    const { page } = setup();
    page.quantity = 9;
    page.unit = 'cup';
    page.reset();
    expect(page.quantity).toBe(100);
    expect(page.unit).toBe('g');
  });
  it('rejects invalid household portions before adding them', () => {
    const page = runInInjectionContext(
      Injector.create({
        providers: [...translationTestProviders, { provide: NutritionService, useValue: {} }],
      }),
      () => new Ingredients(),
    );
    page.portionName = 'cup';
    page.portionAmount = -1;
    page.addPortion();
    expect(page.food.portions).toBeUndefined();
    expect(page.error()).toBeTruthy();
    page.portionAmount = 250;
    page.portionBase = 'ml';
    page.addPortion();
    expect(page.food.portions).toEqual([{ unit: 'cup', amount: 250, baseUnit: 'ml' }]);
  });
});
