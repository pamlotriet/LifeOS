import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookRecord, BOOK_CATEGORIES } from '../../shared/state/books/book.model';
import { BookStore } from '../../shared/state/books/book-store';

@Component({ selector: 'app-books-library', imports: [IonContent, IonIcon, PageHeader, RouterLink], templateUrl: './books-library.html' })
export class BooksLibrary {
  readonly store = inject(BookStore);
  readonly categories = BOOK_CATEGORIES;
  readonly search = signal('');
  readonly category = signal('All');
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    return this.store.sortedBooks().filter((book) =>
      (this.category() === 'All' || book.category === this.category()) &&
      (!query || [book.title, book.author, book.category, book.seriesName].some((part) => part.toLowerCase().includes(query))));
  });
  readonly readThisYear = computed(() => this.store.books().filter((book) => book.status === 'Finished' && book.finishDate.startsWith(String(new Date().getFullYear()))).length);
  readonly favourites = computed(() => this.store.books().filter((book) => book.favourite).length);
  readonly reading = computed(() => this.store.books().filter((book) => book.status === 'Reading').length);
  tags(book: BookRecord): string[] {
    const ids = new Set([...book.moodTagIds, ...book.genreTagIds]);
    return this.store.tags().filter((tag) => ids.has(tag.id)).map((tag) => tag.name);
  }
}
