import { AfterViewInit, Component, computed, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookRecord, BOOK_CATEGORIES } from '../../shared/state/books/book.model';
import { BookStore } from '../../shared/state/books/book-store';
import { ReadingGoalService } from '../../shared/state/books/reading-goal.service';

@Component({ selector: 'app-books-library', imports: [IonContent, IonIcon, PageHeader, RouterLink], templateUrl: './books-library.html' })
export class BooksLibrary implements AfterViewInit {
  @ViewChild(IonContent) private content!: IonContent;
  private scrollElement?: HTMLElement;
  private touchStart: number | null = null;
  readonly store = inject(BookStore);
  private readonly goals = inject(ReadingGoalService);
  readonly categories = BOOK_CATEGORIES;
  readonly year = new Date().getFullYear();
  readonly search = signal('');
  readonly category = signal('All');
  readonly status = signal('All');
  readonly view = signal<'covers' | 'spines'>('covers');
  readonly goal = signal<number | null>(null);
  readonly goalInput = signal('');
  readonly goalEditing = signal(false);
  readonly goalSaving = signal(false);
  readonly goalError = signal('');
  readonly goalLoading = signal(true);
  readonly pullDistance = signal(0);
  readonly refreshing = signal(false);
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    return this.store.sortedBooks().filter((book) =>
      (this.category() === 'All' || book.category === this.category()) &&
      (this.status() === 'All' || book.status === this.status()) &&
      (!query || [book.title, book.author, book.category, book.seriesName].some((part) => part.toLowerCase().includes(query))));
  });
  readonly readThisYear = computed(() => this.store.books().filter((book) => this.finishedInYear(book)).length);
  readonly finishedThisYear = computed(() => this.store.books().filter((book) => this.finishedInYear(book)).slice(0, 5));
  readonly goalPercent = computed(() => this.goal() ? Math.min(100, Math.round(this.readThisYear() / this.goal()! * 100)) : 0);
  readonly goalRemaining = computed(() => Math.max(0, (this.goal() ?? 0) - this.readThisYear()));
  readonly favourites = computed(() => this.store.books().filter((book) => book.favourite).length);
  readonly reading = computed(() => this.store.books().filter((book) => book.status === 'Reading').length);

  constructor() { void this.loadGoal(); }

  ngAfterViewInit(): void { void this.content.getScrollElement().then((element) => { this.scrollElement = element; }); }

  private finishedInYear(book: BookRecord): boolean {
    return book.status === 'Finished' && (book.yearRead === this.year || (!book.yearRead && book.finishDate.startsWith(String(this.year))));
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStart = !this.refreshing() && (this.scrollElement?.scrollTop ?? 0) <= 2 ? event.touches[0]?.clientY ?? null : null;
  }

  onTouchMove(event: TouchEvent): void {
    if (this.touchStart === null || this.refreshing()) return;
    this.pullDistance.set(Math.min(104, Math.max(0, (event.touches[0]?.clientY ?? this.touchStart) - this.touchStart)));
  }

  onTouchEnd(): void {
    const shouldRefresh = this.pullDistance() >= 72;
    this.touchStart = null;
    this.pullDistance.set(0);
    if (shouldRefresh) void this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    this.refreshing.set(true);
    try { await Promise.all([this.store.reload(), this.loadGoal()]); }
    finally { this.refreshing.set(false); }
  }

  async loadGoal(): Promise<void> {
    this.goalLoading.set(true);
    try { this.goal.set(await this.goals.get(this.year)); this.goalError.set(''); }
    catch (error) { this.goalError.set(error instanceof Error ? error.message : 'Could not load your reading goal.'); }
    finally { this.goalLoading.set(false); }
  }

  editGoal(): void { this.goalInput.set(String(this.goal() ?? '')); this.goalError.set(''); this.goalEditing.set(true); }

  async saveGoal(): Promise<void> {
    if (this.goalSaving()) return;
    const target = Number(this.goalInput());
    if (!Number.isInteger(target) || target < 1 || target > 1000) { this.goalError.set('Choose a goal between 1 and 1000 books.'); return; }
    this.goalSaving.set(true); this.goalError.set('');
    try {
      await this.goals.save(this.year, target, this.goal() !== null);
      this.goal.set(target);
      this.goalEditing.set(false);
    } catch (error) { this.goalError.set(error instanceof Error ? error.message : 'Could not save your reading goal.'); }
    finally { this.goalSaving.set(false); }
  }

  tags(book: BookRecord): string[] {
    const ids = new Set([...book.moodTagIds, ...book.genreTagIds]);
    return this.store.tags().filter((tag) => ids.has(tag.id)).map((tag) => tag.name);
  }
}
