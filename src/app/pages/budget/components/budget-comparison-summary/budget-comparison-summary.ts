import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { money } from '@pages/budget/state/budget/budget.model';
@Component({
  selector: 'section[appBudgetComparisonSummary]',
  imports: [TranslatePipe],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-comparison-summary.html',
  styleUrl: './budget-comparison-summary.css',
})
export class BudgetComparisonSummary {
  readonly totals = input.required<{ planned: number; actual: number }>();
  readonly money = money;
}
