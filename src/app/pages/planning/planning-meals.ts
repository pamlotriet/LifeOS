import {
  aggregateGroceries,
  calculateRecipe,
  ingredientNutrition,
  scaleNutrition,
  sumNutrition,
} from '../../shared/state/nutrition/nutrition.calculations';
import {
  MEAL_CATEGORIES,
  MealCategory,
  localDate,
  zeroMacros,
} from '../../shared/state/nutrition/nutrition.model';
import { RouterLink } from '@angular/router';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';
import { NutritionService } from '../../shared/state/nutrition/nutrition.service';
import { nutritionLabel } from '../../shared/state/nutrition/nutrition.model';
import { MealPlanItem } from '../../shared/state/planning/planning.model';
import { PLANNING_ICONS } from './planning-icons';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { GroceryItem } from '../../shared/state/planning/planning.model';
import { PlanningStore } from '../../shared/state/planning/planning-store';

@Component({
  selector: 'app-planning-meals',
  imports: [RouterLink, IonContent, IonIcon, FormsModule, PageHeader],
  templateUrl: './planning-meals.html',
  styleUrl: './planning.css',
})
export class PlanningMeals {
  readonly recipes = inject(RecipeStore);
  readonly nutrition = inject(NutritionService);
  recipeId = '';
  ingredientId = '';
  servings = 1;
  quantity = 100;
  unit = 'g';
  mealCategory: MealCategory = 'Dinner';
  editingId = '';
  copyDate = localDate();
  readonly categories = MEAL_CATEGORIES;
  readonly nutritionError = signal('');
  readonly logging = signal(false);
  pendingMeal: MealPlanItem | null = null;
  actualAmount = 1;
  repeat = false;
  selectRecipe(): void {
    const recipe = this.recipes.recipes().find((x) => x.id === this.recipeId);
    if (recipe) {
      this.mealTitle.set(recipe.title);
      this.ingredientId = '';
    }
  }
  selectIngredient(): void {
    const food = this.nutrition.foods().find((x) => x.id === this.ingredientId);
    if (food) {
      this.mealTitle.set(food.name);
      this.recipeId = '';
      this.unit = food.baseUnit ?? 'g';
    }
  }
  mealNutrition(item: MealPlanItem) {
    if (item.ingredientId) {
      const food = this.nutrition.foods().find((f) => f.id === item.ingredientId);
      if (!food) throw new Error('Ingredient unavailable.');
      return ingredientNutrition(food, item.quantity ?? 100, item.unit ?? 'g');
    }
    const recipe = this.recipes.recipes().find((x) => x.id === item.recipeId);
    if (!recipe) throw new Error('No linked nutrition.');
    const summary = calculateRecipe(
      recipe.nutritionIngredients ?? [],
      recipe.servings,
      this.nutrition.foods(),
      recipe.ingredients,
    );
    if (!summary.complete) throw new Error('Recipe nutrition incomplete. Link all ingredients.');
    return scaleNutrition(summary.perServing, item.servings ?? 1);
  }
  summary(item: MealPlanItem): string {
    try {
      return nutritionLabel(this.mealNutrition(item));
    } catch (e) {
      return (e as Error).message;
    }
  }
  daily(date: string): string {
    const values = [];
    let incomplete = false;
    for (const m of this.meals(date)) {
      try {
        values.push(this.mealNutrition(m));
      } catch {
        incomplete = true;
      }
    }
    const total = sumNutrition(values);
    const goal = this.nutrition.profile().targets.calories;
    return `${nutritionLabel(total)}${incomplete ? ' | Incomplete' : ''}${goal > 0 ? ` | ${(goal - total.calories).toFixed(0)} kcal remaining to current goal` : ''}`;
  }
  logged(item: MealPlanItem) {
    return this.nutrition.logs().some((l) => l.plannedMealId === item.id);
  }
  confirmMeal(item: MealPlanItem, repeat = false): void {
    this.pendingMeal = item;
    this.actualAmount = item.ingredientId ? (item.quantity ?? 100) : (item.servings ?? 1);
    this.repeat = repeat;
  }
  preview(): string {
    if (!this.pendingMeal) return '';
    return this.summary({
      ...this.pendingMeal,
      servings: this.actualAmount,
      quantity: this.actualAmount,
    });
  }
  async logMeal(): Promise<void> {
    const item = this.pendingMeal;
    if (!item || this.logging()) return;
    this.logging.set(true);
    this.nutritionError.set('');
    try {
      const actual = { ...item, servings: this.actualAmount, quantity: this.actualAmount };
      await this.nutrition.saveLog(
        {
          date: item.date,
          meal: item.meal ?? 'Dinner',
          name: item.title,
          amount: `${this.actualAmount} ${item.ingredientId ? (item.unit ?? 'g') : 'servings'}`,
          quantity: this.actualAmount,
          unit: item.ingredientId ? (item.unit ?? 'g') : 'servings',
          sourceType: item.ingredientId ? 'ingredient' : 'recipe',
          sourceId: item.ingredientId || item.recipeId,
          plannedMealId: item.id,
          nutrition: this.mealNutrition(actual),
        },
        undefined,
        this.repeat,
      );
      this.pendingMeal = null;
      this.nutritionError.set('Meal logged in your personal diary.');
    } catch (e) {
      this.nutritionError.set((e as Error).message);
    } finally {
      this.logging.set(false);
    }
  }
  async copyDay(): Promise<void> {
    try {
      if (this.copyDate === this.selectedDate())
        throw new Error('Choose a different destination date.');
      for (const item of this.meals(this.selectedDate())) {
        const { id, ...input } = item;
        await this.store.saveMeal({ ...input, date: this.copyDate });
      }
      this.nutritionError.set('Meals copied.');
    } catch (e) {
      this.nutritionError.set((e as Error).message);
    }
  }
  async generateGroceries(): Promise<void> {
    if (this.logging()) return;
    this.logging.set(true);
    try {
      const dates = new Set(this.week.map((d) => d.iso));
      const plans = this.store.meals().filter((m) => dates.has(m.date));
      const sources = plans.map((m) => {
        const r = this.recipes.recipes().find((r) => r.id === m.recipeId);
        return m.ingredientId
          ? {
              ingredients: [
                {
                  foodId: m.ingredientId,
                  name: m.title,
                  grams: m.quantity ?? 100,
                  quantity: m.quantity ?? 100,
                  unit: m.unit ?? 'g',
                  linked: true,
                  per100: zeroMacros(),
                },
              ],
              factor: 1,
            }
          : {
              ingredients: r?.nutritionIngredients ?? [],
              factor: (m.servings ?? 1) / (r?.servings ?? 1),
            };
      });
      const rows = aggregateGroceries(sources, this.nutrition.foods());
      const prefix = `mealplan-${this.week[0].iso}-`;
      const ids = new Set<string>();
      for (const row of rows) {
        const key = `${prefix}${row.foodId}-${row.unit}`;
        const id = `generated-${encodeURIComponent(key)}`;
        ids.add(key);
        const old = this.store.groceries().find((g) => g.generatedKey === key);
        await this.store.saveGrocery(
          {
            name: `${Number(row.quantity.toFixed(3))} ${row.unit} ${row.name}`,
            section: row.category,
            checked: old?.checked ?? false,
            generatedKey: key,
          },
          old?.id ?? id,
        );
      }
      // Preserve manual entries and generated groceries from other weeks.
      for (const old of this.store
        .groceries()
        .filter((g) => g.generatedKey?.startsWith(prefix) && !ids.has(g.generatedKey)))
        await this.store.deleteGrocery(old.id);
      this.nutritionError.set(
        'Groceries updated from linked ingredients. Unlinked text ingredients need manual grocery entries.',
      );
    } catch (e) {
      this.nutritionError.set((e as Error).message);
    } finally {
      this.logging.set(false);
    }
  }
  readonly icons = PLANNING_ICONS;
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(PlanningStore);
  readonly tab = signal<'meals' | 'groceries'>(
    this.route.snapshot.fragment === 'groceries' ? 'groceries' : 'meals',
  );
  constructor() {
    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      this.tab.set(fragment === 'groceries' ? 'groceries' : 'meals');
    });
  }
  week = week();
  readonly mealTitle = signal('');
  readonly mealDetail = signal('');
  readonly selectedDate = signal(this.week[0].iso);
  readonly groceryName = signal('');
  readonly grocerySection = signal('Produce');
  readonly groceriesBySection = computed(() => {
    const groups = new Map<string, GroceryItem[]>();
    for (const item of this.store.groceries()) {
      const section = item.section || 'Other';
      groups.set(section, [...(groups.get(section) ?? []), item]);
    }
    return [...groups.entries()];
  });
  shiftWeek(offset: number): void {
    const anchor = new Date(`${this.week[0].iso}T12:00:00`);
    anchor.setDate(anchor.getDate() + offset * 7);
    this.week = week(anchor);
    this.choose(this.week[0].iso);
  }
  async copyMeal(item: MealPlanItem): Promise<void> {
    try {
      const { id, ...input } = item;
      await this.store.saveMeal({ ...input, date: this.copyDate });
      this.nutritionError.set(`Meal copied to ${this.copyDate}.`);
    } catch (e) {
      this.nutritionError.set((e as Error).message);
    }
  }
  meals(date: string) {
    return this.store.meals().filter((item) => item.date === date);
  }
  edit(item: MealPlanItem): void {
    this.selectedDate.set(item.date);
    this.editingId = item.id;
    this.recipeId = item.recipeId ?? '';
    this.ingredientId = item.ingredientId ?? '';
    this.servings = item.servings ?? 1;
    this.quantity = item.quantity ?? 100;
    this.unit = item.unit ?? 'g';
    this.mealCategory = item.meal ?? 'Dinner';
    this.mealTitle.set(item.title);
    this.mealDetail.set(item.detail);
  }
  async addMeal(): Promise<void> {
    if (!this.mealTitle().trim() || this.logging()) return;
    this.logging.set(true);
    try {
      if (
        !Number.isFinite(this.servings) ||
        this.servings <= 0 ||
        !Number.isFinite(this.quantity) ||
        this.quantity <= 0
      )
        throw new Error('Enter a positive quantity.');
      await this.store.saveMeal(
        {
          date: this.selectedDate(),
          meal: this.mealCategory,
          title: this.mealTitle(),
          detail: this.mealDetail(),
          recipeId: this.recipeId,
          ingredientId: this.ingredientId,
          quantity: this.quantity,
          unit: this.unit,
          servings: this.servings,
        },
        this.editingId || undefined,
      );
      this.reset();
    } catch (e) {
      this.nutritionError.set((e as Error).message);
    } finally {
      this.logging.set(false);
    }
  }
  reset(): void {
    this.mealTitle.set('');
    this.mealDetail.set('');
    this.recipeId = '';
    this.ingredientId = '';
    this.servings = 1;
    this.editingId = '';
  }
  async addGrocery(): Promise<void> {
    if (!this.groceryName().trim()) return;
    await this.store.saveGrocery({
      name: this.groceryName(),
      section: this.grocerySection(),
      checked: false,
    });
    this.groceryName.set('');
  }
  choose(date: string): void {
    this.selectedDate.set(date);
    this.reset();
  }
}
function week(anchor = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + i);
    return {
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      number: d.getDate(),
    };
  });
}
