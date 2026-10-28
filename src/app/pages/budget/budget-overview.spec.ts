import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetOverview } from './budget-overview';

describe('Budget cycle navigation', () => {
  const create = () => {
    const store = { month: signal('2026-01'), cycleStartDay: signal(25) };
    const page = runInInjectionContext(Injector.create({ providers: [
      { provide: BudgetStore, useValue: store },
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
    ] }), () => new BudgetOverview());
    return { page, store };
  };
  it('opens the native month picker on the first click', () => {
    const { page } = create();
    const showPicker = vi.fn();
    page.openCyclePicker({ showPicker } as unknown as HTMLInputElement);
    expect(showPicker).toHaveBeenCalledOnce();
  });
  it('moves across year boundaries and clears the date filter', () => {
    const { page, store } = create();
    page.selectedDate.set('2025-12-28');
    page.shiftMonth(-1);
    expect(store.month()).toBe('2025-12');
    expect(page.selectedDate()).toBe('');
    page.shiftMonth(1);
    expect(store.month()).toBe('2026-01');
  });
  it('preserves the cycle when a month selection is cleared or invalid', () => {
    const { page, store } = create();
    page.setMonth('');
    page.setMonth('2026-13');
    expect(store.month()).toBe('2026-01');
  });
  it('keeps the field usable when a browser refuses to open the picker', () => {
    const { page } = create();
    const focus = vi.fn();
    page.openCyclePicker({ showPicker: () => { throw new Error('Unsupported'); }, focus } as unknown as HTMLInputElement);
    expect(focus).toHaveBeenCalledOnce();
  });
});
