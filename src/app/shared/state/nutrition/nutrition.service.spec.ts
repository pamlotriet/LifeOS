import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import { defaultProfile, NutritionService } from './nutrition.service';
describe('Personal nutrition persistence', () => {
  const userId = signal('member');
  const updateDocument = vi.fn();
  const listDocuments = vi.fn();
  const deleteDocument = vi.fn();
  const tryGetDocument = vi.fn();
  const createDocument = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    userId.set('member');
    tryGetDocument.mockResolvedValue(null);
    createDocument.mockResolvedValue({});
    listDocuments.mockResolvedValue([]);
    updateDocument.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { userId, getSession: async () => ({ uid: userId(), token: 'token' }) },
        },
        {
          provide: FirestoreService,
          useValue: {
            updateDocument,
            listDocuments,
            deleteDocument,
            tryGetDocument,
            createDocument,
          },
        },
        { provide: RefreshCoordinator, useValue: { register: vi.fn() } },
      ],
    });
  });
  it('saves intake to the signed-in member rather than the family owner', async () => {
    const store = TestBed.inject(NutritionService);
    const nutrition = { calories: 250, protein: 20, carbs: 10, fat: 12 };
    await store.log('2026-10-16', 'Dinner', '1 serving', nutrition);
    expect(updateDocument).toHaveBeenCalledWith(
      expect.stringMatching(/^users\/member\/nutrition\//),
      expect.objectContaining({ kind: { stringValue: 'log' } }),
      'token',
    );
    const fields = updateDocument.mock.calls[0][1];
    expect(JSON.parse(fields.data.stringValue).nutrition).toEqual(nutrition);
  });
  it('does not add a local entry when persistence fails', async () => {
    const store = TestBed.inject(NutritionService);
    updateDocument.mockRejectedValueOnce(new Error('Offline'));
    await expect(
      store.log('2026-10-16', 'Dinner', '1 serving', { calories: 1, protein: 0, carbs: 0, fat: 0 }),
    ).rejects.toThrow('Offline');
    expect(store.logs()).toEqual([]);
  });
  it('restores the saved profile, food database and diary', async () => {
    const store = TestBed.inject(NutritionService);
    const food = { id: 'food', name: 'Steak', calories: 200, protein: 20, carbs: 0, fat: 9 };
    listDocuments.mockResolvedValue([
      {
        name: 'food',
        fields: { kind: { stringValue: 'food' }, data: { stringValue: JSON.stringify(food) } },
      },
    ]);
    await store.reload();
    expect(store.foods()).toEqual([food]);
    expect(store.logs()).toEqual([]);
  });
  it('saves calculated targets while retaining blanks for future recalculation', async () => {
    const store = TestBed.inject(NutritionService);
    await store.saveProfile({
      ...defaultProfile(),
      age: 27,
      height: 179,
      weight: 95,
      sex: 'female',
      goalWeight: 80,
    });
    const saved = JSON.parse(updateDocument.mock.calls[0][1].data.stringValue);
    expect(saved.targets.calories).toBe(1915);
    expect(saved.targetOverrides.calories).toBeNull();
    expect(saved.goalWeight).toBe(80);
  });
  it('explains how to recover from a nutrition rules permission error', async () => {
    const store = TestBed.inject(NutritionService);
    listDocuments.mockRejectedValueOnce(new Error('Could not list Firestore documents (403).'));
    await store.reload();
    expect(store.error()).toContain('Deploy the updated Firestore rules');
  });
  it('keeps ingredients and diary personal despite a legacy enabled family link', async () => {
    const store = TestBed.inject(NutritionService);
    tryGetDocument.mockImplementation(async (path: string) =>
      path.startsWith('families/')
        ? { fields: { shareRecipes: { booleanValue: true } } }
        : {
            fields: {
              familyOwnerId: { stringValue: 'owner' },
              familyId: { stringValue: 'family' },
            },
          },
    );
    await store.saveFood({
      id: 'rice',
      name: 'Rice cooked',
      calories: 130,
      protein: 3,
      carbs: 28,
      fat: 0.3,
    });
    expect(updateDocument).toHaveBeenCalledWith(
      'users/member/ingredients/rice',
      expect.objectContaining({ kind: { stringValue: 'ingredient' } }),
      'token',
    );
    await store.log('2026-10-18', 'Rice cooked', '100 g', {
      calories: 130,
      protein: 3,
      carbs: 28,
      fat: 0.3,
    });
    expect(updateDocument.mock.calls.at(-1)?.[0]).toMatch(/^users\/member\/nutrition\//);
  });
  it('keeps ingredients personal despite a legacy disabled family link', async () => {
    const store = TestBed.inject(NutritionService);
    tryGetDocument.mockImplementation(async (path: string) =>
      path.startsWith('families/')
        ? { fields: { shareRecipes: { booleanValue: false } } }
        : {
            fields: {
              familyOwnerId: { stringValue: 'owner' },
              familyId: { stringValue: 'family' },
            },
          },
    );
    await store.saveFood({
      id: 'rice',
      name: 'Rice',
      calories: 130,
      protein: 3,
      carbs: 28,
      fat: 0.3,
    });
    expect(updateDocument.mock.calls.at(-1)?.[0]).toBe('users/member/ingredients/rice');
  });
  it('snapshots values, supports explicit edits, copying and deleting without source mutation', async () => {
    const store = TestBed.inject(NutritionService);
    const nutrition = { calories: 150, protein: 22, carbs: 0, fat: 6 };
    await store.saveLog({
      date: '2026-10-18',
      meal: 'Lunch',
      name: 'Steak',
      amount: '100 g',
      quantity: 100,
      unit: 'g',
      sourceId: 'steak',
      nutrition,
    });
    nutrition.calories = 999;
    const first = store.logs()[0];
    expect(first.nutrition.calories).toBe(150);
    await store.saveLog(
      {
        ...first,
        quantity: 200,
        amount: '200 g',
        nutrition: { ...first.nutrition, calories: 300 },
      },
      first.id,
    );
    expect(store.logs()).toHaveLength(1);
    const { id, ...copy } = first;
    await store.saveLog({ ...copy, date: '2026-10-19' });
    expect(store.logs()).toHaveLength(2);
    await store.removeLog(first.id);
    expect(store.logs()[0].date).toBe('2026-10-19');
  });
  it('atomically protects planned meal snapshots across retries and permits explicit repeats', async () => {
    const store = TestBed.inject(NutritionService);
    const entry = {
      date: '2026-10-18',
      name: 'Rice',
      amount: '1 serving',
      plannedMealId: 'plan',
      nutrition: { calories: 100, protein: 1, carbs: 20, fat: 1 },
    };
    await store.saveLog(entry);
    expect(createDocument).toHaveBeenCalledWith(
      'users/member/nutrition',
      'meal-plan',
      expect.anything(),
      'token',
    );
    await expect(store.saveLog(entry)).rejects.toThrow('already logged');
    await store.saveLog(entry, undefined, true);
    expect(store.logs()).toHaveLength(2);
    expect(store.logs()[0].nutrition.calories).toBe(100);
    store.logs.set([]);
    createDocument.mockRejectedValueOnce(new Error('Could not create Firestore document (409).'));
    await expect(store.saveLog(entry)).rejects.toThrow('another device');
    expect(store.logs()).toEqual([]);
  });
});
