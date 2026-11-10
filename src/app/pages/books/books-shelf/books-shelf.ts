import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AppInput } from '@shared/components/app-input/app-input';
import { AddBookSheet } from '@pages/books/book-form/add-book-sheet.service';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  bookmarkOutline,
  bookOutline,
  checkmarkOutline,
  heartOutline,
  searchOutline,
} from 'ionicons/icons';
import { kindleSummary } from '@pages/books/state/book.model';
import { BookStore } from '@pages/books/state/book-store';

@Component({
  selector: 'app-books-shelf',
  imports: [TranslatePipe, AppInput, IonContent, IonIcon, RouterLink],
  templateUrl: './books-shelf.html',
  styleUrls: ['../books-loading.css', './books-shelf.css'],
})
export class BooksShelf {
  private readonly i18n = inject(TranslateService);
  readonly kindleSummary = (book: Parameters<typeof kindleSummary>[0]) =>
    kindleSummary(book, (key, params) => this.i18n.instant(key, params));
  readonly addBookSheet = inject(AddBookSheet);
  readonly store = inject(BookStore);
  readonly search = signal('');
  readonly status = signal('All books');
  readonly filters = ['All books', 'Reading', 'Want to read', 'Finished', 'Favourites'];
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.status();
    return this.store
      .sortedBooks()
      .filter(
        (book) =>
          (status === 'All books' ||
            (status === 'Favourites'
              ? book.favourite
              : book.status === (status === 'Want to read' ? 'Not Started' : status))) &&
          (!query ||
            [book.title, book.author, book.category, book.seriesName].some((part) =>
              part.toLowerCase().includes(query),
            )),
      );
  });

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      bookmarkOutline,
      bookOutline,
      checkmarkOutline,
      heartOutline,
      searchOutline,
    });
  }
}
