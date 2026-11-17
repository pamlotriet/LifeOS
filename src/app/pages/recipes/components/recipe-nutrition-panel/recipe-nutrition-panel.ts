import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { calculateRecipe } from '@pages/nutrition/state/calculations/nutrition.calculations';
@Component({
  selector: 'aside[appRecipeNutritionPanel]',
  imports: [TranslatePipe],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-nutrition-panel.html',
  styleUrl: './recipe-nutrition-panel.css',
})
export class RecipeNutritionPanel {
  readonly summary = input.required<ReturnType<typeof calculateRecipe>>();
  readonly ingredientCount = input.required<number>();
  readonly servings = input.required<number>();
  readonly macroKeys = ['protein', 'carbs', 'fat'] as const;
}
