import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { BookService } from './book.service';
import { BookInput, BookRecord, BookTag } from './book.model';

describe('BookService', () => {
  const getSession = vi.fn();
  const listDocuments = vi.fn();
  const createDocument = vi.fn();
  const updateDocument = vi.fn();
  const getDocument = vi.fn();
  const commitWrites = vi.fn();
  const deleteDocument = vi.fn();
  const documentName = vi.fn((path: string) => `projects/test/databases/(default)/documents/${path}`);
  const uploadBookCover = vi.fn();
  const deletePhoto = vi.fn();
  const service = () => runInInjectionContext(Injector.create({ providers: [
    { provide: AuthService, useValue: { getSession } },
    { provide: FirestoreService, useValue: { listDocuments, createDocument, updateDocument, getDocument, commitWrites, deleteDocument, documentName } },
    { provide: StoragePhotoService, useValue: { uploadBookCover, deletePhoto } },
  ] }), () => new BookService());
  const input: BookInput = {
    title: 'Test Book', author: 'Author', category: 'Fantasy', coverUrl: '', coverStoragePath: '',
    publicationDate: '', status: 'Reading', rating: 4, favourite: true, wouldRecommend: false, reread: false,
    seriesName: 'Series', seriesNumber: 2, startDate: '', finishDate: '', review: '',
    copies: [{ id: 'copy-1', format: 'Paperback', label: '' }, { id: 'copy-2', format: 'Audiobook', label: 'Unabridged' }],
    moodTagIds: ['mood-1'], genreTagIds: ['genre-1'],
  };
  beforeEach(() => { vi.clearAllMocks(); getSession.mockResolvedValue({ uid: 'user-1', token: 'id-token' }); });

  it('saves independent copies and both kinds of tags under the signed-in user', async () => {
    await service().saveBook(input);
    expect(createDocument).toHaveBeenCalledWith('users/user-1/books', expect.any(String), expect.objectContaining({
      copies: { arrayValue: { values: [
        { mapValue: { fields: { id: { stringValue: 'copy-1' }, format: { stringValue: 'Paperback' }, label: { stringValue: '' } } } },
        { mapValue: { fields: { id: { stringValue: 'copy-2' }, format: { stringValue: 'Audiobook' }, label: { stringValue: 'Unabridged' } } } },
      ] } },
      moodTagIds: { arrayValue: { values: [{ stringValue: 'mood-1' }] } },
      genreTagIds: { arrayValue: { values: [{ stringValue: 'genre-1' }] } },
    }), 'id-token');
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
});
