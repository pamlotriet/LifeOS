import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookForm } from './book-form';
import { BookStore } from '../../shared/state/books/book-store';
import { OpenLibraryCoverService } from '../../shared/state/books/open-library-cover.service';
import { BookBarcodeScannerService } from '../../shared/state/books/book-barcode-scanner.service';
import { addIcons } from 'ionicons';
import { book, calendarOutline, chevronBack, chevronDownOutline, scanOutline } from 'ionicons/icons';

describe('BookForm', () => {
  let fixture: ComponentFixture<BookForm>;
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
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map(), data: {} } } },
        { provide: BookStore, useValue: { tags: signal([]), saveBook } },
        { provide: OpenLibraryCoverService, useValue: { find: findCover, lookupByIsbn } },
        { provide: BookBarcodeScannerService, useValue: { scan } },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(BookForm);
    fixture.detectChanges();
  });

  it('saves a completed book after moving from basics to details', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({ title: 'Test Book', author: 'Author', category: 'Fantasy', pageCount: 300 });
    component.nextStep();
    fixture.detectChanges();
    expect(component.step()).toBe(2);
    expect(component.form.valid).toBe(true);
    await component.save();
    expect(component.error()).toBe('');
    expect(saveBook).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test Book', pageCount: 300 }), undefined);
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
    component.form.patchValue({ title: '   ', author: 'Author', category: 'Fantasy', pageCount: 300 });
    await component.save();
    expect(component.error()).toBe('Enter a title, author and main category.');
    expect(saveBook).not.toHaveBeenCalled();
  });

  it('does not let an earlier title lookup overwrite a scanned ISBN cover', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({ title: 'Test Book', author: 'Author', category: 'Fantasy', pageCount: 300 });
    let resolveCover!: (cover: string) => void;
    findCover.mockReturnValue(new Promise<string>(resolve => { resolveCover = resolve; }));
    const pendingLookup = component.lookupCover();
    scan.mockResolvedValue('9780140328721');
    lookupByIsbn.mockResolvedValue({ title: 'Test Book', author: 'Author', category: 'Fantasy',
      publicationDate: '', coverUrl: 'isbn-cover' });
    await component.scanBook();
    resolveCover('wrong-title-cover');
    await pendingLookup;
    expect(component.form.controls.coverUrl.value).toBe('isbn-cover');
    await component.save();
    expect(saveBook).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: 'isbn-cover', isbn: '9780140328721' }), undefined);
  });

  it('waits for an ISBN cover lookup before saving', async () => {
    const component = fixture.componentInstance;
    component.form.patchValue({ title: 'Test Book', author: 'Author', category: 'Fantasy', pageCount: 300,
      isbn: '9780140328721', coverUrl: 'old-cover' });
    let resolveCover!: (cover: string) => void;
    findCover.mockReturnValue(new Promise<string>(resolve => { resolveCover = resolve; }));
    const lookup = component.lookupCover();
    const save = component.save();
    expect(saveBook).not.toHaveBeenCalled();
    resolveCover('isbn-cover');
    await Promise.all([lookup, save]);
    expect(saveBook).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: 'isbn-cover' }), undefined);
  });
});
