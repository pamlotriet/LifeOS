import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetTransactions } from './budget-ui';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetTransaction } from '../../shared/state/budget/budget.model';

describe('Transaction deletion', () => {
  const deleteTransaction = vi.fn();
  const item = { id: 'expense-1', title: 'Groceries', amount: 300, type: 'expense' } as BudgetTransaction;
  const create = () => runInInjectionContext(Injector.create({ providers: [{ provide: BudgetStore, useValue: { deleteTransaction } }] }), () => new BudgetTransactions());
  beforeEach(() => vi.resetAllMocks());
  it('waits for confirmation before deleting', async () => {
    const list = create(); list.requestDelete(item);
    expect(deleteTransaction).not.toHaveBeenCalled();
    await list.remove();
    expect(deleteTransaction).toHaveBeenCalledWith(item);
    expect(list.pending()).toBeNull();
  });
  it('does nothing after cancelling', async () => {
    const list = create(); list.requestDelete(item); list.pending.set(null); await list.remove();
    expect(deleteTransaction).not.toHaveBeenCalled();
  });
  it('keeps confirmation open for retry after a failure', async () => {
    deleteTransaction.mockRejectedValue(new Error('Offline'));
    const list = create(); list.requestDelete(item); await list.remove();
    expect(list.pending()).toBe(item); expect(list.deleteError()).toBe('Offline'); expect(list.deleting()).toBe(false);
  });
  it('prevents duplicate requests while deletion is pending', async () => {
    let finish!: () => void;
    deleteTransaction.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const list = create(); list.requestDelete(item); const pending = list.remove(); await list.remove();
    expect(deleteTransaction).toHaveBeenCalledTimes(1); finish(); await pending;
  });
});
