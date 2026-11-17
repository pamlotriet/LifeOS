import { ChangeDetectionStrategy, Component, input, output, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppInput } from '@shared/components/app-input/app-input';
import { IonIcon } from '@ionic/angular/ion-icon';
import { RecipeStep } from '@pages/recipes/state/recipe/recipe.model';
@Component({
  selector: 'section[appRecipeMethodEditor]',
  imports: [TranslatePipe, AppInput, IonIcon],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-method-editor.html',
  styleUrl: './recipe-method-editor.css',
})
export class RecipeMethodEditor {
  readonly steps = input.required<RecipeStep[]>();
  readonly closeIcon = input.required<string>();
  readonly add = output<void>();
  readonly remove = output<number>();
  readonly update = output<{ index: number; field: 'title' | 'instruction'; value: string }>();
}
