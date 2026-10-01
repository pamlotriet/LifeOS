import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { OpenLibraryCoverService } from './open-library-cover.service';
import { BookService } from './book.service';
import { BookInput, BookRecord, BookTag } from './book.model';
import { DEFAULT_GENRE_TAGS, GENRE_SEED_ID } from './default-genre-tags';

describe('BookService', () => {
  const getSession = vi.fn();
  const listDocuments = vi.fn();
  const createDocument = vi.fn();
  const updateDocument = vi.fn();
  const updateDocumentField = vi.fn();
  const getDocument = vi.fn();
  const commitWrites = vi.fn();
  const deleteDocument = vi.fn();
  const documentName = vi.fn((path: string) => `projects/test/databases/(default)/documents/${path}`);
  const findCover = vi.fn();
  const service = () => runInInjectionContext(Injector.create({ providers: [
    { provide: AuthService, useValue: { getSession } },
    { provide: FirestoreService, useValue: { listDocuments, createDocument, updateDocument, updateDocumentField, getDocument, commitWrites, deleteDocument, documentName } },
    { provide: OpenLibraryCoverService, useValue: { find: findCover } },
  ] }), () => new BookService());
  const input: BookInput = {
    title: 'Test Book', author: 'Author', category: 'Fantasy', coverUrl: '', isbn: '9780140328721',
    publicationDate: '', status: 'Reading', progress: 0, pageCount: 0, pageProgress: 0, rating: 4, spiceRating: 3, wheelSelected: false, favourite: true, wouldRecommend: false, reread: false,
    seriesName: 'Series', seriesNumber: 2, startDate: '', finishDate: '', yearRead: null, review: '',
    copies: [{ id: 'copy-1', format: 'Paperback', label: '' }, { id: 'copy-2', format: 'Audiobook', label: 'Unabridged' }],
    moodTagIds: ['mood-1'], genreTagIds: ['genre-1'],
  };
  beforeEach(() => { vi.clearAllMocks(); getSession.mockResolvedValue({ uid: 'user-1', token: 'id-token' }); findCover.mockResolvedValue('https://covers.openlibrary.org/b/id/123-M.jpg?default=false'); });

  it('saves independent copies and both kinds of tags under the signed-in user', async () => {
    await service().saveBook(input);
    expect(createDocument).toHaveBeenCalledWith('users/user-1/books', expect.any(String), expect.objectContaining({
      copies: { arrayValue: { values: [
        { mapValue: { fields: { id: { stringValue: 'copy-1' }, format: { stringValue: 'Paperback' }, label: { stringValue: '' } } } },
        { mapValue: { fields: { id: { stringValue: 'copy-2' }, format: { stringValue: 'Audiobook' }, label: { stringValue: 'Unabridged' } } } },
      ] } },
      moodTagIds: { arrayValue: { values: [{ stringValue: 'mood-1' }] } },
      genreTagIds: { arrayValue: { values: [{ stringValue: 'genre-1' }] } },
      coverUrl: { stringValue: 'https://covers.openlibrary.org/b/id/123-M.jpg?default=false' },
      spiceRating: { integerValue: '3' },
      wheelSelected: { booleanValue: false },
    }), 'id-token');
    expect(findCover).toHaveBeenCalledWith('Test Book', 'Author', '9780140328721');
  });

  it('adds starter genres once without duplicating existing genre names', async () => {
    listDocuments.mockResolvedValue([{ name: 'users/user-1/bookTags/custom', fields: {
      name: { stringValue: ' fantasy ' }, type: { stringValue: 'genre' }, color: { stringValue: '#ffffff' },
    } }]);
    const tags = await service().listTags();
    expect(tags).toHaveLength(DEFAULT_GENRE_TAGS.length);
    expect(tags.find(tag => tag.id === 'custom')?.color).toBe('#ffffff');
    expect(tags.some(tag => tag.id === 'genre-fantasy')).toBe(false);
    expect(commitWrites).toHaveBeenCalledTimes(1);
    expect(commitWrites.mock.calls[0][0].at(-1).update.name).toContain(GENRE_SEED_ID);
  });

  it('does not restore removed starter genres on later loads', async () => {
    listDocuments.mockResolvedValue([{ name: `users/user-1/bookTags/${GENRE_SEED_ID}`, fields: { seeded: { booleanValue: true } } }]);
    expect(await service().listTags()).toEqual([]);
    expect(commitWrites).not.toHaveBeenCalled();
  });

  it('loads older books without a spice rating as unrated', async () => {
    getDocument.mockResolvedValue({ name: 'projects/test/databases/(default)/documents/users/user-1/books/book-1', fields: {
      title: { stringValue: 'Test Book' }, author: { stringValue: 'Author' },
    } });
    expect((await service().getBook('book-1')).spiceRating).toBe(0);
  });

  it('reads the stored year for yearly goal progress even without a finish date', async () => {
    getDocument.mockResolvedValue({ name: 'projects/test/databases/(default)/documents/users/user-1/books/book-1', fields: {
      title: { stringValue: 'Test Book' }, author: { stringValue: 'Author' }, status: { stringValue: 'Finished' },
      yearRead: { integerValue: '2026' }, finishDate: { stringValue: '' },
    } });
    expect((await service().getBook('book-1')).yearRead).toBe(2026);
  });

  it('does not assign a reading year when a finished book has no valid finish date', async () => {
    await service().saveBook({ ...input, status: 'Finished', finishDate: '', yearRead: 2026 });
    expect(createDocument).toHaveBeenCalledWith('users/user-1/books', expect.any(String), expect.objectContaining({
      yearRead: { nullValue: null },
    }), 'id-token');
  });

  it('derives the reading year from the finish date', async () => {
    await service().saveBook({ ...input, status: 'Finished', finishDate: '2025-12-31', yearRead: 2026 });
    expect(createDocument).toHaveBeenCalledWith('users/user-1/books', expect.any(String), expect.objectContaining({
      yearRead: { integerValue: '2025' },
    }), 'id-token');
  });

  it('saves wheel membership on the signed-in user book', async () => {
    await service().setWheelSelected('book-1', true);
    expect(updateDocumentField).toHaveBeenCalledWith(
      'users/user-1/books', 'book-1', 'wheelSelected', { booleanValue: true }, 'id-token',
    );
  });

  it('removes a deleted tag from affected books in one commit', async () => {
    const tag: BookTag = { id: 'mood-1', name: 'Cozy', type: 'mood', color: '#47b9fa' };
    const book: BookRecord = { ...input, id: 'book-1' };
    await service().deleteTag(tag, [book]);
    expect(commitWrites).toHaveBeenCalledWith([
      expect.objectContaining({ updateMask: { fieldPaths: ['moodTagIds'] }, update: expect.objectContaining({ fields: { moodTagIds: { arrayValue: { values: [] } } } }) }),
      { delete: 'projects/test/databases/(default)/documents/users/user-1/bookTags/mood-1' },
    ], 'id-token');
  });

  it('retries Open Library when an existing book has no cover', async () => {
    getDocument.mockResolvedValue({ name: 'projects/test/databases/(default)/documents/users/user-1/books/book-1', fields: {
      title: { stringValue: 'Test Book' }, author: { stringValue: 'Author' }, coverUrl: { stringValue: '' },
    } });
    await service().saveBook(input, 'book-1');
    expect(findCover).toHaveBeenCalledWith('Test Book', 'Author', '9780140328721');
    expect(updateDocument).toHaveBeenCalledWith('users/user-1/books/book-1', expect.objectContaining({
      coverUrl: { stringValue: 'https://covers.openlibrary.org/b/id/123-M.jpg?default=false' },
    }), 'id-token');
  });

  it('keeps an existing Google Books cover when the title, author and ISBN are unchanged', async () => {
    const coverUrl = 'https://books.google.com/books/content?id=example';
    getDocument.mockResolvedValue({ name: 'projects/test/databases/(default)/documents/users/user-1/books/book-1', fields: {
      title: { stringValue: 'Test Book' }, author: { stringValue: 'Author' }, isbn: { stringValue: input.isbn }, coverUrl: { stringValue: coverUrl },
    } });
    await service().saveBook(input, 'book-1');
    expect(updateDocument).toHaveBeenCalledWith('users/user-1/books/book-1', expect.objectContaining({
      coverUrl: { stringValue: coverUrl },
    }), 'id-token');
    expect(findCover).not.toHaveBeenCalled();
  });

  it('persists the scanned preview cover for a new book without searching again', async () => {
    const coverUrl = 'https://covers.openlibrary.org/b/id/456-L.jpg?default=false';
    const saved = await service().saveBook({ ...input, coverUrl });
    expect(saved.coverUrl).toBe(coverUrl);
    expect(createDocument).toHaveBeenCalledWith('users/user-1/books', saved.id,
      expect.objectContaining({ coverUrl: { stringValue: coverUrl } }), 'id-token');
    expect(findCover).not.toHaveBeenCalled();
  });

  it('replaces a saved wrong cover with the newly selected preview', async () => {
    const coverUrl = 'https://covers.openlibrary.org/b/isbn/9780140328721-L.jpg?default=false';
    getDocument.mockResolvedValue({ name: 'users/user-1/books/book-1', fields: {
      title: { stringValue: input.title }, author: { stringValue: input.author },
      isbn: { stringValue: input.isbn }, coverUrl: { stringValue: 'old-cover' },
    } });
    const saved = await service().saveBook({ ...input, coverUrl }, 'book-1');
    expect(saved.coverUrl).toBe(coverUrl);
    expect(updateDocument).toHaveBeenCalledWith('users/user-1/books/book-1',
      expect.objectContaining({ coverUrl: { stringValue: coverUrl } }), 'id-token');
    expect(findCover).not.toHaveBeenCalled();
  });

  it('looks up the new ISBN if the form still contains the old edition cover', async () => {
    getDocument.mockResolvedValue({ name: 'users/user-1/books/book-1', fields: {
      title: { stringValue: input.title }, author: { stringValue: input.author },
      isbn: { stringValue: 'old-isbn' }, coverUrl: { stringValue: 'old-cover' },
    } });
    const saved = await service().saveBook({ ...input, coverUrl: 'old-cover' }, 'book-1');
    expect(findCover).toHaveBeenCalledWith(input.title, input.author, input.isbn);
    expect(saved.coverUrl).toBe('https://covers.openlibrary.org/b/id/123-M.jpg?default=false');
  });
});
