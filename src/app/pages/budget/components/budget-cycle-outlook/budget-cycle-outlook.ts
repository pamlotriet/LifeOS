import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { budgetSnapshot } from '@pages/budget/budget-snapshot';
import { BudgetSummary } from '@pages/budget/components/budget-summary/budget-summary';
import { BudgetCategory, BudgetTransaction, money } from '@pages/budget/state/budget/budget.model';

@Component({
  selector: 'details[appBudgetCycleOutlook]',
  imports: [BudgetSummary, TranslatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-cycle-outlook.html',
  styleUrl: './budget-cycle-outlook.css',
})
export class BudgetCycleOutlook {
  readonly snapshot = input.required<ReturnType<typeof budgetSnapshot>>();
  readonly transactions = input.required<BudgetTransaction[]>();
  readonly categories = input.required<BudgetCategory[]>();
  readonly money = money;
}
