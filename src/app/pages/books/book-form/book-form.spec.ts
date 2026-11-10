import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookForm } from './book-form';
import { BookStore } from '../state/book-store';
import { OpenLibraryCoverService } from '../state/open-library-cover.service';
import { BookBarcodeScannerService } from '../state/book-barcode-scanner.service';
import { addIcons } from 'ionicons';
import {
  book,
  calendarOutline,
  chevronBack,
  chevronDownOutline,
  scanOutline,
} from 'ionicons/icons';

describe('BookForm', () => {
  let fixture: ComponentFixture<BookForm>;
  const dismiss = vi.fn().mockResolvedValue(true);
  const saveBook = vi.fn().mockResolvedValue({});
  const findCover = vi.fn();
  const scan = vi.fn();
  const lookupByIsbn = vi.fn();

  beforeEach(async () => {
    addIcons({ book, calendarOutline, chevronBack, chevronDownOutline, scanOutline });
    vi.clearAllMocks();
    findCover.mockResolvedValue(null);
    await TestBed.configureTestingModule({
      imports: [BookForm],
      providers: [
        provideRouter([]),
        { provide: ModalController, useValue: { dismiss } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map(), data: {} } } },
        { provide: BookStore, useValue: { books: signal([]), tags: signal([]), saveBook } },
        { provide: OpenLibraryCoverService, useValue: { find: findCover, lookupByIsbn } },
        { provide: BookBarcodeScannerService, useValue: { scan } },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(BookForm);
    fixture.detectChanges();
  });

  it('closes the embedded form on cancel without navigating', () => {
    fixture.componentRef.setInput('embedded', true);
    fixture.componentInstance.cancel();
    expect(dismiss).toHaveBeenCalled();
    expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
  });

  it('opens a finished book directly on its ratings and review fields', async () => {
    const snapshot = TestBed.inject(ActivatedRoute).snapshot;
    vi.spyOn(snapshot.paramMap, 'get').mockReturnValue('book-1');
    Object.assign(snapshot, { queryParamMap: new Map([['review', 'true']]) });
    Object.assign(TestBed.inject(BookStore), {
      getBook: vi.fn().mockResolvedValue({
        id: 'book-1',
        title: 'Finished book',
        author: 'Author',
        category: 'Fantasy',
        status: 'Finished',
        rating: 4,
        review: 'Existing review',
        copies: [],
        moodTagIds: [],
        genreTagIds: [],
      }),
    });
    const reviewFixture = TestBed.createComponent(BookForm);
    await reviewFixture.whenStable();
    expect(reviewFixture.componentInstance.showEditor()).toBe(true);
    expect(reviewFixture.componentInstance.step()).toBe(2);
    expect(reviewFixture.componentInstance.form.controls.rating.value).toBe(4);
    expect(
      reviewFixture.nativeElement.querySelector('textarea[formControlName="review"]')?.value,
    ).toBe('Existing review');
  });

  it('dismisses the sheet after saving and stays on the current screen', async () => {
    fixture.componentRef.setInput('embedded', true);
    fixture.componentInstance.form.patchValue({
      title: 'New book',
      author: 'Author',
      category: 'Fantasy',
      pageCount: 300,
    });
    await fixture.componentInstance.save();
    expect(dismiss).toHaveBeenCalledWith(undefined, 'saved');
    expect(TestBed.inject(Router).navigateByUrl).not.toHaveBeenCalled();
  });

  it('saves a completed book after moving from basics to details', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({
      title: 'Test Book',
      author: 'Author',
      category: 'Fantasy',
      pageCount: 300,
    });
    component.nextStep();
    fixture.detectChanges();
    expect(component.step()).toBe(2);
    expect(component.form.valid).toBe(true);
    await component.save();
    expect(component.error()).toBe('');
    expect(saveBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test Book', pageCount: 300 }),
      undefined,
    );
  });

  it('advances the embedded add-book form using its footer Next button', async () => {
    fixture.componentRef.setInput('embedded', true);
    fixture.componentInstance.form.patchValue({
      title: 'New book',
      author: 'Author',
      category: 'Fantasy',
      pageCount: 300,
    });
    fixture.detectChanges();
    const next = fixture.nativeElement.querySelector(
      '.book-sheet-footer button[type="submit"]',
    ) as HTMLButtonElement;
    expect(next.textContent).toContain('Next');
    expect(next.form?.id).toBe('book-editor-form');
    next.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.step()).toBe(2);
    expect(next.textContent).toContain('Save Book');
    expect(saveBook).not.toHaveBeenCalled();
  });

  it('saves Kindle settings without creating reading activity', async () => {
    const component = fixture.componentInstance;
    component.trackingMode.set('locations');
    component.form.patchValue({
      title: 'Kindle Book',
      author: 'Author',
      category: 'Fantasy',
      totalLocations: 4500,
      currentLocation: 900,
    });
    await component.save();
    expect(saveBook).toHaveBeenCalledWith(
      expect.objectContaining({
        progressMode: 'locations',
        totalLocations: 4500,
        currentLocation: 900,
        locationsPerPage: 15,
        pageCount: 0,
        locationEntries: [],
      }),
      undefined,
    );
  });
  it('rejects a Kindle position above the total', async () => {
    const component = fixture.componentInstance;
    component.trackingMode.set('locations');
    component.form.patchValue({
      title: 'Kindle Book',
      author: 'Author',
      category: 'Fantasy',
      totalLocations: 4500,
      currentLocation: 4501,
    });
    await component.save();
    expect(saveBook).not.toHaveBeenCalled();
    expect(component.error()).toContain('Current location');
  });

  it('keeps a scanned ISBN when catalogue requests fail', async () => {
    scan.mockResolvedValue('9780140328721');
    lookupByIsbn.mockRejectedValue(new Error('Book lookup could not be completed.'));
    await fixture.componentInstance.scanBook();
    expect(fixture.componentInstance.form.controls.isbn.value).toBe('9780140328721');
    expect(fixture.componentInstance.error()).toContain('lookup could not be completed');
  });
  it('keeps partial scanned details and asks for the missing author', async () => {
    scan.mockResolvedValue('9780140328721');
    lookupByIsbn.mockResolvedValue({
      title: 'Matilda',
      author: '',
      category: 'Other',
      publicationDate: '',
      coverUrl: '',
    });
    await fixture.componentInstance.scanBook();
    expect(fixture.componentInstance.form.controls.title.value).toBe('Matilda');
    expect(fixture.componentInstance.scanMessage()).toContain('missing author');
    expect(fixture.componentInstance.error()).toBe('');
  });
  it('allows mixed audio and Kindle copies to track by percentage without pages', async () => {
    const p = fixture.componentInstance;
    p.form.patchValue({ title: 'Mixed', author: 'Author', category: 'Fantasy', progress: 55 });
    p.updateCopy(p.copies()[0].id, 'format', 'Audiobook');
    p.addCopy();
    p.updateCopy(p.copies()[1].id, 'format', 'Kindle');
    p.trackingMode.set('percent');
    await p.save();
    expect(p.error()).toBe('');
    expect(saveBook).toHaveBeenCalledWith(
      expect.objectContaining({ progressMode: 'percent', pageCount: 0, progress: 55 }),
      undefined,
    );
  });
  it('keeps an optional print page count synchronized with percentage tracking', async () => {
    const p = fixture.componentInstance;
    p.form.patchValue({
      title: 'Mixed',
      author: 'Author',
      category: 'Fantasy',
      progress: 50,
      pageCount: 657,
    });
    p.addCopy();
    p.updateCopy(p.copies()[1].id, 'format', 'Audiobook');
    p.trackingMode.set('percent');
    await p.save();
    expect(saveBook).toHaveBeenCalledWith(
      expect.objectContaining({
        progressMode: 'percent',
        pageProgress: 329,
        progress: 50,
        pageCount: 657,
      }),
      undefined,
    );
  });
  it('saves an audiobook without a page count', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({ title: 'Test Book', author: 'Author', category: 'Fantasy' });
    component.updateCopy(component.copies()[0].id, 'format', 'Audiobook');
    fixture.detectChanges();
    component.nextStep();
    fixture.detectChanges();
    await component.save();
    expect(component.error()).toBe('');
    expect(saveBook).toHaveBeenCalled();
  });

  it('requires pages again when switching from audiobook to paperback', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({ title: 'Test Book', author: 'Author', category: 'Fantasy' });
    component.updateCopy(component.copies()[0].id, 'format', 'Audiobook');
    fixture.detectChanges();
    component.updateCopy(component.copies()[0].id, 'format', 'Paperback');
    fixture.detectChanges();
    component.nextStep();
    expect(component.step()).toBe(1);
    expect(component.error()).toBe('Enter the number of pages for this book.');
    await component.save();
    expect(saveBook).not.toHaveBeenCalled();
  });

  it('still rejects missing required book details', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({
      title: '   ',
      author: 'Author',
      category: 'Fantasy',
      pageCount: 300,
    });
    await component.save();
    expect(component.error()).toBe('Enter a title, author and main category.');
    expect(saveBook).not.toHaveBeenCalled();
  });

  it('does not let an earlier title lookup overwrite a scanned ISBN cover', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({
      title: 'Test Book',
      author: 'Author',
      category: 'Fantasy',
      pageCount: 300,
    });
    let resolveCover!: (cover: string) => void;
    findCover.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCover = resolve;
      }),
    );
    const pendingLookup = component.lookupCover();
    scan.mockResolvedValue('9780140328721');
    lookupByIsbn.mockResolvedValue({
      title: 'Test Book',
      author: 'Author',
      category: 'Fantasy',
      publicationDate: '',
      coverUrl: 'isbn-cover',
    });
    await component.scanBook();
    resolveCover('wrong-title-cover');
    await pendingLookup;
    expect(component.form.controls.coverUrl.value).toBe('isbn-cover');
    await component.save();
    expect(saveBook).toHaveBeenCalledWith(
      expect.objectContaining({ coverUrl: 'isbn-cover', isbn: '9780140328721' }),
      undefined,
    );
  });

  it('waits for an ISBN cover lookup before saving', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({
      title: 'Test Book',
      author: 'Author',
      category: 'Fantasy',
      pageCount: 300,
      isbn: '9780140328721',
      coverUrl: 'old-cover',
    });
    let resolveCover!: (cover: string) => void;
    findCover.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCover = resolve;
      }),
    );
    const lookup = component.lookupCover();
    const save = component.save();
    expect(saveBook).not.toHaveBeenCalled();
    resolveCover('isbn-cover');
    await Promise.all([lookup, save]);
    expect(saveBook).toHaveBeenCalledWith(
      expect.objectContaining({ coverUrl: 'isbn-cover' }),
      undefined,
    );
  });
});
