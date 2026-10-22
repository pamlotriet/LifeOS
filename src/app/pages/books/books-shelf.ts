import { AddBookSheet } from './add-book-sheet.service';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, arrowBackOutline, bookmarkOutline, bookOutline, checkmarkOutline, heartOutline, searchOutline } from 'ionicons/icons';
import { kindleSummary } from '../../shared/state/books/book.model';
import { BookStore } from '../../shared/state/books/book-store';

@Component({
  selector: 'app-books-shelf',
  imports: [IonContent, IonIcon, RouterLink],
  templateUrl: './books-shelf.html',
  styleUrls: ['./books-loading.css', './books-shelf.css'],
})
export class BooksShelf {
  readonly kindleSummary = kindleSummary;
  readonly addBookSheet = inject(AddBookSheet);
  readonly store = inject(BookStore);
  readonly search = signal('');
  readonly status = signal('All books');
  readonly filters = ['All books', 'Reading', 'Want to read', 'Finished', 'Favourites'];
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.status();
    return this.store.sortedBooks().filter((book) =>
      (status === 'All books' || (status === 'Favourites' ? book.favourite : book.status === (status === 'Want to read' ? 'Not Started' : status))) &&
      (!query || [book.title, book.author, book.category, book.seriesName].some((part) => part.toLowerCase().includes(query))),
    );
  });

  constructor() {
    addIcons({ addOutline, arrowBackOutline, bookmarkOutline, bookOutline, checkmarkOutline, heartOutline, searchOutline });
  }
}
