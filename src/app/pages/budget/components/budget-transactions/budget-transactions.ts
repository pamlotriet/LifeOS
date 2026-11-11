import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject, signal, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { BudgetCategory, BudgetTransaction, money } from '@pages/budget/state/budget/budget.model';
import { AppButton } from '@shared/components/app-button/app-button';
@Component({
  selector: 'app-budget-transactions',
  imports: [TranslatePipe, AppButton, RouterLink, IonIcon],
  styleUrls: ['../../budget.css', '../../budget-layout.css', './budget-transactions.css'],
  template: ` <div class="transaction-list">
    @for (item of transactions; track item.id) {
      <div class="transaction-entry">
        <a class="transaction-row" [routerLink]="['/budget/transactions', item.id, 'edit']">
          <span
            class="category-icon"
            [style.background]="category(item.categoryId)?.colour || '#768bad'"
            ><ion-icon [name]="category(item.categoryId)?.icon || 'wallet'" aria-hidden="true"
          /></span>
          <span class="row-copy"
            ><strong>{{ item.title | translate }}</strong
            ><small
              >{{ category(item.categoryId)?.name || 'Uncategorised' | translate
              }}{{ accountLabel(item) | translate }} · {{ date(item.date) }}</small
            ></span
          >
          <strong
            class="amount"
            [class.positive]="item.type === 'income'"
            [class.negative]="item.type === 'expense'"
            >{{ (item.type === 'income' ? '+' : item.type === 'expense' ? '−' : '↗') | translate
            }}{{ money(item.amount) }}</strong
          >
        </a>
        <button
          type="button"
          class="transaction-delete"
          [disabled]="deleting()"
          [attr.aria-label]="'Delete ' + item.title | translate"
          (click)="requestDelete(item)"
        >
          <ion-icon name="trash-outline" aria-hidden="true" /><span>{{
            'Delete' | translate
          }}</span>
        </button>
      </div>
      @if (pending()?.id === item.id) {
        <section
          class="transaction-confirm"
          role="alert"
          [attr.aria-label]="'Confirm deletion of ' + item.title | translate"
        >
          <div class="confirm-heading">
            <ion-icon name="trash-outline" aria-hidden="true" /><strong>{{
              'messages.delete_count_c61c87' | translate: { p0: item.title }
            }}</strong>
          </div>
          <p>
            {{
              'messages.count_count_this_removes_the_transaction_and_b86061'
                | translate: { p0: money(item.amount), p1: date(item.date) }
            }}
            @if (item.debtId) {
              {{ 'The debt balance will also be updated.' | translate }}
            }
          </p>
          @if (deleteError()) {
            <p class="negative">{{ deleteError() | translate }}</p>
          }
          <div class="confirm-actions">
            <button
              appButton="secondary"
              type="button"
              class="secondary-button"
              [disabled]="deleting()"
              (click)="pending.set(null)"
            >
              {{ 'Keep transaction' | translate }}</button
            ><button
              appButton="danger"
              type="button"
              class="secondary-button danger-button"
              [disabled]="deleting()"
              (click)="remove()"
            >
              {{ (deleting() ? 'Deleting...' : 'Delete transaction') | translate }}
            </button>
          </div>
        </section>
      }
    } @empty {
      <div class="empty-state">
        <ion-icon name="wallet" aria-hidden="true" />
        <h3>{{ 'No transactions yet' | translate }}</h3>
        <p>{{ 'Add a transaction to start tracking this period.' | translate }}</p>
        <a class="text-link" routerLink="/budget/transactions/add">{{
          'Add your first transaction' | translate
        }}</a>
      </div>
    }
  </div>`,
})
export class BudgetTransactions {
  private readonly store = inject(BudgetStore);
  readonly pending = signal<BudgetTransaction | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  requestDelete(item: BudgetTransaction): void {
    if (this.deleting()) return;
    this.pending.set(item);
    this.deleteError.set('');
  }
  async remove(): Promise<void> {
    const item = this.pending();
    if (!item || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    try {
      await this.store.deleteTransaction(item);
      this.pending.set(null);
    } catch (error) {
      this.deleteError.set(
        error instanceof Error ? error.message : 'Could not delete transaction. Please try again.',
      );
    } finally {
      this.deleting.set(false);
    }
  }
  @Input() transactions: BudgetTransaction[] = [];
  @Input() categories: BudgetCategory[] = [];
  accountLabel(item: BudgetTransaction): string {
    if (item.account === 'savings') return ' ? Savings';
    if (item.account?.startsWith('credit:'))
      return (
        ' ? ' +
        (this.store.debts().find((debt) => debt.id === item.account?.slice(7))?.name ??
          'Credit card')
      );
    return '';
  }
  readonly money = money;
  category(id: string) {
    return this.categories.find((x) => x.id === id);
  }
  date(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
    });
  }
}
