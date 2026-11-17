import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { BudgetPlan, BudgetTransaction, money } from '@pages/budget/state/budget/budget.model';
@Component({
  selector: 'div[appBudgetCategoryDetails]',
  imports: [TranslatePipe, RouterLink],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-category-details.html',
  styleUrl: './budget-category-details.css',
})
export class BudgetCategoryDetails {
  readonly details = input.required<{ plans: BudgetPlan[]; payments: BudgetTransaction[] }>();
  readonly savings = input(false);
  readonly money = money;
}
