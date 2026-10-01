import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext, signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BooksLibrary } from './books-library';
import { BookStore } from '../../shared/state/books/book-store';
import { BookRecord } from '../../shared/state/books/book.model';
import { ReadingGoalService } from '../../shared/state/books/reading-goal.service';
import { RefreshCoordinator } from '../../shared/state/refresh/refresh-coordinator.service';

describe('Reading progress editor', () => {
  const book = { id: 'book-1', title: 'Test Book', status: 'Reading', pageCount: 657, pageProgress: 266, progress: 40 } as BookRecord;
  const books = signal([book]);
  const setReadingPosition = vi.fn();
  const setReadingProgress = vi.fn();
  const saveBook = vi.fn();
  const create = () => runInInjectionContext(Injector.create({ providers: [
    { provide: BookStore, useValue: { books, sortedBooks: books, setReadingPosition, setReadingProgress, saveBook } },
    { provide: ReadingGoalService, useValue: { get: vi.fn().mockResolvedValue(null) } },
    { provide: RefreshCoordinator, useValue: { register: () => () => {} } },
    { provide: DestroyRef, useValue: { onDestroy: vi.fn() } },
  ] }), () => new BooksLibrary());
  beforeEach(() => { vi.resetAllMocks(); books.set([book]); });
  it('only saves edited pages when confirmed', async () => {
    const page = create(); page.openProgress(book); page.progressInput.set('300');
    expect(setReadingPosition).not.toHaveBeenCalled();
    await page.saveProgress();
    expect(setReadingPosition).toHaveBeenCalledWith(book.id, 300, 657);
    expect(page.progressBook()).toBeNull();
  });
  it.each(['', '-1', '658', '1.5', 'abc'])('rejects invalid page input %s', async value => {
    const page = create(); page.openProgress(book); page.progressInput.set(value); await page.saveProgress();
    expect(setReadingPosition).not.toHaveBeenCalled(); expect(page.progressError()).not.toBe('');
  });
  it('converts a percentage into pages for a print book', async () => {
    const page = create(); page.openProgress(book); page.changeProgressMode('percent'); page.progressInput.set('50');
    await page.saveProgress(); expect(setReadingPosition).toHaveBeenCalledWith(book.id, 329, 657);
  });
  it('saves percentage progress when no page count is available', async () => {
    const audio = { ...book, pageCount: 0 }; books.set([audio]);
    const page = create(); page.openProgress(audio); page.progressInput.set('65'); await page.saveProgress();
    expect(setReadingProgress).toHaveBeenCalledWith(book.id, 65);
  });
  it('keeps the editor and input after a failed save', async () => {
    setReadingPosition.mockRejectedValue(new Error('Offline'));
    const page = create(); page.openProgress(book); page.progressInput.set('300'); await page.saveProgress();
    expect(page.progressBook()).toBe(book); expect(page.progressError()).toBe('Offline'); expect(page.progressSaving()).toBe(false);
  });
  it('finishes the book in one save with completion date and full progress', async () => {
    const page = create(); page.openProgress(book); await page.saveProgress(true);
    expect(saveBook).toHaveBeenCalledWith(expect.objectContaining({ status: 'Finished', progress: 100, pageProgress: 657, finishDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), yearRead: new Date().getFullYear() }), book.id);
    expect(setReadingPosition).not.toHaveBeenCalled();
  });
});
