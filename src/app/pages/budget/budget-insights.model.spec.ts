import { describe, expect, it } from 'vitest';
import { budgetInsights } from './budget-insights.model';
import { BudgetDebt, BudgetTransaction, DEFAULT_CATEGORIES, debtPlanId, money } from '../../shared/state/budget/budget.model';

const transaction = (id: string, amount: number, type: BudgetTransaction['type'], date='2026-10-10', extra={}): BudgetTransaction => ({ id, amount, type, date, categoryId: type==='income'?'salary':'food', title:id, paymentMethod:'Bank transfer', notes:'', receiptUrl:'', receiptPath:'', ...extra });
const debt: BudgetDebt = { id:'loan', name:'Home loan', type:'loan', openingBalance:10000, openingOverride:null, annualInterestRate:0 };
describe('Personal budget insights', () => {
  it('shows a useful start state without inventing income or spending', () => {
    const cards=budgetInsights([],DEFAULT_CATEGORIES,[],[],'2026-10',1,'2026-10-15');
    expect(cards.map(c=>c.id)).toEqual(['start']);
  });
  it('subtracts only unspent plans from actual balance and counts pending debt once', () => {
    const cards=budgetInsights([
      transaction('income',1000.50,'income'), transaction('spent',100.10,'expense'),
      transaction(debtPlanId('2026-10','loan'),50.20,'expense','2026-10-20',{debtId:'loan',paymentStatus:'planned'}),
    ],DEFAULT_CATEGORIES,[{id:'food',categoryId:'food',month:'2026-10',amount:200.30}],[debt],'2026-10',1,'2026-10-15');
    expect(cards.find(c=>c.id==='plan')?.value).toBe(money(750));
    expect(cards.find(c=>c.id==='available')?.value).toBe(money(750));
    expect(cards.find(c=>c.id==='daily')?.value).toBe(money(44.12));
    expect(cards.find(c=>c.id==='due')?.value).toBe(money(50.20));
  });
  it('compares equal elapsed cycle days rather than a partial cycle with a full cycle', () => {
    const cards=budgetInsights([transaction('current',200,'expense'),transaction('previous',100,'expense','2026-09-10'),transaction('later',900,'expense','2026-09-25')],DEFAULT_CATEGORIES,[],[],'2026-10',1,'2026-10-15');
    expect(cards.find(c=>c.id==='change')?.value).toBe('+100%');
    expect(cards.find(c=>c.id==='income')).toBeDefined();
    expect(cards.find(c=>c.id==='daily')).toBeUndefined();
  });
  it('flags overspending and negative commitments without offering negative daily room', () => {
    const cards=budgetInsights([transaction('income',100,'income'),transaction('spent',150,'expense')],DEFAULT_CATEGORIES,[{id:'food',categoryId:'food',month:'2026-10',amount:80}],[],'2026-10',1,'2026-10-15');
    expect(cards.find(c=>c.id==='over')?.value).toBe(money(70));
    expect(cards.find(c=>c.id==='available')?.value).toBe(money(-50));
    expect(cards.find(c=>c.id==='daily')?.value).toBe(money(0));
  });
  it('does not show current-day guidance for historical or future cycles', () => {
    for (const month of ['2026-09','2026-11']) {
      const cards=budgetInsights([transaction('income',1000,'income',`${month}-10`)],DEFAULT_CATEGORIES,[],[debt],month,1,'2026-10-15');
      expect(cards.find(c=>c.id==='daily')).toBeUndefined();
      expect(cards.find(c=>c.id==='due')).toBeUndefined();
    }
  });
});
