import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';
import { RecipeRecord } from '../../shared/state/recipes/recipe.model';
import { Recipes } from './recipes';

describe('Recipe category filters', () => {
  it('finds a recipe under each selected category and searches secondary categories', () => {
    const defaults = {
      cookTime: 20,
      servings: 2,
      difficulty: 'Easy' as const,
      photoUrl: '',
      photoPath: '',
      ingredients: [],
      steps: [],
      source: '',
      sourceLink: '',
      notes: '',
      favourite: false,
      private: true,
      createdAt: '',
    };
    const recipes = signal<RecipeRecord[]>([
      {
        ...defaults,
        id: 'multi',
        title: 'Pasta',
        description: '',
        category: 'Lunch',
        categories: ['Lunch', 'Dinner'],
        tags: [],
      },
      {
        ...defaults,
        id: 'legacy',
        title: 'Toast',
        description: '',
        category: 'Breakfast',
        tags: [],
      },
    ]);
    const page = runInInjectionContext(
      Injector.create({ providers: [{ provide: RecipeStore, useValue: { sorted: recipes } }] }),
      () => new Recipes(),
    );
    for (const category of ['Lunch', 'Dinner']) {
      page.category.set(category);
      expect(page.filtered().map((recipe) => recipe.id)).toEqual(['multi']);
    }
    page.category.set('Breakfast');
    expect(page.filtered().map((recipe) => recipe.id)).toEqual(['legacy']);
    page.category.set('All');
    page.search.set('dinner');
    expect(page.filtered().map((recipe) => recipe.id)).toEqual(['multi']);
  });
});
