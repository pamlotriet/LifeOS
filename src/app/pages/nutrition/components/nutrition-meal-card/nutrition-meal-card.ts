import { AppButton } from '@shared/components/app-button/app-button';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { FoodLog, MealCategory } from '@pages/nutrition/state/nutrition/nutrition.model';
import { FoodLogRow } from '@pages/nutrition/components/food-log-row/food-log-row';
@Component({
  selector: 'section[appNutritionMealCard]',
  imports: [AppButton, TranslatePipe, FoodLogRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-meal-card.html',
  styleUrl: './nutrition-meal-card.css',
})
export class NutritionMealCard {
  readonly meal = input.required<MealCategory>();
  readonly calories = input.required<number>();
  readonly entries = input.required<FoodLog[]>();
  readonly busy = input(false);
  readonly add = output<void>();
  readonly edit = output<FoodLog>();
  readonly logAgain = output<FoodLog>();
  readonly remove = output<string>();
}
