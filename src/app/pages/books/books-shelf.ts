import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BOOK_FORMATS } from '../../shared/state/books/book.model';
import { BookStore } from '../../shared/state/books/book-store';
import { AppSkeleton } from '../../shared/components/app-skeleton/app-skeleton';

@Component({
  selector: 'app-books-shelf',
  imports: [IonContent, IonIcon, PageHeader, RouterLink, AppSkeleton],
  templateUrl: './books-shelf.html',
})
export class BooksShelf {
  readonly store = inject(BookStore);
  readonly formats = BOOK_FORMATS;
  readonly search = signal('');
  readonly format = signal('All');
  readonly view = signal<'covers' | 'list'>('covers');
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.store.sortedBooks().filter((book) =>
      (this.format() === 'All' || book.copies.some((copy) => copy.format === this.format())) &&
      (!query || [book.title, book.author, book.category, book.seriesName].some((part) => part.toLowerCase().includes(query))),
    );
  });
}
