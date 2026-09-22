import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { BookInput, BookRecord, BookTag } from './book.model';
import { BookService } from './book.service';

@Injectable({ providedIn: 'root' })
export class BookStore {
  private readonly auth = inject(AuthService);
  private readonly service = inject(BookService);
  readonly books = signal<BookRecord[]>([]);
  readonly tags = signal<BookTag[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly sortedBooks = computed(() => [...this.books()].sort((a, b) => a.title.localeCompare(b.title)));
  private version = 0;

  constructor() {
    effect(() => {
      const uid = this.auth.userId();
      untracked(() => {
        this.version++;
        this.books.set([]);
        this.tags.set([]);
        this.error.set('');
        if (uid) void this.reload();
        else this.loading.set(false);
      });
    });
  }

  async reload(): Promise<void> {
    const uid = this.auth.userId();
    if (!uid) return;
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    try {
      const [books, tags] = await Promise.all([this.service.listBooks(), this.service.listTags()]);
      if (version === this.version && this.auth.userId() === uid) {
        this.books.set(books);
        this.tags.set(tags);
      }
    } catch (error) {
      if (version === this.version) {
        console.error('Could not load books', error);
        this.error.set('Could not load books. Please try again.');
      }
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }

  async getBook(id: string): Promise<BookRecord> {
    return this.books().find((book) => book.id === id) ?? this.service.getBook(id);
  }

  async saveBook(input: BookInput, id?: string): Promise<BookRecord> {
    const uid = this.auth.userId();
    if (!uid) throw new Error('Sign in to save books.');
    const book = await this.service.saveBook(input, id);
    if (this.auth.userId() === uid) this.books.update((books) => [...books.filter((item) => item.id !== book.id), book]);
    return book;
  }

  async deleteBook(id: string): Promise<void> {
    const uid = this.auth.userId();
    await this.service.deleteBook(id);
    if (this.auth.userId() === uid) this.books.update((books) => books.filter((book) => book.id !== id));
  }

  async saveTag(input: Pick<BookTag, 'name' | 'type' | 'color'>, id?: string): Promise<void> {
    const uid = this.auth.userId();
    const tag = await this.service.saveTag(input, id);
    if (this.auth.userId() === uid) this.tags.update((tags) => [...tags.filter((item) => item.id !== tag.id), tag]);
  }

  async deleteTag(tag: BookTag): Promise<void> {
    const uid = this.auth.userId();
    await this.service.deleteTag(tag, this.books());
    if (this.auth.userId() === uid) {
      this.tags.update((tags) => tags.filter((item) => item.id !== tag.id));
      this.books.update((books) => books.map((book) => ({
        ...book,
        moodTagIds: book.moodTagIds.filter((id) => id !== tag.id),
        genreTagIds: book.genreTagIds.filter((id) => id !== tag.id),
      })));
    }
  }
}
