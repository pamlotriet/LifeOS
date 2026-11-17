import { ChangeDetectionStrategy, Component, input, output, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { money } from '@pages/budget/state/budget/budget.model';
import { BudgetCategoryDetails } from '@pages/budget/components/budget-category-details/budget-category-details';
import { BudgetPlan, BudgetTransaction } from '@pages/budget/state/budget/budget.model';
import { compareBudgetCategories } from '@pages/budget/budget-comparison/budget-comparison.model';
@Component({
  selector: 'section[appBudgetComparisonTable]',
  imports: [TranslatePipe, BudgetCategoryDetails],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-comparison-table.html',
  styleUrl: './budget-comparison-table.css',
})
export class BudgetComparisonTable {
  readonly group = input.required<{
    title: string;
    savings: boolean;
    rows: ReturnType<typeof compareBudgetCategories>;
  }>();
  readonly expanded = input<string | null>(null);
  readonly details = input.required<{ plans: BudgetPlan[]; payments: BudgetTransaction[] }>();
  readonly toggleCategory = output<string>();
  readonly money = money;
}
