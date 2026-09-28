import { BookRecord } from '../../shared/state/books/book.model';

export function finishDateParts(book: BookRecord): { year: number; month: number } | null {
  if (book.status !== 'Finished') return null;
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(book.finishDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}
