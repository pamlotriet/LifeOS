import { FormsModule } from '@angular/forms';
import { NutritionService } from '../../shared/state/nutrition/nutrition.service';
import {
  calculateRecipe,
  scaleNutrition,
} from '../../shared/state/nutrition/nutrition.calculations';
import { NutritionSummary } from '../../shared/components/nutrition-summary';
import { PlanningStore } from '../../shared/state/planning/planning-store';
import {
  localDate,
  MEAL_CATEGORIES,
  MealCategory,
} from '../../shared/state/nutrition/nutrition.model';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { RecipeRecord, recipeCategories } from '../../shared/state/recipes/recipe.model';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';

@Component({
  selector: 'app-recipe-detail',
  imports: [FormsModule, NutritionSummary, IonContent, IonIcon, RouterLink, PageHeader],
  templateUrl: './recipe-detail.html',
})
export class RecipeDetail {
  readonly recipeCategories = recipeCategories;
  readonly nutrition = inject(NutritionService);
  readonly planning = inject(PlanningStore);
  readonly categories = MEAL_CATEGORIES;
  meal: MealCategory = 'Dinner';
  date = localDate();
  amount = 1;
  status = '';
  busy = false;
  summary() {
    const r = this.recipe()!;
    return calculateRecipe(
      r.nutritionIngredients ?? [],
      r.servings,
      this.nutrition.foods(),
      r.ingredients,
    );
  }
  async consume(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const r = this.recipe()!;
      const summary = this.summary();
      if (!summary.complete) throw new Error('Link all ingredients before logging this recipe.');
      await this.nutrition.saveLog({
        date: this.date,
        meal: this.meal,
        sourceType: 'recipe',
        sourceId: r.id,
        name: r.title,
        quantity: this.amount,
        unit: 'servings',
        amount: `${this.amount} servings`,
        nutrition: scaleNutrition(summary.perServing, this.amount),
      });
      this.status = 'Saved to your personal diary.';
    } catch (e) {
      this.status = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }
  async plan(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const r = this.recipe()!;
      await this.planning.saveMeal({
        date: this.date,
        meal: this.meal,
        recipeId: r.id,
        servings: this.amount,
        title: r.title,
        detail: '',
      });
      this.status = 'Added to meal planner.';
    } catch (e) {
      this.status = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(RecipeStore);
  readonly recipe = signal<RecipeRecord | null>(null);
  readonly loading = signal(true);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly checked = signal<Set<number>>(new Set());
  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    try {
      this.recipe.set(await this.store.get(this.route.snapshot.paramMap.get('id')!));
    } catch {
      this.error.set('Recipe not found.');
    } finally {
      this.loading.set(false);
    }
  }
  toggleIngredient(index: number): void {
    this.checked.update((current) => {
      const next = new Set(current);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }
  async toggleFavourite(): Promise<void> {
    const recipe = this.recipe();
    if (!recipe) return;
    const { id, createdAt, ...input } = recipe;
    const saved = await this.store.save({ ...input, favourite: !recipe.favourite }, id);
    this.recipe.set(saved);
  }
  async delete(): Promise<void> {
    const recipe = this.recipe();
    if (!recipe || this.deleting()) return;
    this.deleting.set(true);
    try {
      await this.store.delete(recipe);
      await this.router.navigateByUrl('/recipes', { replaceUrl: true });
    } finally {
      this.deleting.set(false);
    }
  }
}
