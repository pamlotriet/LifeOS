import { describe, expect, it } from 'vitest';
import { BookRecord } from '../../shared/state/books/book.model';
import { finishDateParts } from './finished-books-filter';

const book = (status: BookRecord['status'], finishDate: string) => ({ status, finishDate }) as BookRecord;

describe('finishDateParts', () => {
  it('returns the completion year and month for a finished book', () => {
    expect(finishDateParts(book('Finished', '2026-09-22'))).toEqual({ year: 2026, month: 9 });
  });

  it('excludes unfinished books and invalid completion dates', () => {
    expect(finishDateParts(book('Reading', '2026-09-22'))).toBeNull();
    expect(finishDateParts(book('Finished', ''))).toBeNull();
    expect(finishDateParts(book('Finished', '2026-13-01'))).toBeNull();
  });
});
