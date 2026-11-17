import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import type { Food, MealCategory } from '@pages/nutrition/state/nutrition/nutrition.model';
import type { RecipeRecord } from '@pages/recipes/state/recipe/recipe.model';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';

@Component({
  selector: 'section[appMealEditor]',
  imports: [TranslatePipe, AppButton, AppInput, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meal-editor.html',
  styleUrl: './meal-editor.css',
})
export class MealEditor {
  readonly editingId = input('');
  readonly date = model.required<string>();
  readonly category = model.required<MealCategory>();
  readonly recipeId = model('');
  readonly ingredientId = model('');
  readonly quantity = model(100);
  readonly unit = model('g');
  readonly servings = model(1);
  readonly title = model('');
  readonly detail = model('');
  readonly categories = input.required<readonly MealCategory[]>();
  readonly recipes = input.required<RecipeRecord[]>();
  readonly foods = input.required<Food[]>();
  readonly busy = input(false);
  readonly unavailable = input(false);
  readonly recipeSelected = output<void>();
  readonly ingredientSelected = output<void>();
  readonly save = output<void>();
  readonly cancel = output<void>();
}
