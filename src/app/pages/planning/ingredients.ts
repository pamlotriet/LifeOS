import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { NutritionService } from '../../shared/state/nutrition/nutrition.service';
import { Food, nutritionLabel, zeroMacros } from '../../shared/state/nutrition/nutrition.model';
import {
  normalizeNutrition,
  scaleNutrition,
} from '../../shared/state/nutrition/nutrition.calculations';
@Component({
  selector: 'app-ingredients',
  imports: [FormsModule, IonContent, PageHeader],
  templateUrl: './ingredients.html',
  styleUrl: '../nutrition/nutrition.css',
})
export class Ingredients {
  readonly store = inject(NutritionService);
  readonly query = signal('');
  readonly category = signal('');
  readonly error = signal('');
  readonly message = signal('');
  readonly busy = signal(false);
  readonly editorOpen = signal(false);
  readonly label = nutritionLabel;
  readonly keys = ['calories', 'protein', 'carbs', 'fat'] as const;
  readonly optionalKeys = ['fibre', 'sugar', 'saturatedFat', 'sodium'] as const;
  food: Food = { id: '', name: '', ...zeroMacros() };
  labelAmount = 100;
  labelUnit: 'g' | 'ml' = 'g';
  portionName = '';
  portionAmount = 1;
  portionBase: 'g' | 'ml' = 'g';
  create(): void {
    this.food = { id: '', name: '', ...zeroMacros() };
    this.labelAmount = 100;
    this.labelUnit = 'g';
    this.error.set('');
    this.message.set('');
    this.editorOpen.set(true);
  }
  readonly foods = computed(() =>
    this.store
      .foods()
      .filter(
        (x) =>
          `${x.name} ${x.brand ?? ''} ${x.preparation ?? ''}`
            .toLowerCase()
            .includes(this.query().toLowerCase()) &&
          (!this.category() || (x.category ?? 'Other') === this.category()),
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  readonly foodCategories = computed(() =>
    [...new Set(this.store.foods().map((f) => f.category ?? 'Other'))].sort(),
  );
  async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save nutrition.');
    } finally {
      this.busy.set(false);
    }
  }
  addPortion(): void {
    this.food.portions = [
      ...(this.food.portions ?? []),
      { unit: this.portionName.trim(), amount: this.portionAmount, baseUnit: this.portionBase },
    ];
    this.portionName = '';
  }
  saveFood(): void {
    void this.run(async () => {
      const normalized = normalizeNutrition(this.food, this.labelAmount);
      await this.store.saveFood({
        ...this.food,
        ...scaleNutrition(normalized, 100),
        baseUnit: this.labelUnit,
        defaultUnit: this.labelUnit,
        id: this.food.id || crypto.randomUUID(),
      });
      this.food = { id: '', name: '', ...zeroMacros() };
      this.labelAmount = 100;
      this.editorOpen.set(false);
    });
  }
  editFood(food: Food): void {
    this.editorOpen.set(true);
    setTimeout(() =>
      document
        .getElementById('ingredient-editor')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
    this.food = structuredClone(food);
    this.labelAmount = 100;
    this.labelUnit = food.baseUnit ?? 'g';
  }
  archiveFood(food: Food): void {
    void this.run(() => this.store.archiveFood(food));
  }
}
