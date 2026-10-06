import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { ChartConfiguration } from 'chart.js';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { debtSummary, money, summary, total } from '../../shared/state/budget/budget.model';
import { BudgetChart, BudgetSummary, BudgetTransactions } from './budget-ui';
import { AppSkeleton } from '../../shared/components/app-skeleton/app-skeleton';

@Component({ selector: 'app-budget-overview', imports: [IonContent, IonIcon, FormsModule, RouterLink, BudgetChart, BudgetSummary, BudgetTransactions, AppSkeleton], templateUrl: './budget-overview.html', styleUrls: ['./budget.css', './budget-layout.css'] })
export class BudgetOverview {
  readonly store = inject(BudgetStore);
  readonly monthlyView = !!inject(ActivatedRoute).snapshot.data['monthly'];
  readonly selectedDate = signal('');
  readonly tab = signal('overview');
  readonly money = money;
  readonly cycleDays = Array.from({length:31}, (_,i)=>i+1);
  readonly savingCycle = signal(false);
  readonly cycleError = signal('');
  async saveCycle(day: string): Promise<void> {
    if(this.savingCycle()) return;
    this.savingCycle.set(true); this.cycleError.set('');
    try { await this.store.setCycleStartDay(Number(day)); this.selectedDate.set(''); }
    catch(error) { this.cycleError.set(error instanceof Error ? error.message : 'Could not save cycle.'); }
    finally { this.savingCycle.set(false); }
  }
  readonly totals = computed(() => summary(this.store.monthly(), this.store.categories()));
  readonly debtCards = computed(() => this.store.debts().map(debt => ({ debt, ...debtSummary(debt, this.store.transactions(), this.store.month(), this.store.cycleStartDay()) })));
  readonly filtered = computed(() => this.store.monthly().filter(x => !this.selectedDate() || x.date === this.selectedDate()));
  readonly spending = computed(() => {
    const items = this.store.monthly().filter(x => x.type === 'expense');
    const sum = total(items);
    return this.store.categories().map(c => ({ ...c, amount: total(items.filter(x => x.categoryId === c.id)) })).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount).map(x => ({ ...x, percent: sum ? Math.round(x.amount / sum * 100) : 0 }));
  });
  readonly donut = computed<ChartConfiguration>(() => ({
    type: 'doughnut', data: { labels: this.spending().map(x => x.name), datasets: [{ data: this.spending().map(x => x.amount), backgroundColor: this.spending().map(x => x.colour), borderWidth: 0, hoverOffset: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.label}: ${money(Number(context.raw))}` } } } },
  }));
  readonly days = computed(() => {
    const start = new Date(this.store.cycle().start + 'T12:00:00');
    const days: Array<{ date: string; label: string } | null> = Array.from({ length: (start.getDay()+6)%7 }, () => null);
    while (true) {
      const date = start.getFullYear()+'-'+String(start.getMonth()+1).padStart(2,'0')+'-'+String(start.getDate()).padStart(2,'0');
      if (date >= this.store.cycle().endExclusive) break;
      days.push({ date, label: start.getDate() === 1 ? start.toLocaleDateString('en-ZA', {day:'numeric',month:'short'}) : String(start.getDate()) });
      start.setDate(start.getDate()+1);
    }
    return days;
  });
  readonly monthLabel = computed(() => new Date(`${this.store.month()}-01T12:00:00`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }));
  setMonth(value: string): void { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) { this.store.month.set(value); this.selectedDate.set(''); } }
  shiftMonth(delta: number): void { const date = new Date(`${this.store.month()}-01T12:00:00`); date.setMonth(date.getMonth() + delta); this.setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`); }
  hasTransactions(date: string): boolean { return this.store.monthly().some(x => x.date === date); }
  selectDay(date: string): void { this.selectedDate.set(this.selectedDate() === date ? '' : date); }
  ratio(value: number): number { return Math.min(100, value / Math.max(this.totals().income, this.totals().expenses, 1) * 100); }
}
