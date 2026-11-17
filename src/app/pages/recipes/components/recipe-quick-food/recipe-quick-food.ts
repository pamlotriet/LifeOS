import { ChangeDetectionStrategy, Component, input, output, model, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppButton } from '@shared/components/app-button/app-button';
import { FormsModule, ControlContainer } from '@angular/forms';
@Component({
  selector: 'details[appRecipeQuickFood]',
  imports: [TranslatePipe, AppInput, AppButton, FormsModule],
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true, optional: true }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-quick-food.html',
  styleUrl: './recipe-quick-food.css',
})
export class RecipeQuickFood {
  readonly name = model('');
  readonly calories = model(0);
  readonly protein = model(0);
  readonly carbs = model(0);
  readonly fat = model(0);
  readonly creating = input(false);
  readonly create = output<void>();
}
