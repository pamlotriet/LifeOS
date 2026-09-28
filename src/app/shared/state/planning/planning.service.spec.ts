import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { PlanningService } from './planning.service';

describe('PlanningService', () => {
  const getSession = vi.fn(); const listDocuments = vi.fn(); const createDocument = vi.fn(); const updateDocument = vi.fn(); const deleteDocument = vi.fn();
  const service = () => runInInjectionContext(Injector.create({ providers: [
    { provide: AuthService, useValue: { getSession } },
    { provide: FirestoreService, useValue: { listDocuments, createDocument, updateDocument, deleteDocument, tryGetDocument: vi.fn().mockResolvedValue(null) } },
  ] }), () => new PlanningService());

  beforeEach(() => { vi.clearAllMocks(); getSession.mockResolvedValue({ uid: 'user-1', token: 'token' }); });

  it('stores events in the signed-in user collection', async () => {
    await service().saveEvent({ title: 'Family dinner', date: '2026-09-28', startTime: '13:00', endTime: '14:00', location: 'Home', notes: '', category: 'Family', repeat: 'Does not repeat', reminder: true, attendeeIds: ['user-1'] });
    expect(createDocument).toHaveBeenCalledWith('users/user-1/planningEvents', expect.any(String), expect.objectContaining({ title: { stringValue: 'Family dinner' }, reminder: { booleanValue: true } }), 'token');
  });

  it('updates reminder completion without creating a duplicate', async () => {
    await service().saveReminder({ title: 'Pay water bill', date: '2026-09-28', time: '09:00', category: 'Bills', completed: true }, 'reminder-1');
    expect(updateDocument).toHaveBeenCalledWith('users/user-1/planningReminders/reminder-1', expect.objectContaining({ completed: { booleanValue: true } }), 'token');
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('loads grocery items and their checked state', async () => {
    listDocuments.mockResolvedValue([{ name: 'projects/p/databases/(default)/documents/users/user-1/groceryItems/item-1', fields: { name: { stringValue: 'Tomatoes' }, section: { stringValue: 'Produce' }, checked: { booleanValue: true } } }]);
    await expect(service().listGroceries()).resolves.toEqual([{ id: 'item-1', name: 'Tomatoes', section: 'Produce', checked: true }]);
  });
});
