import { describe, expect, it } from 'vitest';
import { BudgetPlan, BudgetTransaction, DEFAULT_CATEGORIES } from '../../shared/state/budget/budget.model';
import { budgetSnapshot, budgetSpending } from './budget-snapshot';
const tx=(amount:number,type:BudgetTransaction['type'],categoryId:string,extra:Partial<BudgetTransaction>={}):BudgetTransaction=>({id:'t',title:'Test',date:'2026-10-10',paymentMethod:'Card',notes:'',receiptUrl:'',receiptPath:'',amount,type,categoryId,...extra});
const plan:BudgetPlan={id:'p',month:'2026-10',categoryId:'food',amount:1000};
describe('Budget snapshot',()=>{
 it('subtracts only unspent category plans and unpaid debt commitments',()=>{
  const rows=[tx(5000,'income','salary'),tx(400,'expense','food'),tx(200,'expense','other',{debtId:'loan'}),tx(300,'expense','other',{debtId:'loan',paymentStatus:'planned'}),tx(500,'transfer','savings')];
  expect(budgetSnapshot(rows,DEFAULT_CATEGORIES,[plan],'2026-10',1)).toMatchObject({income:5000,expenses:600,savings:500,remaining:3900,categoryCommitments:600,debtCommitments:300,afterPlans:3000});
 });
 it('preserves savings when the category is unavailable and retains negative balances',()=>{
  expect(budgetSnapshot([tx(20.05,'transfer','deleted')],[],[],'2026-10',1)).toMatchObject({savings:20.05,remaining:-20.05,afterPlans:-20.05,outflowPercent:null});
 });
 it('does not use overspending in one category to cancel another plan',()=>{
  const plans=[plan,{...plan,id:'p2',categoryId:'home',amount:200}];
  expect(budgetSnapshot([tx(1200,'expense','food')],DEFAULT_CATEGORIES,plans,'2026-10',1).categoryCommitments).toBe(200);
 });
 it('uses the selected pay cycle and excludes payments outside it',()=>{
  const rows=[tx(100,'income','salary',{date:'2026-09-28'}),tx(999,'income','salary',{date:'2026-10-28'})];
  expect(budgetSnapshot(rows,DEFAULT_CATEGORIES,[],'2026-10',28).income).toBe(100);
 });
 it('reconciles the spending chart even when categories are missing',()=>{
  const result=budgetSpending([tx(.1,'expense','food'),tx(.2,'expense','missing'),tx(100,'expense','other',{paymentStatus:'planned',debtId:'d'}),tx(50,'transfer','savings')],DEFAULT_CATEGORIES);
  expect(result.map(x=>x.amount)).toEqual([.2,.1]);expect(result[0].name).toBe('Uncategorised');
 });
});
