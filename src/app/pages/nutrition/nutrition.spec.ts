import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Nutrition } from '@pages/nutrition/nutrition';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';
import { RecipeStore } from '@pages/recipes/state/recipe/recipe-store';
import { PlanningStore } from '@pages/planning/state/plan/planning-store';
import { FoodLog } from '@pages/nutrition/state/nutrition/nutrition.model';

describe('Diary editor', () => {
  function create() {
    const store = {
      loading: signal(false),
      error: signal(''),
      saveLog: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: NutritionService, useValue: store },
        { provide: RecipeStore, useValue: {} },
        { provide: PlanningStore, useValue: {} },
      ],
    });
    return { page: TestBed.runInInjectionContext(() => new Nutrition()), store };
  }
  const entry: FoodLog = {
    id: 'logged',
    date: '2026-11-16',
    meal: 'Dinner',
    name: 'Rice',
    amount: '2 servings',
    sourceType: 'recipe',
    sourceId: 'old-recipe',
    quantity: 2,
    unit: 'servings',
    nutrition: { calories: 400, protein: 8, carbs: 80, fat: 4 },
  };
  it('edits saved nutrition without resolving or recalculating the original recipe', async () => {
    const { page, store } = create();
    page.startEdit(entry);
    expect(page.loggerOpen()).toBe(true);
    page.changeEditQuantity(4);
    expect(page.manual.calories).toBe(800);
    page.manual.calories = 750;
    page.saveEdit(page.editingEntry()!);
    await vi.waitFor(() => expect(page.busy()).toBe(false));
    expect(store.saveLog).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 4,
        nutrition: expect.objectContaining({ calories: 750 }),
        sourceId: 'old-recipe',
      }),
      'logged',
    );
    expect(entry.nutrition.calories).toBe(400);
    expect(page.loggerOpen()).toBe(false);
  });
  it('recovers from a cleared amount and starts a new entry with a clean draft', () => {
    const { page } = create();
    page.startEdit(entry);
    page.changeEditQuantity(0);
    page.changeEditQuantity(1);
    expect(page.manual.calories).toBe(200);
    page.openLogger('Breakfast');
    expect(page.editingEntry()).toBeNull();
    expect(page.manualName).toBe('');
    expect(page.manual.calories).toBe(0);
    expect(page.meal).toBe('Breakfast');
  });
});
