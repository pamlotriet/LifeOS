import { Component, inject, signal, Input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, ModalController } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BookCopy, BookFormat, BookInput, BookRecord, BookTag, BOOK_CATEGORIES, BOOK_FORMATS, BOOK_STATUSES, validateLocationTracking, kindleSummary, locationSessionPages, locationPagesRead } from '../../shared/state/books/book.model';
import { BookStore } from '../../shared/state/books/book-store';
import { OpenLibraryCoverService } from '../../shared/state/books/open-library-cover.service';
import { AppSelect } from '../../shared/components/app-select/app-select';
import { AppDatePicker } from '../../shared/components/app-date-picker/app-date-picker';
import { BookBarcodeScannerService } from '../../shared/state/books/book-barcode-scanner.service';
import { AppSkeleton } from '../../shared/components/app-skeleton/app-skeleton';

@Component({ selector: 'app-book-form', imports: [IonContent, IonIcon, PageHeader, RouterLink, ReactiveFormsModule, AppSelect, AppDatePicker, AppSkeleton], templateUrl: './book-form.html', styleUrl: './book-form.css' })
export class BookForm {
  @Input() embedded = false;
  private readonly modal = inject(ModalController);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(BookStore);
  private readonly covers = inject(OpenLibraryCoverService);
  private readonly barcodeScanner = inject(BookBarcodeScannerService);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly categories = BOOK_CATEGORIES;
  readonly formats = BOOK_FORMATS;
  readonly statuses = BOOK_STATUSES;
  get categoryOptions() { return [...new Set<string>([...BOOK_CATEGORIES, ...this.store.books().map(book => book.category)])].map(item => ({ value: item, label: item })); }
  readonly formatOptions = BOOK_FORMATS.map((item) => ({ value: item, label: item }));
  readonly statusOptions = BOOK_STATUSES.map((item) => ({ value: item, label: item }));
  readonly ratingOptions = [{ value: '0', label: 'Not rated' }, ...[1, 2, 3, 4, 5].map((item) => ({ value: String(item), label: `${item} star${item === 1 ? '' : 's'}` }))];
  readonly copies = signal<BookCopy[]>([{ id: crypto.randomUUID(), format: 'Paperback', label: '' }]);
  readonly moodTagIds = signal<string[]>([]);
  readonly genreTagIds = signal<string[]>([]);
  readonly trackingMode = signal<'pages'|'percent'|'locations'>('pages');
  trackingByPages():boolean {return this.hasPageFormat() && this.trackingMode()==='pages';}
  readonly kindleSummary = kindleSummary;
  readonly sessionPages = (book: BookRecord, entry: NonNullable<BookRecord['locationEntries']>[number]) => Math.round(locationSessionPages(book, entry));
  readonly locationPagesRead = locationPagesRead;
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
  readonly scanning = signal(false);
  readonly scanMessage = signal('');
  private coverLookupVersion = 0;

  readonly form = this.fb.nonNullable.group({
    totalLocations: [0], currentLocation: [0], locationsPerPage: [15],
    title: ['', Validators.required], author: ['', Validators.required], category: ['', Validators.required],
    coverUrl: [''], isbn: [''], publicationDate: [''], status: ['Not Started'], progress: [0], pageCount: [0], pageProgress: [0], rating: [0], spiceRating: [0],
    favourite: [false], wouldRecommend: [false], reread: [false], wheelSelected: [false],
    seriesName: [''], seriesNumber: [null as number | null], startDate: [''], finishDate: [''], review: [''],
  });

  constructor() {
    if (this.id) void this.load(this.id);
    else if (this.route.snapshot.data['scan']) {
      setTimeout(() => void this.scanBook());
    }
  }

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
    this.trackingMode.set(book.progressMode ?? (book.pageCount>0?'pages':'percent'));
    this.isSeries.set(!!book.seriesName);
    this.copies.set(book.copies.map((copy) => ({ ...copy })));
    this.moodTagIds.set([...book.moodTagIds]);
    this.genreTagIds.set([...book.genreTagIds]);
  }

  addCopy(): void { this.copies.update((copies) => [...copies, { id: crypto.randomUUID(), format: 'Paperback', label: '' }]); }
  hasPageFormat(): boolean { return this.copies().some(copy => copy.format !== 'Audiobook'); }
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
    const { title, author, isbn } = this.form.getRawValue();
    if ((!title.trim() || !author.trim()) && !isbn.trim()) return;
    const version = ++this.coverLookupVersion;
    this.lookingUpCover.set(true);
    this.form.controls.coverUrl.setValue('');
    const cover = await this.covers.find(title, author, isbn);
    if (version !== this.coverLookupVersion) return;
    this.form.controls.coverUrl.setValue(cover ?? '');
    this.coverMessage.set(cover ? 'Cover found.' : 'No matching cover found on Open Library or Google Books.');
    this.lookingUpCover.set(false);
  }
  async scanBook(): Promise<void> {
    if (this.scanning()) return;
    this.scanning.set(true);
    this.scanMessage.set('');
    this.error.set('');
    try {
      const isbn = await this.barcodeScanner.scan();
      ++this.coverLookupVersion;
      this.lookingUpCover.set(false);
      this.form.controls.isbn.setValue(isbn);
      this.scanMessage.set('Looking up scanned ISBN...');
      const book = await this.covers.lookupByIsbn(isbn);
      if (!book || !book.title) {
        throw new Error(`No book details were found for ISBN ${isbn}. You can still enter it manually.`);
      }
      // An earlier title lookup must not overwrite the scanned edition's cover.
      ++this.coverLookupVersion;
      this.lookingUpCover.set(false);
      this.form.patchValue({
        title: book.title,
        author: book.author,
        category: book.category,
        publicationDate: book.publicationDate,
        coverUrl: book.coverUrl,
        isbn,
      });
      this.coverMessage.set(book.coverUrl ? 'Cover found from the scanned ISBN.' : 'Book details found without a cover.');
      this.scanMessage.set(book.author ? `Book details filled from ISBN ${isbn}.` : `ISBN ${isbn} found. Please add the missing author.`);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not scan this book.');
      this.scanMessage.set('');
    } finally {
      this.scanning.set(false);
    }
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
    if (this.saving()) return;
    if (this.embedded) { void this.modal.dismiss(); return; }
    if (this.id) { const book = this.book(); if (book) this.populate(book); this.error.set(''); this.showEditor.set(false); this.step.set(1); }
    else void this.router.navigateByUrl('/books');
  }
  nextStep(): void {
    if (!this.validateBasics()) return;
    this.error.set(''); this.step.set(2);
  }
  private validateBasics(): boolean {
    for (const key of ['title', 'author', 'category'] as const) this.form.controls[key].markAsTouched();
    if ((['title', 'author', 'category'] as const).some(key => !this.form.controls[key].value.trim())) {
      this.error.set('Enter a title, author and main category.'); return false;
    }
    if (!this.copies().length) { this.error.set('Add at least one copy.'); return false; }
    // Validate here so a hidden page input cannot leave an audiobook invalid.
    const pages = Number(this.form.controls.pageCount.value);
    if (this.trackingByPages() && (!Number.isInteger(pages) || pages < 1)) {
      this.error.set('Enter the number of pages for this book.'); return false;
    }
    if (this.trackingMode() === 'locations') {
      try { validateLocationTracking({ ...this.form.getRawValue(), pageCount: Number(this.form.controls.pageCount.value) }); } catch (error) { this.error.set((error as Error).message); return false; }
    }
    return true;
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
    if (!this.validateBasics()) { this.step.set(1); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Check the book details. The series book number must be at least 1.'); return; }
    if (this.saving()) return;
    this.saving.set(true); this.error.set('');
    try {
      if (this.lookingUpCover()) await this.lookupCover();
      const value = this.form.getRawValue();
      const pageCount = (this.hasPageFormat() || this.trackingMode() === 'locations') ? Math.max(0, Math.floor(Number(value.pageCount)||0)) : 0;
      const pageProgress = pageCount ? this.trackingByPages() ? Math.min(pageCount, Math.max(0, Number(value.pageProgress))) : Math.round(Number(value.progress)/100*pageCount) : 0;
      const input: BookInput = {
        ...value, status: value.status as BookInput['status'],
        progressMode: this.trackingMode() === 'locations' ? 'locations' : this.trackingByPages() ? 'pages' : 'percent',
        locationEntries: this.book()?.locationEntries ?? [],
        progress: this.trackingByPages() && pageCount ? Math.round(pageProgress / pageCount * 100) : Number(value.progress),
        pageCount,
        pageProgress,
        rating: Number(value.rating), spiceRating: Number(value.spiceRating), seriesName: this.isSeries() ? value.seriesName.trim() : '',
        yearRead: value.status === 'Finished' && value.finishDate
          ? (Number(value.finishDate.slice(0, 4)) || null) : null,
        seriesNumber: this.isSeries() && value.seriesName.trim() ? value.seriesNumber : null,
        copies: this.copies(), moodTagIds: this.moodTagIds(), genreTagIds: this.genreTagIds(),
      };
      await this.store.saveBook(input, this.id ?? undefined);
      if (this.id) {
        this.book.set(await this.store.getBook(this.id));
        this.showEditor.set(false);
        this.step.set(1);
      } else if (this.embedded) {
        await this.modal.dismiss(undefined, 'saved');
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
