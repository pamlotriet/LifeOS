import { ChangeDetectionStrategy, Component, input, output, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppInput } from '@shared/components/app-input/app-input';
import { FormsModule, ControlContainer } from '@angular/forms';
import { NutritionIngredient } from '@pages/nutrition/state/nutrition/nutrition.model';
@Component({
  selector: 'div[appRecipeIngredientRow]',
  imports: [TranslatePipe, AppInput, FormsModule],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-ingredient-row.html',
  styleUrl: './recipe-ingredient-row.css',
})
export class RecipeIngredientRow {
  readonly item = input.required<NutritionIngredient>();
  readonly quantityChange = output<number>();
  readonly remove = output<void>();
}
