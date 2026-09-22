import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookCopy, BookFormat, BookInput, BOOK_CATEGORIES, BOOK_FORMATS, BOOK_STATUSES } from '../../shared/state/books/book.model';
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
  readonly isSeries = signal(false);
  readonly lookingUpCover = signal(false);
  readonly coverMessage = signal('');
  private coverLookupVersion = 0;

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required], author: ['', Validators.required], category: ['', Validators.required],
    coverUrl: [''], publicationDate: [''], status: ['Not Started'], rating: [0],
    favourite: [false], wouldRecommend: [false], reread: [false],
    seriesName: [''], seriesNumber: [null as number | null], startDate: [''], finishDate: [''], review: [''],
  });

  constructor() { if (this.id) void this.load(this.id); }

  private async load(id: string): Promise<void> {
    try {
      const book = await this.store.getBook(id);
      this.form.patchValue(book);
      this.isSeries.set(!!book.seriesName);
      this.copies.set(book.copies);
      this.moodTagIds.set(book.moodTagIds);
      this.genreTagIds.set(book.genreTagIds);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not load book.'); }
    finally { this.loading.set(false); }
  }

  addCopy(): void { this.copies.update((copies) => [...copies, { id: crypto.randomUUID(), format: 'Paperback', label: '' }]); }
  toggleSeries(checked: boolean): void {
    this.isSeries.set(checked);
    if (!checked) this.form.patchValue({ seriesName: '', seriesNumber: null });
  }
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
  toggleTag(type: 'mood' | 'genre', id: string): void {
    const target = type === 'mood' ? this.moodTagIds : this.genreTagIds;
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
        rating: Number(value.rating), seriesName: this.isSeries() ? value.seriesName.trim() : '',
        seriesNumber: this.isSeries() && value.seriesName.trim() ? value.seriesNumber : null,
        copies: this.copies(), moodTagIds: this.moodTagIds(), genreTagIds: this.genreTagIds(),
      };
      await this.store.saveBook(input, this.id ?? undefined);
      await this.router.navigateByUrl('/books', { replaceUrl: true });
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
