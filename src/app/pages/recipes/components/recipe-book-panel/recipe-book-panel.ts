import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppButton } from '@shared/components/app-button/app-button';
import { RecipeRecord } from '@pages/recipes/state/recipe/recipe.model';
@Component({
  selector: 'section[appRecipeBookPanel]',
  imports: [TranslatePipe, FormsModule, AppInput, AppButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-book-panel.html',
  styleUrl: './recipe-book-panel.css',
})
export class RecipeBookPanel {
  readonly recipes = input.required<RecipeRecord[]>();
  readonly selectedRecipes = input.required<Set<string>>();
  readonly exporting = input(false);
  readonly selectedCount = input(0);
  readonly unavailable = input(false);
  readonly message = input('');
  readonly bookTitle = model('');
  readonly includePhotos = model(true);
  readonly close = output<void>();
  readonly selectRecipe = output<string>();
  readonly selectAll = output<void>();
  readonly clearSelection = output<void>();
  readonly download = output<void>();
}
