import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonModal } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookRecord, BOOK_CATEGORIES, BOOK_FORMATS } from '../../shared/state/books/book.model';
import { BookStore } from '../../shared/state/books/book-store';
import { ReadingGoalService } from '../../shared/state/books/reading-goal.service';
import { RefreshCoordinator } from '../../shared/state/refresh/refresh-coordinator.service';
import { AppSkeleton } from '../../shared/components/app-skeleton/app-skeleton';

@Component({
  selector: 'app-books-library',
  imports: [IonContent, IonIcon, IonModal, PageHeader, RouterLink, AppSkeleton],
  templateUrl: './books-library.html',
  styleUrl: './books-library.css',
})
export class BooksLibrary {
  readonly store = inject(BookStore);
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
  readonly favourites = computed(() => this.store.books().filter((book) => book.favourite).length);
  readonly reading = computed(
    () => this.store.books().filter((book) => book.status === 'Reading').length,
  );
  readonly currentlyReading = computed(() => this.store.sortedBooks().filter((book) => book.status === 'Reading'));
  readonly progressBook = signal<BookRecord | null>(null);
  readonly progressMode = signal<'pages' | 'percent'>('pages');
  readonly progressInput = signal('');
  readonly progressSaving = signal(false);
  readonly progressError = signal('');
  readonly progressNotice = signal('');

  openProgress(book: BookRecord): void {
    this.progressBook.set(book);
    this.progressMode.set(book.pageCount > 0 ? 'pages' : 'percent');
    this.progressInput.set(String(book.pageCount > 0 ? book.pageProgress : book.progress));
    this.progressError.set(''); this.progressNotice.set('');
  }
  changeProgressMode(mode: 'pages' | 'percent'): void {
    const book = this.progressBook();
    if (!book || mode === this.progressMode() || (mode === 'pages' && !book.pageCount)) return;
    const value = Number(this.progressInput());
    this.progressInput.set(this.progressInput().trim() && Number.isFinite(value)
      ? String(Math.round(mode === 'pages' ? value / 100 * book.pageCount : value / book.pageCount * 100)) : '');
    this.progressMode.set(mode); this.progressError.set('');
  }
  closeProgress(): void { if (!this.progressSaving()) this.progressBook.set(null); }
  async saveProgress(finished = false): Promise<void> {
    const selected = this.progressBook();
    if (!selected || this.progressSaving()) return;
    const book = this.store.books().find(item => item.id === selected.id);
    if (!book) { this.progressError.set('This book is no longer in your library.'); return; }
    const max = this.progressMode() === 'pages' ? book.pageCount : 100;
    const value = Number(this.progressInput());
    if (!finished && (!this.progressInput().trim() || !Number.isInteger(value) || value < 0 || value > max)) {
      this.progressError.set(`Enter a whole number between 0 and ${max}.`); return;
    }
    this.progressSaving.set(true); this.progressError.set('');
    try {
      if (finished) {
        const now = new Date();
        const finishDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const { id, ...input } = book;
        await this.store.saveBook({ ...input, progress: 100, pageProgress: book.pageCount || 0, status: 'Finished', finishDate, yearRead: now.getFullYear() }, id);
      } else if (book.pageCount > 0) {
        const page = this.progressMode() === 'pages' ? value : Math.round(value / 100 * book.pageCount);
        await this.store.setReadingPosition(book.id, page, book.pageCount);
      } else {
        await this.store.setReadingProgress(book.id, value);
      }
      this.progressNotice.set(finished ? `Finished ${book.title}. Your reading goal has been updated.` : `Progress saved for ${book.title}.`);
      this.progressBook.set(null);
    } catch (error) { this.progressError.set(error instanceof Error ? error.message : 'Could not save progress. Please try again.'); }
    finally { this.progressSaving.set(false); }
  }

  constructor() {
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
    return Math.max(0, Math.min(100, book.pageCount ? Math.round((book.pageProgress / book.pageCount) * 100) : book.progress));
  }
}
