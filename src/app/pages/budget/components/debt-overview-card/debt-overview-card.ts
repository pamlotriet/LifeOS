import { ChangeDetectionStrategy, Component, input, output, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { BudgetTransaction, money } from '@pages/budget/state/budget/budget.model';
import { DebtOverviewRow } from '@pages/budget/state/budget/debt-view.model';
import { DebtPaymentRow } from '@pages/budget/components/debt-payment-row/debt-payment-row';
@Component({
  selector: 'article[appDebtOverviewCard]',
  imports: [TranslatePipe, AppButton, DebtPaymentRow],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './debt-overview-card.html',
  styleUrl: './debt-overview-card.css',
})
export class DebtOverviewCard {
  readonly row = input.required<DebtOverviewRow>();
  readonly today = input.required<string>();
  readonly busy = input(false);
  readonly expanded = input(false);
  readonly exportPdf = output<void>();
  readonly editDebt = output<void>();
  readonly toggle = output<void>();
  readonly payment = output<{ status: 'paid' | 'planned'; item?: BudgetTransaction }>();
  readonly removePayment = output<BudgetTransaction>();
  readonly money = money;
}
