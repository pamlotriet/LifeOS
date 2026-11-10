import '@angular/compiler';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { BudgetStore } from './budget.store';
import { BudgetPlan, DEFAULT_CATEGORIES } from './budget.model';

function fixture() {
  const store = Object.create(BudgetStore.prototype) as BudgetStore;
  const savePlan = vi.fn(async (plan: BudgetPlan) => plan);
  Object.assign(store, { service: { savePlan }, auth: { userId: () => 'user' }, generation: 0, loading: signal(false), error: signal(''), activeCategories: () => DEFAULT_CATEGORIES, plans: signal<BudgetPlan[]>([
    { id: 'rent', month: '2026-12', categoryId: 'home', name: 'Rent', amount: 5000.50 },
    { id: 'food', month: '2026-12', categoryId: 'food', name: 'Groceries', amount: 1000 },
    { id: 'existing', month: '2027-01', categoryId: 'home', name: 'Repairs', amount: 200 },
  ]) });
  return { store, savePlan };
}

describe('Copy category plans forward', () => {
  it('copies a single category across the year boundary, preserving source and destination items', async () => {
    const { store } = fixture();
    expect(await store.copyPlansToNextMonth('2026-12', 'home')).toEqual({ copied: 1, skipped: 0, month: '2027-01' });
    expect(store.plans()).toHaveLength(4);
    expect(store.plans().filter(p => p.month === '2027-01')).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Rent', amount: 5000.50, categoryId: 'home' }),
      expect.objectContaining({ id: 'existing', amount: 200 }),
    ]));
    const copied = store.plans().find(p => p.month === '2027-01' && p.name === 'Rent')!;
    await store.savePlanItem(copied.month, copied.categoryId, 'Edited rent', 6000, copied.id);
    expect(await store.copyPlansToNextMonth('2026-12', 'home')).toEqual({ copied: 0, skipped: 1, month: '2027-01' });
    expect(store.plans().find(p => p.id === copied.id)?.amount).toBe(6000);
  });
  it('retries partial failures without duplicating items already saved', async () => {
    const { store, savePlan } = fixture();
    savePlan.mockImplementationOnce(async plan => plan).mockRejectedValueOnce(new Error('Offline'));
    await expect(store.copyPlansToNextMonth('2026-12')).rejects.toThrow('Offline');
    expect(await store.copyPlansToNextMonth('2026-12')).toEqual({ copied: 1, skipped: 1, month: '2027-01' });
    expect(store.plans()).toHaveLength(5);
  });
});
