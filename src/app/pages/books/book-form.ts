import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookCopy, BookFormat, BookInput, BookRecord, BookTag, BOOK_CATEGORIES, BOOK_FORMATS, BOOK_STATUSES } from '../../shared/state/books/book.model';
import { BookStore } from '../../shared/state/books/book-store';
import { OpenLibraryCoverService } from '../../shared/state/books/open-library-cover.service';
import { AppSelect } from '../../shared/components/app-select/app-select';
import { AppDatePicker } from '../../shared/components/app-date-picker/app-date-picker';

@Component({ selector: 'app-book-form', imports: [IonContent, IonIcon, PageHeader, RouterLink, ReactiveFormsModule, AppSelect, AppDatePicker], templateUrl: './book-form.html' })
export class BookForm {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(BookStore);
  private readonly covers = inject(OpenLibraryCoverService);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly categories = BOOK_CATEGORIES;
  readonly formats = BOOK_FORMATS;
  readonly statuses = BOOK_STATUSES;
  readonly categoryOptions = BOOK_CATEGORIES.map((item) => ({ value: item, label: item }));
  readonly formatOptions = BOOK_FORMATS.map((item) => ({ value: item, label: item }));
  readonly statusOptions = BOOK_STATUSES.map((item) => ({ value: item, label: item }));
  readonly ratingOptions = [{ value: '0', label: 'Not rated' }, ...[1, 2, 3, 4, 5].map((item) => ({ value: String(item), label: `${item} star${item === 1 ? '' : 's'}` }))];
  readonly copies = signal<BookCopy[]>([{ id: crypto.randomUUID(), format: 'Paperback', label: '' }]);
  readonly moodTagIds = signal<string[]>([]);
  readonly genreTagIds = signal<string[]>([]);
  readonly loading = signal(!!this.id);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly showDelete = signal(false);
  readonly book = signal<BookRecord | null>(null);
  readonly showEditor = signal(!this.id);
  readonly step = signal<1 | 2>(1);
  readonly isSeries = signal(false);
  readonly lookingUpCover = signal(false);
  readonly coverMessage = signal('');
  private coverLookupVersion = 0;

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required], author: ['', Validators.required], category: ['', Validators.required],
    coverUrl: [''], publicationDate: [''], status: ['Not Started'], rating: [0], spiceRating: [0],
    favourite: [false], wouldRecommend: [false], reread: [false], wheelSelected: [false],
    seriesName: [''], seriesNumber: [null as number | null], startDate: [''], finishDate: [''], review: [''],
  });

  constructor() { if (this.id) void this.load(this.id); }

  private async load(id: string): Promise<void> {
    try {
      const book = await this.store.getBook(id);
      this.book.set(book);
      this.populate(book);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not load book.'); }
    finally { this.loading.set(false); }
  }

  private populate(book: BookRecord): void {
    this.form.patchValue(book);
    this.isSeries.set(!!book.seriesName);
    this.copies.set(book.copies.map((copy) => ({ ...copy })));
    this.moodTagIds.set([...book.moodTagIds]);
    this.genreTagIds.set([...book.genreTagIds]);
  }

  addCopy(): void { this.copies.update((copies) => [...copies, { id: crypto.randomUUID(), format: 'Paperback', label: '' }]); }
  toggleSeries(checked: boolean): void {
    this.isSeries.set(checked);
    if (!checked) this.form.patchValue({ seriesName: '', seriesNumber: null });
  }
  toggleFormFlag(field: 'favourite' | 'wouldRecommend' | 'reread'): void {
    const control = this.form.controls[field];
    control.setValue(!control.value);
  }
  setSpiceRating(rating: number): void { this.form.controls.spiceRating.setValue(rating); }
  async lookupCover(): Promise<void> {
    const { title, author } = this.form.getRawValue();
    if (!title.trim() || !author.trim()) return;
    const version = ++this.coverLookupVersion;
    this.lookingUpCover.set(true);
    const cover = await this.covers.find(title, author);
    if (version !== this.coverLookupVersion) return;
    this.form.controls.coverUrl.setValue(cover ?? '');
    this.coverMessage.set(cover ? 'Cover found on Open Library.' : 'No matching Open Library cover found.');
    this.lookingUpCover.set(false);
  }
  updateCopy(id: string, field: 'format' | 'label', value: string): void {
    this.copies.update((copies) => copies.map((copy) => copy.id === id ? { ...copy, [field]: value as BookFormat } : copy));
  }
  removeCopy(id: string): void { this.copies.update((copies) => copies.filter((copy) => copy.id !== id)); }
  tagFor(id: string): BookTag | undefined { return this.store.tags().find((tag) => tag.id === id); }
  formatDate(value: string): string {
    return value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
  }
  openEditor(): void { this.error.set(''); this.step.set(1); this.showEditor.set(true); }
  addCopyFromDetails(): void { this.openEditor(); this.addCopy(); }
  cancel(): void {
    if (this.id) { const book = this.book(); if (book) this.populate(book); this.error.set(''); this.showEditor.set(false); this.step.set(1); }
    else void this.router.navigateByUrl('/books');
  }
  nextStep(): void {
    for (const key of ['title', 'author', 'category'] as const) this.form.controls[key].markAsTouched();
    if (this.form.controls.title.invalid || this.form.controls.author.invalid || this.form.controls.category.invalid) {
      this.error.set('Enter a title, author and main category.'); return;
    }
    if (!this.copies().length) { this.error.set('Add at least one copy.'); return; }
    this.error.set(''); this.step.set(2);
  }
  async toggleFlag(field: 'favourite' | 'wouldRecommend' | 'reread'): Promise<void> {
    const book = this.book();
    if (!book || this.saving()) return;
    this.saving.set(true); this.error.set('');
    const { id, ...input } = book;
    try {
      const saved = await this.store.saveBook({ ...input, [field]: !book[field] }, id);
      this.book.set(saved);
      this.form.patchValue({ [field]: saved[field] });
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not update book.'); }
    finally { this.saving.set(false); }
  }
  toggleTag(type: 'mood' | 'genre', id: string): void {
    const target = type === 'mood' ? this.moodTagIds : this.genreTagIds;
    if (type === 'genre' && !target().includes(id) && target().length >= 5) {
      this.error.set('Choose up to five genre tags.'); return;
    }
    this.error.set('');
    target.update((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Enter a title, author and main category.'); return; }
    if (!this.copies().length) { this.error.set('Add at least one copy.'); return; }
    if (this.saving()) return;
    this.saving.set(true); this.error.set('');
    try {
      const value = this.form.getRawValue();
      const input: BookInput = {
        ...value, status: value.status as BookInput['status'],
        rating: Number(value.rating), spiceRating: Number(value.spiceRating), seriesName: this.isSeries() ? value.seriesName.trim() : '',
        seriesNumber: this.isSeries() && value.seriesName.trim() ? value.seriesNumber : null,
        copies: this.copies(), moodTagIds: this.moodTagIds(), genreTagIds: this.genreTagIds(),
      };
      await this.store.saveBook(input, this.id ?? undefined);
      if (this.id) {
        this.book.set(await this.store.getBook(this.id));
        this.showEditor.set(false);
        this.step.set(1);
      } else {
        await this.router.navigateByUrl('/books', { replaceUrl: true });
      }
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save book.'); }
    finally { this.saving.set(false); }
  }

  async delete(): Promise<void> {
    if (!this.id || this.deleting()) return;
    this.deleting.set(true); this.error.set('');
    try { await this.store.deleteBook(this.id); await this.router.navigateByUrl('/books', { replaceUrl: true }); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not delete book.'); }
    finally { this.deleting.set(false); this.showDelete.set(false); }
  }
}
