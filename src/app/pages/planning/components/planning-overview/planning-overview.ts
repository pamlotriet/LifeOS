import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'section[appPlanningOverview]',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planning-overview.html',
  styleUrl: './planning-overview.css',
})
export class PlanningOverview {
  readonly mealCount = input.required<number>();
  readonly plannedDays = input.required<number>();
  readonly remainingGroceries = input.required<number>();
}
