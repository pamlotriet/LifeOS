import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppInput } from '../../../shared/components/app-input/app-input';
import { AddBookSheet } from '../book-form/add-book-sheet.service';
import { addIcons } from 'ionicons';
import {
  add,
  arrowBackOutline,
  arrowUpOutline,
  bookOutline,
  bookmarkOutline,
  checkmarkDoneOutline,
  libraryOutline,
  pencilOutline,
  pricetagsOutline,
  radioButtonOnOutline,
} from 'ionicons/icons';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonModal } from '@ionic/angular';
import {
  bookProgressMode,
  kindleSummary,
  locationProgress,
  locationSessionPages,
  BookRecord,
  BOOK_CATEGORIES,
  BOOK_FORMATS,
} from '../state/book.model';
import { BookStore } from '../state/book-store';
import { ReadingGoalService } from '../state/reading-goal.service';
import { RefreshCoordinator } from '../../../core/refresh/refresh-coordinator.service';

@Component({
  selector: 'app-books-library',
  imports: [TranslatePipe, AppInput, AppButton, IonContent, IonIcon, IonModal, RouterLink],
  templateUrl: './books-library.html',
  styleUrls: ['./books-library.css', '../books-layout.css'],
})
export class BooksLibrary {
  private readonly i18n = inject(TranslateService);

  readonly addBookSheet = inject(AddBookSheet);
  readonly store = inject(BookStore);
  private readonly router = inject(Router);
  private readonly goals = inject(ReadingGoalService);
  private readonly refreshCoordinator = inject(RefreshCoordinator);
  private readonly destroyRef = inject(DestroyRef);
  readonly categories = BOOK_CATEGORIES;
  readonly year = new Date().getFullYear();
  readonly search = signal('');

  readonly status = signal('All');
  readonly format = signal('All');
  readonly formats = BOOK_FORMATS;
  readonly view = signal<'covers' | 'spines'>('covers');
  readonly goal = signal<number | null>(null);
  readonly goalInput = signal('');
  readonly goalEditing = signal(false);
  readonly goalSaving = signal(false);
  readonly goalError = signal('');
  readonly goalLoading = signal(true);
  readonly loading = computed(() => this.store.loading() || this.goalLoading());
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    return this.store
      .sortedBooks()
      .filter(
        (book) =>
          (this.status() === 'All' || book.status === this.status()) &&
          (this.format() === 'All' || book.copies.some((copy) => copy.format === this.format())) &&
          (!query ||
            [book.title, book.author, book.category, book.seriesName].some((part) =>
              part.toLowerCase().includes(query),
            )),
      );
  });
  readonly readThisYear = computed(
    () => this.store.books().filter((book) => this.finishedInYear(book)).length,
  );
  readonly finishedThisYear = computed(() =>
    this.store
      .books()
      .filter((book) => this.finishedInYear(book))
      .slice(0, 5),
  );
  readonly goalPercent = computed(() =>
    this.goal() ? Math.min(100, Math.round((this.readThisYear() / this.goal()!) * 100)) : 0,
  );
  readonly goalRemaining = computed(() => Math.max(0, (this.goal() ?? 0) - this.readThisYear()));
  readonly finished = computed(
    () => this.store.books().filter((book) => book.status === 'Finished').length,
  );
  readonly favourites = computed(() => this.store.books().filter((book) => book.favourite).length);
  readonly reading = computed(
    () => this.store.books().filter((book) => book.status === 'Reading').length,
  );
  readonly currentlyReading = computed(() =>
    this.store.sortedBooks().filter((book) => book.status === 'Reading'),
  );
  readonly progressBook = signal<BookRecord | null>(null);
  readonly progressMode = signal<'pages' | 'percent' | 'locations'>('pages');
  readonly progressInput = signal('');
  readonly progressSaving = signal(false);
  readonly progressError = signal('');
  readonly progressNotice = signal('');

  readonly kindleSummary = (book: Parameters<typeof kindleSummary>[0]) =>
    kindleSummary(book, (key, params) => this.i18n.instant(key, params));
  readonly estimatedPagesLogged = computed(() =>
    Math.round(
      this.store
        .books()
        .reduce(
          (sum, book) =>
            sum +
            (book.locationEntries ?? []).reduce(
              (subtotal, entry) => subtotal + locationSessionPages(book, entry),
              0,
            ),
          0,
        ),
    ),
  );
  readonly trackingMode = bookProgressMode;
  openProgress(book: BookRecord): void {
    this.progressBook.set(book);
    this.progressMode.set(bookProgressMode(book));
    this.progressInput.set(
      String(
        bookProgressMode(book) === 'locations'
          ? (book.currentLocation ?? 0)
          : bookProgressMode(book) === 'pages'
            ? book.pageProgress
            : book.progress,
      ),
    );
    this.progressError.set('');
    this.progressNotice.set('');
  }
  changeProgressMode(mode: 'pages' | 'percent'): void {
    const book = this.progressBook();
    if (
      !book ||
      book.progressMode === 'locations' ||
      mode === this.progressMode() ||
      (mode === 'pages' && !book.pageCount)
    )
      return;
    const value = Number(this.progressInput());
    this.progressInput.set(
      this.progressInput().trim() && Number.isFinite(value)
        ? String(
            Math.round(
              mode === 'pages' ? (value / 100) * book.pageCount : (value / book.pageCount) * 100,
            ),
          )
        : '',
    );
    this.progressMode.set(mode);
    this.progressError.set('');
  }
  locationSessionPreview(book: BookRecord): string {
    const value = Number(this.progressInput());
    if (
      !this.progressInput().trim() ||
      !Number.isSafeInteger(value) ||
      value < 0 ||
      value > (book.totalLocations ?? 0)
    )
      return '';
    const updated = { ...book, currentLocation: value };
    const pages = Math.round(
      locationSessionPages(book, {
        id: '',
        date: '',
        fromLocation: book.currentLocation ?? 0,
        toLocation: value,
      }),
    );
    return this.i18n.instant('{{p0}}. Estimated pages read this session: {{p1}}.', {
      p0: this.kindleSummary(updated),
      p1: pages,
    });
  }
  closeProgress(): void {
    if (!this.progressSaving()) this.progressBook.set(null);
  }
  async saveProgress(finished = false): Promise<void> {
    const selected = this.progressBook();
    if (!selected || this.progressSaving()) return;
    const book = this.store.books().find((item) => item.id === selected.id);
    if (!book) {
      this.progressError.set('This book is no longer in your library.');
      return;
    }
    const max =
      book.progressMode === 'locations'
        ? (book.totalLocations ?? 0)
        : this.progressMode() === 'pages'
          ? book.pageCount
          : 100;
    const value = Number(this.progressInput());
    if (
      !finished &&
      (!this.progressInput().trim() || !Number.isInteger(value) || value < 0 || value > max)
    ) {
      this.progressError.set(
        this.i18n.instant('Enter a whole number between 0 and {{p0}}.', { p0: max }),
      );
      return;
    }
    this.progressSaving.set(true);
    this.progressError.set('');
    try {
      if (book.progressMode === 'locations') {
        await this.store.setReadingLocation(
          book.id,
          finished ? book.totalLocations! : value,
          finished,
        );
      } else if (finished) {
        const now = new Date();
        const finishDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const { id, ...input } = book;
        await this.store.saveBook(
          {
            ...input,
            progressMode: this.progressMode(),
            progress: 100,
            pageProgress: book.pageCount || 0,
            status: 'Finished',
            finishDate,
            yearRead: now.getFullYear(),
          },
          id,
        );
      } else if (this.progressMode() === 'pages' && book.pageCount > 0) {
        const page =
          this.progressMode() === 'pages' ? value : Math.round((value / 100) * book.pageCount);
        await this.store.setReadingPosition(book.id, page, book.pageCount);
      } else {
        await this.store.setReadingProgress(book.id, value);
      }
      this.progressNotice.set(
        finished
          ? this.i18n.instant('Finished {{p0}}. Your reading goal has been updated.', {
              p0: book.title,
            })
          : this.i18n.instant('Progress saved for {{p0}}.', { p0: book.title }),
      );
      this.progressBook.set(null);
      if (finished) {
        await this.router.navigate(['/books', book.id, 'edit'], { queryParams: { review: true } });
      }
    } catch (error) {
      this.progressError.set(
        error instanceof Error ? error.message : 'Could not save progress. Please try again.',
      );
    } finally {
      this.progressSaving.set(false);
    }
  }

  constructor() {
    addIcons({
      add,
      arrowBackOutline,
      arrowUpOutline,
      bookOutline,
      bookmarkOutline,
      checkmarkDoneOutline,
      libraryOutline,
      pencilOutline,
      pricetagsOutline,
      radioButtonOnOutline,
    });
    void this.loadGoal();
    const unregister = this.refreshCoordinator.register(() => this.loadGoal());
    this.destroyRef.onDestroy(unregister);
  }

  private finishedInYear(book: BookRecord): boolean {
    return book.status === 'Finished' && book.finishDate.startsWith(`${this.year}-`);
  }

  async loadGoal(): Promise<void> {
    this.goalLoading.set(true);
    try {
      this.goal.set(await this.goals.get(this.year));
      this.goalError.set('');
    } catch (error) {
      this.goalError.set(
        error instanceof Error ? error.message : 'Could not load your reading goal.',
      );
    } finally {
      this.goalLoading.set(false);
    }
  }

  editGoal(): void {
    this.goalInput.set(String(this.goal() ?? ''));
    this.goalError.set('');
    this.goalEditing.set(true);
  }

  async saveGoal(): Promise<void> {
    if (this.goalSaving()) return;
    const target = Number(this.goalInput());
    if (!Number.isInteger(target) || target < 1 || target > 1000) {
      this.goalError.set('Choose a goal between 1 and 1000 books.');
      return;
    }
    this.goalSaving.set(true);
    this.goalError.set('');
    try {
      await this.goals.save(this.year, target, this.goal() !== null);
      this.goal.set(target);
      this.goalEditing.set(false);
    } catch (error) {
      this.goalError.set(
        error instanceof Error ? error.message : 'Could not save your reading goal.',
      );
    } finally {
      this.goalSaving.set(false);
    }
  }

  tags(book: BookRecord): string[] {
    const ids = new Set([...book.moodTagIds, ...book.genreTagIds]);
    return this.store
      .tags()
      .filter((tag) => ids.has(tag.id))
      .map((tag) => tag.name);
  }
  pagePercent(book: BookRecord): number {
    if (book.progressMode === 'locations') return Math.round(locationProgress(book) * 100);
    return Math.max(
      0,
      Math.min(
        100,
        bookProgressMode(book) === 'pages' && book.pageCount
          ? Math.round((book.pageProgress / book.pageCount) * 100)
          : book.progress,
      ),
    );
  }
}
