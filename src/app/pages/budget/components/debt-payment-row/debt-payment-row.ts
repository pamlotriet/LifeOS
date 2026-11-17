import { ChangeDetectionStrategy, Component, input, output, model } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { BudgetTransaction, money } from '@pages/budget/state/budget/budget.model';
@Component({
  selector: 'div[appDebtPaymentRow]',
  imports: [TranslatePipe, AppButton],

  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './debt-payment-row.html',
  styleUrl: './debt-payment-row.css',
})
export class DebtPaymentRow {
  readonly item = input.required<BudgetTransaction>();
  readonly planned = input(false);
  readonly today = input.required<string>();
  readonly busy = input(false);
  readonly markPaid = output<void>();
  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly money = money;
  date(value: string): string {
    return new Date(value + 'T12:00:00').toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
