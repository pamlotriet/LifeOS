import { AppButton } from '@shared/components/app-button/app-button';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { FoodLog } from '@pages/nutrition/state/nutrition/nutrition.model';
@Component({
  selector: 'article[appFoodLogRow]',
  imports: [AppButton, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './food-log-row.html',
  styleUrl: './food-log-row.css',
})
export class FoodLogRow {
  readonly entry = input.required<FoodLog>();
  readonly busy = input(false);
  readonly edit = output<void>();
  readonly logAgain = output<void>();
  readonly remove = output<void>();
}
