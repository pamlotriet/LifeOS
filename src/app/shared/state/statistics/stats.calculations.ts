import { StatsRange } from './stats.service';

/** Returns ISO year-month keys ending at the supplied date for predictable charts. */
export function statsMonths(range: StatsRange, now = new Date()): string[] {
  const count = range === '3M' ? 3 : range === '6M' ? 6 : range === '1Y' ? 12 : 24;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + 1 + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

export function sumByMonth<T>(items: T[], key: (item: T) => string, value: (item: T) => number): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of items) {
    const month = key(item).slice(0, 7);
    result.set(month, (result.get(month) ?? 0) + value(item));
  }
  return result;
}
