import { describe, expect, it } from 'vitest';
import { statsAnchor, statsMonthOptions, statsMonths, sumByMonth } from './stats.calculations';

describe('Stats calculations', () => {
  it('creates chronological month windows across year boundaries', () => {
    expect(statsMonths('3M', new Date(2026, 0, 15))).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(statsMonths('1Y', new Date(2026, 0, 15))).toHaveLength(12);
  });

  it('limits 1M to the selected month, including January', () => {
    expect(statsMonths('1M', new Date(2026, 9, 15))).toEqual(['2026-10']);
    expect(statsMonths('1M', new Date(2026, 0, 15))).toEqual(['2026-01']);
  });

  it('groups actual records by ISO month and preserves amounts', () => {
    const values = sumByMonth(
      [
        { date: '2026-09-01', amount: 20.5 },
        { date: '2026-09-30', amount: 4.5 },
        { date: '2026-10-01', amount: 10 },
      ],
      (row) => row.date,
      (row) => row.amount,
    );
    expect([...values]).toEqual([
      ['2026-09', 25],
      ['2026-10', 10],
    ]);
  });
  it('offers all twelve months of the current year and validates selected months', () => {
    const now = new Date(2026, 9, 18);
    expect(statsMonthOptions(now)).toHaveLength(12);
    expect(statsMonthOptions(now)[0].value).toBe('2026-01');
    expect(statsMonthOptions(now)[11].value).toBe('2026-12');
    expect(statsMonths('1M', statsAnchor('1M', '2026-01', now))).toEqual(['2026-01']);
    expect(statsMonths('1M', statsAnchor('1M', '2026-12', now))).toEqual(['2026-12']);
    for (const invalid of ['2025-12', '2026-13', 'bad'])
      expect(statsAnchor('1M', invalid, now)).toBe(now);
    expect(statsAnchor('3M', '2026-01', now)).toBe(now);
  });
});
