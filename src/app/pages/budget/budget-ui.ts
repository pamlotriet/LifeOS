import { AfterViewInit, Component, ElementRef, inject, signal, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { ArcElement, BarController, BarElement, CategoryScale, Chart, ChartConfiguration, DoughnutController, Filler, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { BudgetCategory, BudgetTransaction, money, summary } from '../../shared/state/budget/budget.model';

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip);

@Component({ selector: 'app-budget-chart', template: '<div class="chart-frame" [style.height.px]="height"><canvas #canvas role="img" [attr.aria-label]="label"></canvas></div>', styles: ':host { display:block; min-width:0; } .chart-frame { position:relative; }' })
export class BudgetChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) config!: ChartConfiguration;
  @Input() label = '';
  @Input() height = 230;
  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  ngAfterViewInit(): void { this.render(); }
  ngOnChanges(): void { this.render(); }
  ngOnDestroy(): void { this.chart?.destroy(); }
  private render(): void {
    if (!this.canvas) return;
    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, this.config);
  }
}

@Component({ selector: 'app-budget-summary', imports: [IonIcon], styleUrls: ['./budget.css', './budget-layout.css'], template: `
  <div class="summary-grid">
    @for (card of cards(); track card.label) {
      <div class="panel summary-card"><span class="category-icon" [style.background]="card.colour"><ion-icon [name]="card.icon" aria-hidden="true" /></span><div><span class="muted">{{ card.label }}</span><strong>{{ money(card.amount) }}</strong></div></div>
    }
  </div>` })
export class BudgetSummary {
  @Input() transactions: BudgetTransaction[] = [];
  @Input() categories: BudgetCategory[] = [];
  readonly money = money;
  cards() {
    const values = summary(this.transactions, this.categories);
    return [
      { label: 'Income', amount: values.income, colour: '#05a99c', icon: 'cash' },
      { label: 'Expenses', amount: values.expenses, colour: '#f55386', icon: 'wallet' },
      { label: 'Bills', amount: values.bills, colour: '#008fea', icon: 'document-text' },
      { label: 'Savings', amount: values.savings, colour: '#7451df', icon: 'home' },
    ];
  }
}

@Component({ selector: 'app-budget-transactions', imports: [RouterLink, IonIcon], styleUrls: ['./budget.css', './budget-layout.css', './budget-transactions.css'], template: `
  <div class="transaction-list">
    @for (item of transactions; track item.id) {
      <div class="transaction-entry"><a class="transaction-row" [routerLink]="['/budget/transactions', item.id, 'edit']">
        <span class="category-icon" [style.background]="category(item.categoryId)?.colour || '#768bad'"><ion-icon [name]="category(item.categoryId)?.icon || 'wallet'" aria-hidden="true" /></span>
        <span class="row-copy"><strong>{{ item.title }}</strong><small>{{ category(item.categoryId)?.name || 'Uncategorised' }} · {{ date(item.date) }}</small></span>
        <strong class="amount" [class.positive]="item.type === 'income'" [class.negative]="item.type === 'expense'">{{ item.type === 'income' ? '+' : item.type === 'expense' ? '−' : '↗' }}{{ money(item.amount) }}</strong>
      </a>
      <button type="button" class="transaction-delete" [disabled]="deleting()" [attr.aria-label]="'Delete ' + item.title" (click)="requestDelete(item)"><ion-icon name="trash-outline" aria-hidden="true" /><span>Delete</span></button>
      </div>
      @if (pending()?.id === item.id) {
        <section class="transaction-confirm" role="alert" [attr.aria-label]="'Confirm deletion of ' + item.title">
          <div class="confirm-heading"><ion-icon name="trash-outline" aria-hidden="true" /><strong>Delete {{ item.title }}?</strong></div>
          <p>{{ money(item.amount) }} &middot; {{ date(item.date) }}. This removes the transaction and its receipt and updates your budget totals.@if (item.debtId) { The debt balance will also be updated. }</p>
          @if (deleteError()) { <p class="negative">{{ deleteError() }}</p> }
          <div class="confirm-actions"><button type="button" class="secondary-button" [disabled]="deleting()" (click)="pending.set(null)">Keep transaction</button><button type="button" class="secondary-button danger-button" [disabled]="deleting()" (click)="remove()">{{ deleting() ? 'Deleting...' : 'Delete transaction' }}</button></div>
        </section>
      }
    } @empty { <div class="empty-state"><ion-icon name="wallet" aria-hidden="true" /><h3>No transactions yet</h3><p>Add a transaction to start tracking this period.</p><a class="text-link" routerLink="/budget/transactions/add">Add your first transaction</a></div> }
  </div>` })
export class BudgetTransactions {
  private readonly store = inject(BudgetStore);
  readonly pending = signal<BudgetTransaction | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  requestDelete(item: BudgetTransaction): void {
    if (this.deleting()) return;
    this.pending.set(item); this.deleteError.set('');
  }
  async remove(): Promise<void> {
    const item = this.pending();
    if (!item || this.deleting()) return;
    this.deleting.set(true); this.deleteError.set('');
    try { await this.store.deleteTransaction(item); this.pending.set(null); }
    catch (error) { this.deleteError.set(error instanceof Error ? error.message : 'Could not delete transaction. Please try again.'); }
    finally { this.deleting.set(false); }
  }
  @Input() transactions: BudgetTransaction[] = [];
  @Input() categories: BudgetCategory[] = [];
  readonly money = money;
  category(id: string) { return this.categories.find(x => x.id === id); }
  date(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }); }
}
