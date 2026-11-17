import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IonIcon } from '@ionic/angular/ion-icon';

import { RecipeRecord, recipeCategories } from '@pages/recipes/state/recipe/recipe.model';
@Component({
  selector: 'a[appRecipeCard]',
  imports: [TranslatePipe, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-card.html',
  styleUrl: './recipe-card.css',
})
export class RecipeCard {
  readonly recipe = input.required<RecipeRecord>();
  readonly recipeCategories = recipeCategories;
}
