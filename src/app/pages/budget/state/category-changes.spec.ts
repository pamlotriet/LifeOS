import '@angular/compiler';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { BudgetStore } from './budget.store';
import { BudgetCategory, BudgetPlan, BudgetTransaction } from './budget.model';

function setup() {
  const category: BudgetCategory = { id:'food', name:'Food', type:'expense', icon:'wallet', colour:'#768bad', order:0 };
  const transaction = { id:'one', type:'expense', categoryId:'food', amount:100 } as BudgetTransaction;
  const saveCategory = vi.fn(async (value: BudgetCategory) => value);
  const store = Object.create(BudgetStore.prototype) as BudgetStore;
  Object.assign(store, { service:{saveCategory}, auth:{userId:()=> 'user'}, generation:0, loading:signal(false), error:signal(''), categories:signal([category]), transactions:signal([transaction]), plans:signal<BudgetPlan[]>([]), activeCategories:()=>store.categories().filter(item=>!item.deleted) });
  return {store, category, saveCategory};
}

describe('Category changes', () => {
  it('switches expense to bills without changing historical transactions', async () => {
    const {store, category}=setup();
    await store.saveCategory({...category,type:'bills'});
    expect(store.categories()[0].type).toBe('bills');
    expect(store.transactions()[0]).toMatchObject({type:'expense',amount:100});
  });
  it('hides a used category while retaining its original type and history', async () => {
    const {store, category}=setup();
    await store.deleteCategory({...category,type:'income',name:'Unsaved edit'});
    expect(store.activeCategories()).toEqual([]);
    expect(store.categories()[0]).toMatchObject({deleted:true,type:'expense',name:'Food'});
    expect(store.transactions()).toHaveLength(1);
  });
  it('rejects incompatible type changes before writing', async () => {
    const {store,category,saveCategory}=setup();
    await expect(store.saveCategory({...category,type:'income'})).rejects.toThrow('does not match');
    expect(saveCategory).not.toHaveBeenCalled();
  });
  it('allows an unused category to change type but preserves expense plans', async () => {
    const {store,category}=setup(); store.transactions.set([]);
    store.plans.set([{id:'plan',month:'2026-10',categoryId:'food',amount:100}]);
    await expect(store.saveCategory({...category,type:'income'})).rejects.toThrow('planned items');
    await store.saveCategory({...category,type:'savings'});
    expect(store.categories()[0].type).toBe('savings');
    store.plans.set([]);
    await store.saveCategory({...category,type:'income'});
    expect(store.categories()[0].type).toBe('income');
  });
});
