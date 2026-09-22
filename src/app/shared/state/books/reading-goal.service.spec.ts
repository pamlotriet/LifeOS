import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { ReadingGoalService } from './reading-goal.service';

describe('ReadingGoalService', () => {
  const getSession = vi.fn();
  const listDocuments = vi.fn();
  const createDocument = vi.fn();
  const updateDocument = vi.fn();
  const service = () => runInInjectionContext(Injector.create({ providers: [
    { provide: AuthService, useValue: { getSession } },
    { provide: FirestoreService, useValue: { listDocuments, createDocument, updateDocument } },
  ] }), () => new ReadingGoalService());

  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ uid: 'user-1', token: 'id-token' });
  });

  it('loads the goal for the requested year under the signed-in user', async () => {
    listDocuments.mockResolvedValue([{ name: 'projects/test/databases/(default)/documents/users/user-1/readingGoals/2026', fields: {
      target: { integerValue: '30' },
    } }]);
    expect(await service().get(2026)).toBe(30);
    expect(await service().get(2027)).toBeNull();
    expect(listDocuments).toHaveBeenCalledWith('users/user-1/readingGoals', 'id-token');
  });

  it('creates a new goal and updates an existing goal', async () => {
    await service().save(2026, 30, false);
    expect(createDocument).toHaveBeenCalledWith('users/user-1/readingGoals', '2026', {
      target: { integerValue: '30' }, year: { integerValue: '2026' },
    }, 'id-token');
    await service().save(2026, 40, true);
    expect(updateDocument).toHaveBeenCalledWith('users/user-1/readingGoals/2026', {
      target: { integerValue: '40' }, year: { integerValue: '2026' },
    }, 'id-token');
  });

  it('rejects invalid goals before writing to Firestore', async () => {
    await expect(service().save(2026, 0, false)).rejects.toThrow('between 1 and 1000');
    expect(createDocument).not.toHaveBeenCalled();
  });
});
