import { ChangeDetectionStrategy, Component, input, output, model, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppButton } from '@shared/components/app-button/app-button';
import { FormsModule, ControlContainer } from '@angular/forms';
import { RecipeInput } from '@pages/recipes/state/recipe/recipe.model';
@Component({
  selector: 'details[appRecipeScalingControls]',
  imports: [TranslatePipe, AppInput, AppButton, FormsModule],
  viewProviders: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true, optional: true }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-scaling-controls.html',
  styleUrl: './recipe-scaling-controls.css',
})
export class RecipeScalingControls {
  readonly draft = input.required<RecipeInput>();
  readonly scaleFactor = model(1);
  readonly scale = output<void>();
}
