import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { StatsService } from './stats.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { BudgetStore } from '../budget/budget.store';
import { BookStore } from '../books/book-store';
import { RefuelStore } from '../refuels/refuel-store';
import { cycleMonth, inCycle } from '../budget/budget-cycle';
describe('Selected month reports', () => {
  const year = new Date().getFullYear();
  const service = () =>
    runInInjectionContext(
      Injector.create({
        providers: [
          {
            provide: NutritionService,
            useValue: {
              logs: () => [
                {
                  date: `${year}-01-10`,
                  nutrition: { calories: 100, protein: 1, carbs: 2, fat: 3 },
                },
                {
                  date: `${year}-12-10`,
                  nutrition: { calories: 900, protein: 9, carbs: 2, fat: 3 },
                },
              ],
              profile: () => ({ targets: { calories: 2000, protein: 100, carbs: 200, fat: 60 } }),
            },
          },
          { provide: RefuelStore, useValue: { entries: () => [] } },
          {
            provide: BookStore,
            useValue: {
              books: () => [
                {
                  status: 'Finished',
                  finishDate: `${year}-01-15`,
                  yearRead: year,
                  category: 'Fantasy',
                },
                {
                  status: 'Finished',
                  finishDate: `${year}-12-15`,
                  yearRead: year,
                  category: 'History',
                },
              ],
            },
          },
          {
            provide: BudgetStore,
            useValue: {
              month: () => `${year}-10`,
              cycleStartDay: () => 25,
              cycleLabel: () => 'current cycle',
              transactions: () => [
                {
                  id: 'jan',
                  date: `${year}-01-10`,
                  type: 'expense',
                  amount: 100,
                  categoryId: 'food',
                },
                {
                  id: 'dec',
                  date: `${year}-12-10`,
                  type: 'expense',
                  amount: 900,
                  categoryId: 'food',
                },
              ],
              categories: () => [],
              debts: () => [],
              monthForDate: (date: string) => cycleMonth(date, 25),
              inMonth: (date: string, month: string) => inCycle(date, month, 25),
            },
          },
        ],
      }),
      () => new StatsService(),
    );
  it('filters nutrition to the chosen month independently of custom range inputs', () => {
    const stats = service();
    stats.nutritionStart = `${year}-12-01`;
    expect(stats.dashboard('nutrition', '1M', `${year}-01`).kpis[0].value).toBe('100 kcal');
    expect(stats.dashboard('nutrition', '1M', `${year}-12`).kpis[0].value).toBe('900 kcal');
  });
  it('uses the selected month for fuel charts and completed books', () => {
    const stats = service();
    expect(stats.dashboard('fuel', '1M', `${year}-01`).secondary.data.labels).toEqual(['Jan']);
    const books = stats.dashboard('books', '1M', `${year}-12`);
    expect(books.primary.data.labels).toEqual(['Dec']);
    expect(books.primary.data.datasets[0].data).toEqual([1]);
    expect(books.secondary.data.labels).toEqual(['History']);
  });
  it('selects budget totals and cycle labels without changing the global budget month', () => {
    const stats = service();
    expect(stats.dashboard('budget', '1M', `${year}-01`).primary.data.datasets[1].data).toEqual([
      100,
    ]);
    expect(stats.dashboard('budget', '1M', `${year}-12`).primary.data.datasets[1].data).toEqual([
      900,
    ]);
    expect(stats.budgetReportCycle('1M', `${year}-01`)).toBe(`${year - 1}-12-25 - ${year}-01-24`);
    expect(stats.budgetReportCycle('3M', `${year}-01`)).toBe('current cycle');
  });
});
