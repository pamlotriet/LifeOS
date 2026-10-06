import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { parseBudgetNumber } from './budget-number';

describe('Budget number parsing', () => {
  it('accepts decimal commas and grouped amounts', () => {
    expect(parseBudgetNumber('90,50')).toBe(90.5);
    expect(parseBudgetNumber('1,000')).toBe(1000);
    expect(parseBudgetNumber('1,234.56')).toBe(1234.56);
    expect(parseBudgetNumber('1.234,56')).toBe(1234.56);
    expect(parseBudgetNumber('1 234,56')).toBe(1234.56);
    expect(parseBudgetNumber('0,00')).toBe(0);
  });
  it('preserves empty values and rejects invalid numbers', () => {
    expect(parseBudgetNumber('')).toBeNull();
    expect(parseBudgetNumber('abc')).toBeNaN();
    expect(parseBudgetNumber('1,2,3')).toBeNaN();
  });
});
