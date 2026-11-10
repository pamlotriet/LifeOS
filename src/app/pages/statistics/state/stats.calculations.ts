import { StatsRange } from './stats.service';

/** Returns ISO year-month keys ending at the supplied date for predictable charts. */
export function statsMonths(range: StatsRange, now = new Date()): string[] {
  const count =
    range === '1M' ? 1 : range === '3M' ? 3 : range === '6M' ? 6 : range === '1Y' ? 12 : 24;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + 1 + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

export function sumByMonth<T>(
  items: T[],
  key: (item: T) => string,
  value: (item: T) => number,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of items) {
    const month = key(item).slice(0, 7);
    result.set(month, (result.get(month) ?? 0) + value(item));
  }
  return result;
}

/** The 1M picker is restricted to the current local calendar year. */
export function statsMonthOptions(now = new Date()): { value: string; label: string }[] {
  return Array.from({ length: 12 }, (_, month) => ({
    value: `${now.getFullYear()}-${String(month + 1).padStart(2, '0')}`,
    label: new Date(now.getFullYear(), month, 1).toLocaleDateString('en-ZA', {
      month: 'long',
      year: 'numeric',
    }),
  }));
}
export function statsAnchor(range: StatsRange, selectedMonth?: string, now = new Date()): Date {
  if (range !== '1M' || !statsMonthOptions(now).some((m) => m.value === selectedMonth)) return now;
  return new Date(`${selectedMonth}-01T12:00:00`);
}
