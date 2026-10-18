import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { BookService } from './book.service';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { OpenLibraryCoverService } from './open-library-cover.service';
import { createBookBackup } from './book-transfer';
import { BookRecord } from './book.model';
const base: BookRecord = {
  id: 'a',
  title: 'Title',
  author: 'Author',
  category: 'Other',
  coverUrl: '',
  isbn: '',
  publicationDate: '',
  status: 'Not Started',
  progress: 0,
  pageCount: 0,
  pageProgress: 0,
  rating: 0,
  spiceRating: 0,
  wheelSelected: false,
  favourite: false,
  wouldRecommend: false,
  reread: false,
  seriesName: '',
  seriesNumber: null,
  startDate: '',
  finishDate: '',
  yearRead: null,
  review: '',
  copies: [{ id: 'copy', format: 'Paperback', label: '' }],
  moodTagIds: [],
  genreTagIds: [],
};
function fixture() {
  const listDocuments = vi.fn().mockResolvedValue([]);
  const commitWrites = vi.fn().mockResolvedValue(undefined);
  const service = runInInjectionContext(
    Injector.create({
      providers: [
        {
          provide: AuthService,
          useValue: { userId: () => 'me', getSession: async () => ({ uid: 'me', token: 'token' }) },
        },
        {
          provide: FirestoreService,
          useValue: { listDocuments, commitWrites, documentName: (path: string) => path },
        },
        { provide: OpenLibraryCoverService, useValue: {} },
      ],
    }),
    () => new BookService(),
  );
  return { service, listDocuments, commitWrites };
}
describe('Book import persistence', () => {
  it('writes validated backups to the signed-in user in bounded batches with create-only guards', async () => {
    const { service, commitWrites } = fixture();
    const books = Array.from({ length: 205 }, (_, i) => ({
      ...base,
      id: `book-${i}`,
      title: `Title ${i}`,
    }));
    const progress = vi.fn();
    expect(await service.importLibrary(createBookBackup(books, []), false, progress)).toEqual({
      added: 205,
      updated: 0,
      skipped: 0,
    });
    expect(commitWrites).toHaveBeenCalledTimes(3);
    expect(commitWrites.mock.calls.map((c) => c[0].length)).toEqual([100, 100, 5]);
    expect(commitWrites.mock.calls[0][0][0]).toMatchObject({
      update: { name: 'users/me/books/book-0' },
      currentDocument: { exists: false },
    });
    expect(progress).toHaveBeenLastCalledWith(205, 205);
  });
  it('updates matching IDs only when requested and guards against concurrent edits', async () => {
    const { service, listDocuments, commitWrites } = fixture();
    listDocuments.mockImplementation(async (path: string) =>
      path.endsWith('/books')
        ? [{ name: 'users/me/books/a', fields: {}, updateTime: '2026-10-18T10:00:00Z' }]
        : [],
    );
    expect((await service.importLibrary(createBookBackup([base], []), false)).skipped).toBe(1);
    expect(commitWrites).not.toHaveBeenCalled();
    await service.importLibrary(createBookBackup([base], []), true);
    expect(commitWrites.mock.calls[0][0][0].currentDocument).toEqual({
      updateTime: '2026-10-18T10:00:00Z',
    });
    expect(commitWrites.mock.calls[0][0][0].updateMask.fieldPaths).toContain('category');
  });
  it('reports partial completion when a later batch fails', async () => {
    const { service, commitWrites } = fixture();
    commitWrites.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Offline'));
    await expect(
      service.importLibrary(
        createBookBackup(
          Array.from({ length: 105 }, (_, i) => ({
            ...base,
            id: `book-${i}`,
            title: `Title ${i}`,
          })),
          [],
        ),
        false,
      ),
    ).rejects.toThrow('saving 100 of 105 books');
  });
  it('exports the complete user collection and excludes internal seed markers', async () => {
    const { service, listDocuments } = fixture();
    listDocuments.mockImplementation(async (path: string) =>
      path.endsWith('/books')
        ? [
            {
              name: 'users/me/books/a',
              fields: { title: { stringValue: 'Title' }, category: { stringValue: 'Other' } },
            },
          ]
        : [],
    );
    const backup = await service.exportLibrary();
    expect(backup.books).toHaveLength(1);
    expect(backup.books[0].category).toBe('Other');
    expect(listDocuments).toHaveBeenCalledWith('users/me/books', 'token');
  });
});
