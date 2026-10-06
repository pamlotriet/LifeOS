import { describe, expect, it } from 'vitest';
import { categoryPlanItems } from './budget.model';

describe('Category planned items', () => {
  it('sums named items and filters by category and month', () => {
    const result = categoryPlanItems([
      { id:'a', month:'2026-10', categoryId:'subscriptions', name:'Netflix', amount:90 },
      { id:'b', month:'2026-10', categoryId:'subscriptions', name:'Prime', amount:89 },
      { id:'c', month:'2026-09', categoryId:'subscriptions', amount:500 },
      { id:'d', month:'2026-10', categoryId:'groceries', amount:1000 },
    ], '2026-10', 'subscriptions');
    expect(result.amount).toBe(179);
    expect(result.items.map(item=>item.name)).toEqual(['Netflix','Prime']);
  });
  it('preserves existing totals and adds decimal amounts without rounding drift', () => {
    expect(categoryPlanItems([
      { id:'old', month:'2026-10', categoryId:'food', amount:200 },
      { id:'new', month:'2026-10', categoryId:'food', name:'Bread', amount:0.1 },
      { id:'new2', month:'2026-10', categoryId:'food', name:'Milk', amount:0.2 },
    ],'2026-10','food').amount).toBe(200.3);
    expect(categoryPlanItems([],'2026-10','food').amount).toBe(0);
  });
});
