import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { BookTags } from './book-tags';
import { BookStore } from '../../shared/state/books/book-store';

describe('Book tag browsing', () => {
  function fixture() {
    const store = {
      tags: signal([
        { id: 'cozy', name: 'Cozy', type: 'mood', color: '#29d9eb' },
        { id: 'average', name: 'Average', type: 'mood', color: '#8c5cf6' },
        { id: 'adventure', name: 'Adventure', type: 'genre', color: '#36c98c' },
      ]),
      books: signal([
        { moodTagIds: ['cozy'], genreTagIds: ['adventure'] },
        { moodTagIds: ['cozy', 'average'], genreTagIds: [] },
      ]),
    };
    const page = runInInjectionContext(
      Injector.create({ providers: [{ provide: BookStore, useValue: store }] }),
      () => new BookTags(),
    );
    return { page, store };
  }
  it('filters by type and search while preserving collection counts', () => {
    const { page } = fixture();
    page.search.set(' COZ ');
    expect(page.visible().map((tag) => tag.id)).toEqual(['cozy']);
    expect(page.moodCount()).toBe(2);
    expect(page.genreCount()).toBe(1);
    page.search.set('');
    page.type.set('genre');
    expect(page.visible().map((tag) => tag.id)).toEqual(['adventure']);
  });
  it('sorts alphabetically in either direction and by book usage', () => {
    const { page } = fixture();
    expect(page.visible().map((tag) => tag.id)).toEqual(['average', 'cozy']);
    page.sort.set('za');
    expect(page.visible().map((tag) => tag.id)).toEqual(['cozy', 'average']);
    page.sort.set('books');
    expect(page.visible().map((tag) => tag.id)).toEqual(['cozy', 'average']);
    expect(page.count(page.visible()[0])).toBe(2);
  });
});
