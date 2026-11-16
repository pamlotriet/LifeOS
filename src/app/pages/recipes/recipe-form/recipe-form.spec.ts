import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RecipeForm } from '@pages/recipes/recipe-form/recipe-form';
import { RecipeStore } from '@pages/recipes/state/recipe/recipe-store';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';

describe('Recipe editor workflow', () => {
  function create() {
    const food = {
      id: 'rice',
      name: 'Rice',
      baseUnit: 'g',
      calories: 100,
      protein: 2,
      carbs: 20,
      fat: 1,
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: RecipeStore, useValue: { save: vi.fn() } },
        { provide: NutritionService, useValue: { foods: signal([food]) } },
      ],
    });
    return TestBed.runInInjectionContext(() => new RecipeForm());
  }
  it('replaces a text note only after successfully linking a measured ingredient', () => {
    const editor = create();
    editor.ingredients.set(['200 g rice', 'Salt']);
    editor.linkIngredient(0);
    editor.foodId = 'rice';
    editor.foodGrams = -1;
    editor.addFood();
    expect(editor.ingredients()).toEqual(['200 g rice', 'Salt']);
    editor.foodGrams = 200;
    editor.addFood();
    expect(editor.ingredients()).toEqual(['Salt']);
    expect(editor.nutritionIngredients()[0]).toMatchObject({ foodId: 'rice', quantity: 200 });
    expect(editor.linkingIndex()).toBeNull();
    expect(editor.summary().complete).toBe(false);
  });
  it('scales whole-recipe quantities and servings together, keeping per-serving calories constant', () => {
    const editor = create();
    editor.foodId = 'rice';
    editor.foodGrams = 200;
    editor.addFood();
    editor.model.servings = 2;
    expect(editor.summary().perServing.calories).toBe(100);
    editor.scaleFactor = 2;
    editor.scaleRecipe();
    expect(editor.model.servings).toBe(4);
    expect(editor.summary().total.calories).toBe(400);
    expect(editor.summary().perServing.calories).toBe(100);
    editor.model.servings = 8;
    expect(editor.summary().perServing.calories).toBe(50);
    editor.ingredients.set(['Salt']);
    editor.scaleRecipe();
    expect(editor.model.servings).toBe(8);
    expect(editor.error()).toContain('Link ingredient notes');
  });
});
