import { Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookTag, BookTagType } from '../../shared/state/books/book.model';
import { BookStore } from '../../shared/state/books/book-store';

@Component({ selector: 'app-book-tags', imports: [IonContent, IonIcon, PageHeader], templateUrl: './book-tags.html' })
export class BookTags {
  readonly store = inject(BookStore);
  readonly type = signal<BookTagType>('mood');
  readonly editing = signal<BookTag | null>(null);
  readonly deleting = signal<BookTag | null>(null);
  readonly formOpen = signal(false);
  readonly name = signal('');
  readonly color = signal('#47b9fa');
  readonly colors = ['#47b9fa', '#8c5cf6', '#f46a7c', '#f6bd48', '#36c98c', '#29d9eb'];
  readonly busy = signal(false);
  readonly error = signal('');
  readonly visible = computed(() => this.store.tags().filter((tag) => tag.type === this.type()).sort((a, b) => a.name.localeCompare(b.name)));

  count(tag: BookTag): number {
    return this.store.books().filter((book) => (tag.type === 'mood' ? book.moodTagIds : book.genreTagIds).includes(tag.id)).length;
  }
  openNew(): void { this.editing.set(null); this.name.set(''); this.color.set(this.colors[0]); this.error.set(''); this.formOpen.set(true); }
  openEdit(tag: BookTag): void { this.editing.set(tag); this.name.set(tag.name); this.color.set(tag.color); this.error.set(''); this.formOpen.set(true); }
  async save(): Promise<void> {
    if (!this.name().trim()) { this.error.set('Enter a tag name.'); return; }
    if (this.store.tags().some((tag) => tag.type === this.type() && tag.name.toLowerCase() === this.name().trim().toLowerCase() && tag.id !== this.editing()?.id)) { this.error.set('A tag with that name already exists.'); return; }
    this.busy.set(true); this.error.set('');
    try { await this.store.saveTag({ name: this.name(), type: this.type(), color: this.color() }, this.editing()?.id); this.formOpen.set(false); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save tag.'); }
    finally { this.busy.set(false); }
  }
  async remove(): Promise<void> {
    const tag = this.deleting(); if (!tag) return;
    this.busy.set(true); this.error.set('');
    try { await this.store.deleteTag(tag); this.deleting.set(null); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not delete tag.'); }
    finally { this.busy.set(false); }
  }
}
