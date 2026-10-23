import { describe, expect, it } from 'vitest';
import { buildBookStats } from './book-stats';
import { BookRecord } from '../books/book.model';

const book = (overrides: Partial<BookRecord>): BookRecord =>
  ({
    status: 'Finished',
    author: 'Author',
    category: 'Fantasy',
    pageCount: 300,
    rating: 4,
    copies: [{ id: 'copy', format: 'Paperback', label: '' }],
    ...overrides,
  }) as BookRecord;
const now = new Date(2026, 9, 23);
describe('Book statistics', () => {
  it('filters finished totals, authors, categories and pages to the selected range', () => {
    const data = buildBookStats(
      [
        book({ finishDate: '2026-10-10' }),
        book({ finishDate: '2026-09-10', author: 'Earlier author', category: 'History' }),
        book({ finishDate: '2025-10-10' }),
        book({ status: 'Reading', pageProgress: 40 }),
      ],
      '1M',
      '2026-10',
      now,
    );
    expect(data.primary.data.datasets[0].data).toEqual([1]);
    expect(data.books?.totalPages).toBe('300');
    expect(data.books?.authors.map((r) => r.label)).toEqual(['Author']);
    expect(data.secondary.data.labels).toEqual(['Fantasy']);
    expect(data.books?.cards[1].value).toBe('2');
    expect(data.books?.formats[0].value).toBe(4);
  });
  it('includes older and undated finished books in all-time totals and calculates dated streaks', () => {
    const data = buildBookStats(
      [
        book({ finishDate: '2022-01-01' }),
        book({ finishDate: '2026-10-10', startDate: '2026-10-08' }),
        book({ finishDate: '2026-10-11' }),
        book({ finishDate: '2026-10-11' }),
        book({ finishDate: '' }),
      ],
      'All',
      undefined,
      now,
    );
    expect(data.books?.totalFinished).toBe(5);
    expect(data.books?.totalPages).toBe('1,500');
    expect(data.books?.streak).toBe(2);
    expect(data.books?.cards[5].value).toBe('2');
  });
  it('handles an empty library without invalid chart values', () => {
    const data = buildBookStats([], '6M', undefined, now);
    expect(data.empty).toBe(true);
    expect(data.books?.bestCount).toBe(0);
    expect(data.books?.cards[5].value).toBe('—');
    expect(data.primary.data.datasets[0].data).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
