import { describe, expect, it } from 'vitest';
import { cycleBounds, cycleMonth, inCycle } from './budget-cycle';
import { debtSummary } from './budget.model';

describe('Budget cycles', () => {
  it('assigns payday transactions to the next named budget month', () => {
    expect(cycleMonth('2026-09-27',28)).toBe('2026-09');
    expect(cycleMonth('2026-09-28',28)).toBe('2026-10');
    expect(cycleBounds('2026-10',28)).toEqual({start:'2026-09-28',end:'2026-10-27',endExclusive:'2026-10-28'});
    expect(inCycle('2026-10-28','2026-10',28)).toBe(false);
    expect(inCycle('2026-10-28','2026-11',28)).toBe(true);
  });
  it('preserves calendar months by default and handles year boundaries', () => {
    expect(cycleBounds('2026-10',1)).toEqual({start:'2026-10-01',end:'2026-10-31',endExclusive:'2026-11-01'});
    expect(cycleMonth('2026-12-28',28)).toBe('2027-01');
  });
  it('clamps payday to the end of short and leap-year months without gaps', () => {
    expect(cycleBounds('2026-03',31)).toEqual({start:'2026-02-28',end:'2026-03-30',endExclusive:'2026-03-31'});
    expect(cycleBounds('2028-03',31).start).toBe('2028-02-29');
    expect(cycleMonth('2026-02-28',31)).toBe('2026-03');
    expect(cycleMonth('2026-02-27',31)).toBe('2026-02');
  });
  it('counts debt repayments in the selected pay cycle', () => {
    const debt = {id:'loan',name:'Loan',type:'loan' as const,openingBalance:1000,annualInterestRate:0,openingOverride:null};
    const payments = [{id:'payment',type:'expense' as const,categoryId:'debt',debtId:'loan',amount:100,title:'Payment',date:'2026-09-28',paymentMethod:'Bank',notes:'',receiptUrl:'',receiptPath:''}];
    expect(debtSummary(debt,payments,'2026-10',28)).toMatchObject({opening:1000,monthPaid:100,closing:900});
    expect(debtSummary(debt,payments,'2026-09',28).monthPaid).toBe(0);
  });
});
