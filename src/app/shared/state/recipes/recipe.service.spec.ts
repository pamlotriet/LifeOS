import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { AuthService } from '../authentication/authentication.service';
import { RecipeInput } from './recipe.model';
import { RecipeService } from './recipe.service';

describe('RecipeService', () => {
  const getSession = vi.fn(); const listDocuments = vi.fn(); const createDocument = vi.fn();
  const getDocument = vi.fn(); const updateDocument = vi.fn(); const deleteDocument = vi.fn();
  const uploadRecipePhoto = vi.fn(); const deletePhoto = vi.fn();
  const service = () => runInInjectionContext(Injector.create({ providers: [
    { provide: AuthService, useValue: { getSession } },
    { provide: FirestoreService, useValue: { listDocuments, createDocument, getDocument, updateDocument, deleteDocument, tryGetDocument: vi.fn().mockResolvedValue(null) } },
    { provide: StoragePhotoService, useValue: { uploadRecipePhoto, deletePhoto } },
  ] }), () => new RecipeService());
  const input: RecipeInput = { title: 'Pasta', description: 'Creamy', category: 'Dinner', cookTime: 30, servings: 4, difficulty: 'Easy', photoUrl: '', photoPath: '', ingredients: ['300 g pasta'], steps: [{ id: 'step-1', title: 'Cook', instruction: 'Boil pasta.' }], tags: ['Quick'], source: '', sourceLink: '', notes: '', favourite: true, private: true };
  beforeEach(() => { vi.clearAllMocks(); getSession.mockResolvedValue({ uid: 'user-1', token: 'token' }); });

  it('stores ingredients and structured steps in the signed-in user collection', async () => {
    await service().save(input);
    expect(createDocument).toHaveBeenCalledWith('users/user-1/recipes', expect.any(String), expect.objectContaining({
      ingredients: { arrayValue: { values: [{ stringValue: '300 g pasta' }] } },
      steps: { arrayValue: { values: [{ mapValue: { fields: { id: { stringValue: 'step-1' }, title: { stringValue: 'Cook' }, instruction: { stringValue: 'Boil pasta.' } } } }] } },
      favourite: { booleanValue: true },
    }), 'token');
  });

  it('uploads a selected photo before saving its Firebase URL', async () => {
    uploadRecipePhoto.mockResolvedValue({ path: 'users/user-1/recipes/id/photo', url: 'https://storage/photo' });
    await service().save({ ...input, photoUrl: 'blob:photo' });
    expect(uploadRecipePhoto).toHaveBeenCalledWith('user-1', expect.any(String), 'blob:photo', 'token');
    expect(createDocument).toHaveBeenCalledWith('users/user-1/recipes', expect.any(String), expect.objectContaining({ photoUrl: { stringValue: 'https://storage/photo' } }), 'token');
  });
});
