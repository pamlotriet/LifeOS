import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import { RecipeService } from '../recipes/recipe.service';
import { PlanningService } from '../planning/planning.service';
import { StatsService } from '../statistics/stats.service';
import { NutritionService } from './nutrition.service';
import { calculateRecipe, scaleNutrition, sumNutrition } from './nutrition.calculations';
import { RecipeInput } from '../recipes/recipe.model';
describe('Nutrition service workflow', () => {
  it('persists an ingredient, recipe, plan and personal snapshot consumed by Stats', async () => {
    const updateDocument = vi.fn().mockResolvedValue(undefined);
    const createDocument = vi.fn().mockResolvedValue({});
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            userId: signal('member'),
            getSession: async () => ({ uid: 'member', token: 'token' }),
          },
        },
        {
          provide: FirestoreService,
          useValue: {
            updateDocument,
            createDocument,
            listDocuments: vi.fn().mockResolvedValue([]),
            tryGetDocument: vi.fn().mockResolvedValue(null),
          },
        },
        { provide: StoragePhotoService, useValue: {} },
        { provide: RefreshCoordinator, useValue: { register: vi.fn() } },
      ],
    });
    const nutrition = TestBed.inject(NutritionService);
    await nutrition.saveFood({
      id: 'rice',
      name: 'Cooked rice',
      calories: 130,
      protein: 3,
      carbs: 28,
      fat: 0.3,
      baseUnit: 'g',
    });
    const input: RecipeInput = {
      title: 'Rice bowl',
      description: '',
      category: 'Dinner',
      cookTime: 10,
      servings: 2,
      difficulty: 'Easy',
      photoUrl: '',
      photoPath: '',
      ingredients: [],
      nutritionIngredients: [
        {
          foodId: 'rice',
          name: 'Cooked rice',
          grams: 400,
          quantity: 400,
          unit: 'g',
          linked: true,
          per100: nutrition.foods()[0],
        },
      ],
      steps: [{ id: 'step', title: '', instruction: 'Cook rice.' }],
      tags: [],
      source: '',
      sourceLink: '',
      notes: '',
      favourite: false,
      private: true,
    };
    const recipe = await TestBed.inject(RecipeService).save(input);
    const summary = calculateRecipe(
      recipe.nutritionIngredients!,
      recipe.servings,
      nutrition.foods(),
    );
    expect(summary.total.calories).toBe(520);
    const meal = await TestBed.inject(PlanningService).saveMeal({
      date: '2026-10-18',
      meal: 'Dinner',
      title: recipe.title,
      detail: '',
      recipeId: recipe.id,
      servings: 1.5,
    });
    expect(nutrition.logs()).toEqual([]);
    await nutrition.saveLog({
      date: meal.date,
      meal: meal.meal,
      name: meal.title,
      sourceId: recipe.id,
      sourceType: 'recipe',
      plannedMealId: meal.id,
      quantity: 1.5,
      unit: 'servings',
      amount: '1.5 servings',
      nutrition: scaleNutrition(summary.perServing, 1.5),
    });
    expect(sumNutrition(nutrition.logs().map((l) => l.nutrition)).calories).toBe(390);
    const dashboard = TestBed.inject(StatsService).dashboard('nutrition', 'All');
    expect(dashboard.kpis.find((k) => k.label === 'Total consumed')?.value).toBe('390 kcal');
    await nutrition.saveFood({ ...nutrition.foods()[0], calories: 200 });
    expect(
      calculateRecipe(recipe.nutritionIngredients!, recipe.servings, nutrition.foods()).perServing
        .calories,
    ).toBe(400);
    expect(nutrition.logs()[0].nutrition.calories).toBe(390);
    expect(createDocument.mock.calls.some((call) => call[0] === 'users/member/mealPlan')).toBe(
      true,
    );
    expect(createDocument.mock.calls.some((call) => call[0] === 'users/member/nutrition')).toBe(
      true,
    );
  });
});
