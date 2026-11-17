import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { RouterLink } from '@angular/router';
import { Macros } from '@pages/nutrition/state/nutrition/nutrition.model';
@Component({
  selector: 'section[appDailyNutritionOverview]',
  imports: [TranslatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './daily-nutrition-overview.html',
  styleUrl: './daily-nutrition-overview.css',
})
export class DailyNutritionOverview {
  readonly total = input.required<Macros>();
  readonly targets = input.required<Macros>();
  readonly remaining = input.required<number>();
  readonly plannedCalories = input.required<number>();
  readonly macros = ['protein', 'carbs', 'fat'] as const;
  readonly progress = input.required<number>();
}
