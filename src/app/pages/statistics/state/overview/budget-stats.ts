import { Injector } from '@angular/core';
import { budgetSpending } from '@pages/budget/budget-snapshot';
import { localDate, money, summary } from '@pages/budget/state/budget/budget.model';
import { BudgetStore } from '@pages/budget/state/budget/budget.store';
import { cycleBounds } from '@pages/budget/state/cycle/budget-cycle';
import { debtStats } from '@pages/statistics/state/debts/debt-stats';
import { statsAnchor, statsMonths } from '@pages/statistics/state/overview/stats.calculations';

import { chartOptions, kpi, labels } from '@pages/statistics/state/overview/stats-charts';
import type { StatsDashboard, StatsRange } from '@pages/statistics/state/overview/stats.model';
export class BudgetStats {
  constructor(private readonly injector: Injector) {}
  private get budget(): BudgetStore {
    return this.injector.get(BudgetStore);
  }
  budgetReportCycle(range?: StatsRange, selectedMonth?: string): string {
    if (range === '1M') {
      const month = statsMonths(range, statsAnchor(range, selectedMonth))[0];
      const bounds = cycleBounds(month, this.budget.cycleStartDay());
      return `${bounds.start} - ${bounds.end}`;
    }
    return this.budget.cycleLabel();
  }
  dashboard(range: StatsRange, selectedMonth?: string): StatsDashboard {
    const months = statsMonths(
      range,
      range === '1M'
        ? statsAnchor(range, selectedMonth)
        : new Date(this.budget.month() + '-01T12:00:00'),
    );
    const reportMonth = range === '1M' ? months[0] : this.budget.month();
    const allowed = new Set(months);
    const items =
      range === 'All'
        ? this.budget.transactions()
        : this.budget.transactions().filter((x) => allowed.has(this.budget.monthForDate(x.date)));
    const values = summary(items, this.budget.categories());
    const debt = debtStats(
      this.budget.debts(),
      this.budget.transactions(),
      months,
      range === 'All',
      localDate(),
      this.budget.cycleStartDay(),
      reportMonth,
    );
    const grouped = months.map((month) => {
      const part = items.filter((x) => this.budget.inMonth(x.date, month));
      const value = summary(part, this.budget.categories());
      return {
        month,
        income: value.income,
        expenses: value.expenses,
        savings: value.savings,
        remaining: value.remaining,
      };
    });
    return {
      empty: !items.some((x) => x.paymentStatus !== 'planned') && !this.budget.debts().length,
      emptyTitle: 'No budget data yet',
      emptyMessage: 'Add income or expenses to see financial trends.',
      action: '/budget/transactions/add',
      spending: budgetSpending(items, this.budget.categories()).map((row) => ({
        ...row,
        formatted: money(row.amount),
      })),
      kpis: [
        kpi('Recorded income', money(values.income), 'cash', '#20b875'),
        kpi('Actual spending', money(values.expenses), 'wallet', '#ef4f5f'),
        kpi('Savings transfers', money(values.savings), 'lock-closed', '#9e7eb5'),
        kpi('Balance from records', money(values.remaining), 'card-outline', '#9e7eb5'),
      ],
      debt: {
        cycleLabel: this.budgetReportCycle(range, selectedMonth),
        empty: !this.budget.debts().length,
        kpis: [
          kpi('Total outstanding', money(debt.outstanding), 'wallet', '#4774b6'),
          kpi('Credit opening', money(debt.creditOpening), 'card-outline', '#9e7eb5'),
          kpi('Credit payments this cycle', money(debt.creditPaid), 'checkmark', '#c4a4da'),
          kpi('Estimated credit interest', money(debt.creditInterest), 'document-text', '#617085'),
          kpi('Credit remaining', money(debt.credit), 'card-outline', '#9e7eb5'),
          kpi('Loans', money(debt.loans), 'cash', '#7f5d99'),
          kpi('Other debt', money(debt.other), 'document-text', '#617085'),
          kpi('Paid in selected period', money(debt.repaid), 'checkmark', '#c4a4da'),
          kpi('Planned payments', money(debt.planned), 'calendar', '#bd934d'),
        ],
        balances: {
          type: 'bar',
          data: {
            labels: debt.rows.map((row) => row.name),
            datasets: [
              {
                label: 'Outstanding',
                data: debt.rows.map((row) => row.closing),
                backgroundColor: '#9e7eb5',
                borderRadius: 5,
              },
            ],
          },
          options: chartOptions(true),
        },
        repayments: {
          type: 'bar',
          data: {
            labels: labels(months),
            datasets: [
              { label: 'Paid', data: debt.monthly, backgroundColor: '#c4a4da', borderRadius: 5 },
            ],
          },
          options: chartOptions(true),
        },
      },
      primaryTitle: 'Income, spending & savings',
      secondaryTitle: 'Balance from records by cycle',
      primary: {
        type: 'bar',
        data: {
          labels: grouped.map((x) =>
            new Date(x.month + '-01T12:00:00').toLocaleDateString('en-ZA', {
              month: 'short',
              year: '2-digit',
            }),
          ),
          datasets: [
            {
              label: 'Income',
              data: grouped.map((x) => x.income),
              backgroundColor: '#20b875',
              borderRadius: 5,
            },
            {
              label: 'Actual spending',
              data: grouped.map((x) => x.expenses),
              backgroundColor: '#ef4f5f',
              borderRadius: 5,
            },
            {
              label: 'Savings transfers',
              data: grouped.map((x) => x.savings),
              backgroundColor: '#7f5d99',
              borderRadius: 5,
            },
          ],
        },
        options: chartOptions(true),
      },
      secondary: {
        type: 'line',
        data: {
          labels: grouped.map((x) =>
            new Date(x.month + '-01T12:00:00').toLocaleDateString('en-ZA', {
              month: 'short',
              year: '2-digit',
            }),
          ),
          datasets: [
            {
              label: 'Balance from records',
              data: grouped.map((x) => x.remaining),
              borderColor: '#7f5d99',
              backgroundColor: '#7f5d9922',
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: chartOptions(true),
      },
      insight: `Balance from records = income minus spending minus savings transfers. Spending includes bills and paid debt payments. Unpaid plans are excluded. Each point is a cycle total, not a cumulative bank balance.`,
    };
  }
}
