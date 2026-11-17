import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { budgetSnapshot } from '@pages/budget/budget-snapshot';
import { money } from '@pages/budget/state/budget/budget.model';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';
import { AppForm } from '@shared/directives/app-form';
import { BudgetNumber } from '@shared/directives/budget-number';

@Component({
  selector: 'section[appBudgetBalancePanels]',
  imports: [BudgetNumber, TranslatePipe, AppButton, AppInput, FormsModule, RouterLink, AppForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-balance-panels.html',
  styleUrl: './budget-balance-panels.css',
})
export class BudgetBalancePanels {
  readonly money = money;
  readonly spending = input.required<ReturnType<typeof budgetSnapshot>['leftOver']>();
  readonly savingsTotal = input.required<number>();
  readonly hasSpending = input(true);
  readonly hasSavings = input(true);
  readonly balanceInput = model<number | null>(null);
  readonly balanceSaved = model(false);
  readonly savingBalance = input(false);
  readonly balanceError = input('');
  readonly savingsInput = model<number | null>(null);
  readonly savingsBusy = input(false);
  readonly savingsMessage = input('');
  readonly spendingSave = output<AppForm>();
  readonly savingsSave = output<AppForm>();
}
