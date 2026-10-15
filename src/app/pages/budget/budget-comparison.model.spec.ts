import { describe, expect, it } from 'vitest';
import { compareBudgetCategories } from './budget-comparison.model';
import { BudgetTransaction, DEFAULT_CATEGORIES, debtPlanId } from '../../shared/state/budget/budget.model';

const payment = (id: string, amount: number, extra = {}): BudgetTransaction => ({ id, amount, type:'expense', categoryId:'food', date:'2026-10-10', title:id, paymentMethod:'Card', notes:'', receiptUrl:'', receiptPath:'', ...extra });
describe('Planned category comparison', () => {
  it('aggregates plan items and actuals, excludes unpaid plans, and preserves cents', () => {
    const rows = compareBudgetCategories(DEFAULT_CATEGORIES,[{id:'a',month:'2026-10',categoryId:'food',amount:100.10},{id:'b',month:'2026-10',categoryId:'food',amount:50.20}], [payment('paid',120.25),payment('pending',200,{paymentStatus:'planned'})], '2026-10',1);
    expect(rows.find(r=>r.id==='food')).toMatchObject({planned:150.30,actual:120.25,difference:30.05,status:'Within plan'});
  });
  it('counts debt plans in their category once and keeps the planned amount after marking paid', () => {
    const debt = payment(debtPlanId('2026-10','loan'),50,{debtId:'loan',paymentStatus:'planned'});
    const compare = (t:BudgetTransaction) => compareBudgetCategories(DEFAULT_CATEGORIES,[],[t],'2026-10',1).find(r=>r.id==='food');
    expect(compare(debt)).toMatchObject({planned:50,actual:0});
    expect(compare({...debt,paymentStatus:'paid'})).toMatchObject({planned:50,actual:50,difference:0,status:'On plan'});
  });
  it('distinguishes missing plans, zero plans and overspending and uses payday cycles', () => {
    const rows=compareBudgetCategories(DEFAULT_CATEGORIES,[{id:'zero',month:'2026-10',categoryId:'home',amount:0}], [payment('unplanned',40,{date:'2026-09-28'}),payment('over',50,{categoryId:'home'}),payment('excluded',500,{date:'2026-10-28'})],'2026-10',28);
    expect(rows.find(r=>r.id==='food')).toMatchObject({actual:40,hasPlan:false,status:'Unplanned'});
    expect(rows.find(r=>r.id==='home')).toMatchObject({planned:0,actual:50,hasPlan:true,status:'Over plan'});
  });
  it('shows actual savings transfers separately and keeps archived categories with spending', () => {
    const rows=compareBudgetCategories(DEFAULT_CATEGORIES.map(c=>c.id==='food'?{...c,deleted:true}:c),[],[payment('food',25),payment('saving',100,{type:'transfer',categoryId:'savings'})],'2026-10',1);
    expect(rows.find(r=>r.id==='savings')).toMatchObject({type:'savings',actual:100});
    expect(rows.find(r=>r.id==='food')).toMatchObject({deleted:true,actual:25});
  });
});
