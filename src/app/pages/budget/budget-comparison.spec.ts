import '@angular/compiler';
import { computed, Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { BudgetComparison } from './budget-comparison';
import { BudgetStore } from '../../shared/state/budget/budget.store';
import { BudgetTransaction, DEFAULT_CATEGORIES } from '../../shared/state/budget/budget.model';

function fixture() {
  const month = signal('2026-10');
  const payments: BudgetTransaction[] = [{ id:'food',categoryId:'food',amount:50,type:'expense',date:'2026-10-10',title:'Groceries',paymentMethod:'Card',notes:'',receiptUrl:'',receiptPath:'' },{ id:'save',categoryId:'savings',amount:100,type:'transfer',date:'2026-10-10',title:'Emergency fund',paymentMethod:'Bank transfer',notes:'',receiptUrl:'',receiptPath:'' }];
  const store = { month, categories:signal(DEFAULT_CATEGORIES), plans:signal([{id:'food-plan',month:'2026-10',categoryId:'food',name:'Groceries',amount:40}]), transactions:signal(payments), cycleStartDay:signal(1), monthly:computed(()=>payments.filter(t=>t.date.startsWith(month()))) };
  const page=runInInjectionContext(Injector.create({providers:[{provide:BudgetStore,useValue:store}]}),()=>new BudgetComparison());
  return { page, store };
}
describe('Interactive category comparison',()=>{
  it('combines search, status filter and sorting without changing overall totals',()=>{
    const {page}=fixture();
    page.filter.set('over');page.search.set('FOOD');page.sort.set('spent');
    expect(page.groups()[0].rows.map(r=>r.id)).toEqual(['food']);
    expect(page.totals()).toEqual({planned:40,actual:50});
    page.search.set('transport');expect(page.groups()[0].rows).toEqual([]);
    expect(page.totals()).toEqual({planned:40,actual:50});
  });
  it('reveals matching planned items and payments, and closes details when changing month',()=>{
    const {page,store}=fixture();
    page.toggleCategory('food');
    expect(page.details().plans.map(p=>p.id)).toEqual(['food-plan']);
    expect(page.details().payments.map(p=>p.id)).toEqual(['food']);
    page.toggleCategory('savings');expect(page.details().payments.map(p=>p.id)).toEqual(['save']);
    page.shiftMonth(1);expect(store.month()).toBe('2026-11');expect(page.expanded()).toBeNull();expect(page.details().payments).toEqual([]);
  });
});
