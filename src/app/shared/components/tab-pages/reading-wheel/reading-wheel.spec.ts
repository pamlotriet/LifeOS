import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookRecord } from '../../../state/books/book.model';
import { BookStore } from '../../../state/books/book-store';
import { ReadingWheel } from './reading-wheel';

describe('Reading wheel selections', () => {
  const books = signal<BookRecord[]>([]);
  const loading = signal(false);
  const setWheelSelected = vi.fn();
  const book = (id: string, selected: boolean, status = 'Not Started') => ({ id, title: id, author: 'Author', category: 'Fiction', status, wheelSelected: selected } as BookRecord);

  beforeEach(async () => {
    books.set([book('one', true), book('two', true), book('three', false), book('finished', true, 'Finished')]);
    loading.set(false);
    setWheelSelected.mockReset().mockImplementation(async (id: string, selected: boolean) => {
      books.update(items => items.map(item => item.id === id ? { ...item, wheelSelected: selected } : item));
    });
    await TestBed.configureTestingModule({ imports: [ReadingWheel], providers: [provideRouter([]),
      { provide: BookStore, useValue: { books, sortedBooks: books, loading, error: signal(''), setWheelSelected } },
    ] }).compileComponents();
  });

  it('deselects every selected eligible book and clears the wheel', async () => {
    const fixture = TestBed.createComponent(ReadingWheel);
    await fixture.whenStable();
    await fixture.componentInstance.deselectAll();
    expect(setWheelSelected.mock.calls).toEqual([['one', false], ['two', false]]);
    expect(fixture.componentInstance.selected()).toEqual([]);
    expect(fixture.componentInstance.spinBooks()).toEqual([]);
    expect(books().find(item => item.id === 'finished')?.wheelSelected).toBe(true);
  });

  it('shows saving feedback and prevents another action while adding a book', async () => {
    let finish!: () => void;
    setWheelSelected.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const fixture = TestBed.createComponent(ReadingWheel);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page.showManage();
    const pending = page.setSelected(books()[2], true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.wheel-saving')?.textContent).toContain('Adding three');
    page.showWheel();
    expect(page.mode()).toBe('manage');
    await page.deselectAll();
    expect(setWheelSelected).toHaveBeenCalledTimes(1);
    finish();
    await pending;
    expect(page.busy()).toBe(false);
  });

  it('shows skeletons instead of an empty wheel while books load', async () => {
    loading.set(true);
    const fixture = TestBed.createComponent(ReadingWheel);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.wheel-loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.wheel-spin')).toBeNull();
    loading.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.wheel-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('.wheel-spin')).toBeTruthy();
  });

  it('clears saving feedback and reports a failed bulk update', async () => {
    setWheelSelected.mockRejectedValueOnce(new Error('Offline'));
    const fixture = TestBed.createComponent(ReadingWheel);
    await fixture.whenStable();
    await fixture.componentInstance.deselectAll();
    expect(fixture.componentInstance.error()).toBe('Offline');
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(fixture.componentInstance.selected()).toHaveLength(2);
  });
});
