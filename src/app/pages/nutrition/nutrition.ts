import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { NutritionService } from '../../shared/state/nutrition/nutrition.service';
import {
  FoodLog,
  localDate,
  MEAL_CATEGORIES,
  MealCategory,
  nutritionLabel,
  zeroMacros,
} from '../../shared/state/nutrition/nutrition.model';
import {
  calculateRecipe,
  ingredientNutrition,
  scaleNutrition,
  sumNutrition,
} from '../../shared/state/nutrition/nutrition.calculations';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';
import { PlanningStore } from '../../shared/state/planning/planning-store';
@Component({
  selector: 'app-nutrition',
  imports: [FormsModule, RouterLink, IonContent, PageHeader],
  templateUrl: './nutrition.html',
  styleUrl: './nutrition.css',
})
export class Nutrition {
  readonly store = inject(NutritionService);
  readonly recipes = inject(RecipeStore);
  readonly planning = inject(PlanningStore);
  readonly date = signal(localDate());
  readonly today = localDate();
  readonly error = signal('');
  readonly busy = signal(false);
  readonly label = nutritionLabel;
  readonly categories = MEAL_CATEGORIES;
  readonly keys = ['calories', 'protein', 'carbs', 'fat'] as const;
  readonly entries = computed(() => this.store.logs().filter((x) => x.date === this.date()));
  readonly total = computed(() => sumNutrition(this.entries().map((x) => x.nutrition)));
  readonly planned = computed(() =>
    sumNutrition(
      this.planning
        .meals()
        .filter((m) => m.date === this.date())
        .map((m) => {
          if (m.ingredientId) {
            const f = this.store.foods().find((f) => f.id === m.ingredientId);
            try {
              return f ? ingredientNutrition(f, m.quantity ?? 100, m.unit ?? 'g') : zeroMacros();
            } catch {
              return zeroMacros();
            }
          }
          const r = this.recipes.recipes().find((r) => r.id === m.recipeId);
          return r
            ? scaleNutrition(
                calculateRecipe(
                  r.nutritionIngredients ?? [],
                  r.servings,
                  this.store.foods(),
                  r.ingredients,
                ).perServing,
                m.servings ?? 1,
              )
            : zeroMacros();
        }),
    ),
  );
  readonly loggerOpen = signal(false);
  readonly logMode = signal<'ingredient' | 'recipe' | 'manual'>('ingredient');
  readonly macros = ['protein', 'carbs', 'fat'] as const;
  readonly remaining = computed(
    () => this.store.profile().targets.calories - this.total().calories,
  );
  readonly progress = computed(() => {
    const goal = this.store.profile().targets.calories;
    return goal > 0 ? Math.min(100, (this.total().calories / goal) * 100) : 0;
  });
  openLogger(meal: MealCategory = this.meal): void {
    this.meal = meal;
    this.editingId = '';
    this.loggerOpen.set(true);
    this.error.set('');
    setTimeout(() =>
      document
        .getElementById('food-composer')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }
  mealCalories(meal: MealCategory): number {
    return this.grouped(meal).reduce((sum, entry) => sum + entry.nutrition.calories, 0);
  }
  meal: MealCategory = 'Breakfast';
  foodId = '';
  grams = 100;
  unit = 'g';
  recipeId = '';
  servings = 1;
  manualName = '';
  manual = zeroMacros();
  editMeal: MealCategory = 'Snacks';
  editDate = localDate();
  editingId = '';
  editQuantity = 1;
  foodPreview(): string {
    const food = this.store.foods().find((f) => f.id === this.foodId);
    if (!food) return '';
    try {
      return this.label(ingredientNutrition(food, this.grams, this.unit));
    } catch (e) {
      return (e as Error).message;
    }
  }
  recipePreview(): string {
    const recipe = this.recipes.recipes().find((r) => r.id === this.recipeId);
    if (!recipe) return '';
    const summary = calculateRecipe(
      recipe.nutritionIngredients ?? [],
      recipe.servings,
      this.store.foods(),
      recipe.ingredients,
    );
    try {
      return summary.complete
        ? this.label(scaleNutrition(summary.perServing, this.servings))
        : 'Incomplete nutrition. Link all ingredients before logging.';
    } catch (e) {
      return (e as Error).message;
    }
  }
  units(): string[] {
    return [
      'g',
      'kg',
      'ml',
      'l',
      ...(this.store.foods().find((f) => f.id === this.foodId)?.portions ?? []).map((p) => p.unit),
    ];
  }
  grouped(meal: MealCategory) {
    return this.entries().filter((e) => (e.meal ?? 'Snacks') === meal);
  }
  changeDate(offset: number): void {
    const date = new Date(`${this.date()}T12:00:00`);
    date.setDate(date.getDate() + offset);
    this.date.set(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    );
    this.editingId = '';
    this.loggerOpen.set(false);
  }
  async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
      this.loggerOpen.set(false);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save nutrition.');
    } finally {
      this.busy.set(false);
    }
  }
  removeLog(id: string): void {
    void this.run(() => this.store.removeLog(id));
  }
  logFood(): void {
    const date = this.date();
    void this.run(async () => {
      const f = this.store.foods().find((x) => x.id === this.foodId && !x.archived);
      if (!f) throw new Error('Choose an active ingredient.');
      await this.store.saveLog({
        date,
        meal: this.meal,
        name: f.name,
        sourceType: 'ingredient',
        sourceId: f.id,
        quantity: this.grams,
        unit: this.unit,
        amount: `${this.grams} ${this.unit}`,
        nutrition: ingredientNutrition(f, this.grams, this.unit),
      });
    });
  }
  logRecipe(): void {
    const date = this.date();
    void this.run(async () => {
      const r = this.recipes.recipes().find((x) => x.id === this.recipeId);
      if (!r) throw new Error('Choose a recipe.');
      const summary = calculateRecipe(
        r.nutritionIngredients ?? [],
        r.servings,
        this.store.foods(),
        r.ingredients,
      );
      if (!summary.complete)
        throw new Error('Recipe nutrition is incomplete. Link all ingredients first.');
      await this.store.saveLog({
        date,
        meal: this.meal,
        name: r.title,
        sourceType: 'recipe',
        sourceId: r.id,
        quantity: this.servings,
        unit: 'servings',
        amount: `${this.servings} servings`,
        nutrition: scaleNutrition(summary.perServing, this.servings),
      });
    });
  }
  logManual(): void {
    const date = this.date();
    void this.run(() =>
      this.store.saveLog({
        date,
        meal: this.meal,
        name: this.manualName,
        sourceType: 'manual',
        quantity: 1,
        unit: 'portion',
        amount: '1 portion',
        nutrition: structuredClone(this.manual),
      }),
    );
  }
  copy(entry: FoodLog): void {
    const date = this.date();
    void this.run(() => {
      const { id, plannedMealId, createdAt, goalSnapshot, ...copy } = entry;
      return this.store.saveLog({ ...copy, date });
    });
  }
  startEdit(entry: FoodLog): void {
    this.editingId = entry.id;
    this.editMeal = entry.meal ?? 'Snacks';
    this.editDate = entry.date;
    this.editQuantity = entry.quantity ?? 1;
    this.manualName = entry.name;
    this.manual = { ...entry.nutrition };
  }
  saveEdit(entry: FoodLog): void {
    void this.run(async () => {
      await this.store.saveLog(
        {
          ...entry,
          date: this.editDate,
          meal: this.editMeal,
          name: this.manualName,
          quantity: this.editQuantity,
          amount: `${this.editQuantity} ${entry.unit ?? 'portion'}`,
          nutrition: scaleNutrition(this.manual, this.editQuantity / (entry.quantity ?? 1)),
        },
        entry.id,
      );
      this.editingId = '';
    });
  }
  readonly history = computed(() =>
    [...this.store.logs()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
  );
}
