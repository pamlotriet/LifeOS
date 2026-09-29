import { describe, expect, it } from 'vitest';
import { statsMonths, sumByMonth } from './stats.calculations';

describe('Stats calculations', () => {
  it('creates chronological month windows across year boundaries', () => {
    expect(statsMonths('3M', new Date(2026, 0, 15))).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(statsMonths('1Y', new Date(2026, 0, 15))).toHaveLength(12);
  });

  it('groups actual records by ISO month and preserves amounts', () => {
    const values = sumByMonth([{ date: '2026-09-01', amount: 20.5 }, { date: '2026-09-30', amount: 4.5 }, { date: '2026-10-01', amount: 10 }], row => row.date, row => row.amount);
    expect([...values]).toEqual([['2026-09', 25], ['2026-10', 10]]);
  });
});
