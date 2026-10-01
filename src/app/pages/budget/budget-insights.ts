import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { money, summary, total } from '../../shared/state/budget/budget.model';
import { BudgetChart } from './budget-ui';

@Component({ selector: 'app-budget-insights', imports: [FormsModule, RouterLink, IonContent, IonIcon, BudgetChart], templateUrl: './budget-insights.html', styleUrls: ['./budget.css', './budget-layout.css'] })
export class BudgetInsights {
  readonly store = inject(BudgetStore); readonly tab = signal('spending'); readonly money = money;
  readonly breakdown = computed(() => {
    const type = this.tab() === 'income' ? 'income' : 'expense';
    const items = this.store.monthly().filter(x => x.type === type);
    return this.store.categories().map(c => ({ ...c, amount: total(items.filter(x => x.categoryId === c.id)) })).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount);
  });
  readonly periods = computed(() => Array.from({ length: 4 }, (_, index) => {
    const date = new Date(`${this.store.month()}-01T12:00:00`); date.setMonth(date.getMonth() - 3 + index);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { month, label: date.toLocaleDateString('en-ZA', { month: 'short' }), ...summary(this.store.transactions().filter(x => x.date.startsWith(month)), this.store.categories()) };
  }));
  readonly average = computed(() => this.periods().reduce((sum, x) => sum + Math.round(x.expenses * 100), 0) / 400);
  readonly change = computed(() => { const periods = this.periods(); const previous = periods[2].expenses; return previous > 0 ? Math.round((periods[3].expenses - previous) / previous * 100) : null; });
  readonly hasHistory = computed(() => this.periods().some(x => x.income || x.expenses));
  private readonly axisNumber = new Intl.NumberFormat('en-ZA', { notation: 'compact', maximumFractionDigits: 1 });
  private readonly amountTicks = {
    color: '#bed0e7', font: { size: 11 }, maxTicksLimit: 5, maxRotation: 0,
    callback: (value: string | number) => `R ${this.axisNumber.format(Number(value))}`,
  };
  private readonly options: ChartOptions<'bar'> = {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { labels: { color: '#c7dbef', usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 8 } }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${money(Number(context.raw))}` } } },
    scales: { x: { grid: { display: false }, ticks: { color: '#bed0e7' }, border: { display: false } }, y: { beginAtZero: true, grid: { color: '#16405b66' }, ticks: this.amountTicks, border: { display: false } } },
  };
  readonly horizontal = computed<ChartConfiguration>(() => ({ type: 'bar', data: { labels: this.breakdown().map(x => x.name), datasets: [{ label: this.tab() === 'income' ? 'Income' : 'Spending', data: this.breakdown().map(x => x.amount), backgroundColor: this.breakdown().map(x => x.colour), borderRadius: 5, maxBarThickness: 18 }] }, options: { ...this.options, indexAxis: 'y', plugins: { ...this.options.plugins, legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: this.amountTicks, grid: { color: '#16405b66' } }, y: { ticks: { color: '#e4edff', font: { size: 11 } }, grid: { display: false }, border: { display: false } } } } }));
  readonly comparison = computed<ChartConfiguration>(() => ({ type: 'bar', data: { labels: this.periods().map(x => x.label), datasets: [{ label: 'Income', data: this.periods().map(x => x.income), backgroundColor: '#35dba4', borderRadius: 4, maxBarThickness: 22 }, { label: 'Expenses', data: this.periods().map(x => x.expenses), backgroundColor: '#ff608b', borderRadius: 4, maxBarThickness: 22 }] }, options: this.options }));
  setMonth(value: string): void { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) this.store.month.set(value); }
}
