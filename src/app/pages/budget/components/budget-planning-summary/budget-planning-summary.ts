import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { money } from '@pages/budget/state/budget/budget.model';
import { budgetSnapshot } from '@pages/budget/budget-snapshot';
@Component({
  selector: 'section[appBudgetPlanningSummary]',
  imports: [TranslatePipe],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-planning-summary.html',
  styleUrl: './budget-planning-summary.css',
})
export class BudgetPlanningSummary {
  readonly income = input.required<number>();
  readonly plannedTotal = input.required<number>();
  readonly predictedBalance = input.required<number>();
  readonly outlook = input.required<ReturnType<typeof budgetSnapshot>>();
  readonly money = money;
}
