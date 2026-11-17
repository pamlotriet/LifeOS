import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { MealPlanItem } from '@pages/planning/state/plan/planning.model';
import { AppButton } from '@shared/components/app-button/app-button';

@Component({
  selector: 'section[appMealSlot]',
  imports: [TranslatePipe, AppButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meal-slot.html',
  styleUrl: './meal-slot.css',
})
export class MealSlot {
  readonly category = input.required<string>();
  readonly items = input.required<MealPlanItem[]>();
  readonly busy = input(false);
  readonly summaries = input.required<Map<string, string>>();
  readonly loggedIds = input.required<Set<string>>();
  readonly add = output<void>();
  readonly edit = output<MealPlanItem>();
  readonly remove = output<string>();
  readonly consume = output<MealPlanItem>();
}
