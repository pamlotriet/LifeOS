import { ChangeDetectionStrategy, Component, input, output, model, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppInput } from '@shared/components/app-input/app-input';
import { FormsModule, ControlContainer } from '@angular/forms';
import { AppSelect, SelectOption } from '@shared/components/app-select/app-select';
import { RecipeInput, RecipeCategory } from '@pages/recipes/state/recipe/recipe.model';
@Component({
  selector: 'section[appRecipeBasicsFields]',
  imports: [TranslatePipe, AppInput, FormsModule, AppSelect],
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true, optional: true }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-basics-fields.html',
  styleUrl: './recipe-basics-fields.css',
})
export class RecipeBasicsFields {
  readonly draft = input.required<RecipeInput>();
  readonly categories = input.required<readonly RecipeCategory[]>();
  readonly selectedCategories = input.required<RecipeCategory[]>();
  readonly difficultyOptions = input.required<SelectOption[]>();
  readonly toggleCategory = output<RecipeCategory>();
  readonly difficultyChange = output<string>();
}
