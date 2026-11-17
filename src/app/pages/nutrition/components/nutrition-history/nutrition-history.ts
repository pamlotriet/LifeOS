import { AppButton } from '@shared/components/app-button/app-button';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { FoodLog } from '@pages/nutrition/state/nutrition/nutrition.model';
@Component({
  selector: 'details[appNutritionHistory]',
  imports: [AppButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-history.html',
  styleUrl: './nutrition-history.css',
})
export class NutritionHistory {
  readonly entries = input.required<FoodLog[]>();
  readonly busy = input(false);
  readonly logAgain = output<FoodLog>();
}
