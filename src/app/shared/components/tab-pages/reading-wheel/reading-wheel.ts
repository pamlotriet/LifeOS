import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { BookRecord } from '../../../state/books/book.model';
import { BookStore } from '../../../state/books/book-store';

const COLORS = ['#2477c6', '#7437d0', '#1aa89f', '#edae28', '#e45a53', '#b12e83', '#8b58e9', '#12649f'];

@Component({
  selector: 'app-reading-wheel',
  imports: [IonContent, IonIcon, RouterLink],
  templateUrl: './reading-wheel.html',
  styleUrl: './reading-wheel.css',
})
export class ReadingWheel {
  readonly store = inject(BookStore);
  readonly mode = signal<'wheel' | 'manage' | 'result'>('wheel');
  readonly search = signal('');
  readonly filter = signal('All');
  readonly busy = signal(false);
  readonly spinning = signal(false);
  readonly error = signal('');
  readonly winner = signal<BookRecord | null>(null);
  readonly rotation = signal(0);
  readonly spinBooks = signal<BookRecord[]>([]);
  readonly recentPickIds = signal<string[]>(this.restoreHistory());
  readonly eligible = computed(() => this.store.sortedBooks().filter((book) => book.status === 'Not Started'));
  readonly selected = computed(() => this.eligible().filter((book) => book.wheelSelected));
  readonly categories = computed(() => ['All', ...new Set(this.eligible().map((book) => book.category))]);
  readonly filtered = computed(() => this.eligible().filter((book) =>
    (this.filter() === 'All' || book.category === this.filter()) &&
    `${book.title} ${book.author}`.toLowerCase().includes(this.search().trim().toLowerCase()),
  ));
  /** The filter applies to the spin pool, not only the management list. */
  readonly wheelCandidates = computed(() => this.selected().filter((book) =>
    (this.filter() === 'All' || book.category === this.filter()) &&
    `${book.title} ${book.author}`.toLowerCase().includes(this.search().trim().toLowerCase()),
  ));
  readonly favourites = computed(() => this.eligible().filter(book => book.favourite).length);
  readonly genres = computed(() => new Set(this.eligible().map(book => book.category)).size);
  readonly recentPicks = computed(() => this.recentPickIds().map(id => this.store.books().find(book => book.id === id)).filter((book): book is BookRecord => !!book));
  readonly wheelGradient = computed(() => {
    const count = this.spinBooks().length;
    if (!count) return '#123451';
    return `conic-gradient(${this.spinBooks().map((_, index) => `${COLORS[index % COLORS.length]} ${index * 100 / count}% ${(index + 1) * 100 / count}%`).join(',')})`;
  });

  constructor() {
    effect(() => {
      const books = this.wheelCandidates();
      if (!this.spinning() && this.mode() === 'wheel') this.spinBooks.set(books.slice(0, 8));
    });
  }

  syncWheel(): void {
    if (!this.spinning()) this.spinBooks.set(this.wheelCandidates().slice(0, 8));
  }

  showManage(): void { this.mode.set('manage'); this.error.set(''); }
  showWheel(): void { this.mode.set('wheel'); this.error.set(''); this.syncWheel(); }
  shuffle(): void { if (this.spinning()) return; this.spinBooks.set([...this.wheelCandidates()].sort(() => Math.random() - .5).slice(0, 8)); }

  async setSelected(book: BookRecord, selected: boolean): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.store.setWheelSelected(book.id, selected); this.syncWheel(); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not update the wheel.'); }
    finally { this.busy.set(false); }
  }

  async selectAll(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try {
      for (const book of this.eligible().filter((item) => !item.wheelSelected)) await this.store.setWheelSelected(book.id, true);
      this.syncWheel();
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not update every book.'); }
    finally { this.busy.set(false); }
  }

  async spin(): Promise<void> {
    if (this.spinning()) return;
    const books = this.wheelCandidates().slice(0, 8);
    if (!books.length) { this.showManage(); return; }
    this.spinBooks.set(books);
    this.winner.set(null);
    this.error.set('');
    this.spinning.set(true);
    const winnerIndex = Math.floor(Math.random() * books.length);
    const segment = 360 / books.length;
    const current = this.rotation();
    const target = 360 - (winnerIndex + 0.5) * segment;
    const extra = (360 + target - current % 360) % 360;
    this.rotation.set(current + 360 * 6 + extra);
    await new Promise<void>((resolve) => setTimeout(resolve, 4300));
    const chosen = books[winnerIndex];
    try {
      await this.store.setWheelSelected(chosen.id, false);
      this.addToHistory(chosen.id);
      this.winner.set(chosen);
      this.mode.set('result');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not remove the selected book from the wheel.');
    } finally { this.spinning.set(false); }
  }
  private restoreHistory(): string[] { try { const value = JSON.parse(localStorage.getItem('lifeos.wheel.history') ?? '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, 10) : []; } catch { return []; } }
  private addToHistory(id: string): void { this.recentPickIds.update(items => { const next = [id, ...items.filter(item => item !== id)].slice(0, 10); try { localStorage.setItem('lifeos.wheel.history', JSON.stringify(next)); } catch { /* Optional persistence. */ } return next; }); }
}
