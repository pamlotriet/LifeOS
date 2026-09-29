import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { AuthService } from '../authentication/authentication.service';
import { BudgetService } from './budget.service';
import { DEFAULT_CATEGORIES, TransactionInput } from './budget.model';

describe('BudgetService', () => {
  const getSession = vi.fn();
  const firestore = { listDocuments: vi.fn(), createDocument: vi.fn(), updateDocument: vi.fn(), deleteDocument: vi.fn() };
  const photos = { uploadBudgetReceipt: vi.fn(), deletePhoto: vi.fn() };
  const input: TransactionInput = { amount: 450.25, type: 'expense', categoryId: 'food', title: ' Groceries ', date: '2026-09-01', paymentMethod: 'Card', notes: '', receiptUrl: '', receiptPath: '' };
  const service = () => runInInjectionContext(Injector.create({ providers: [{ provide: AuthService, useValue: { getSession } }, { provide: FirestoreService, useValue: firestore }, { provide: StoragePhotoService, useValue: photos }] }), () => new BudgetService());
  beforeEach(() => { vi.resetAllMocks(); getSession.mockResolvedValue({ uid: 'owner', token: 'token' }); firestore.listDocuments.mockResolvedValue([]); photos.deletePhoto.mockResolvedValue(undefined); });
  it('scopes both collections to the signed-in user and decodes numeric values', async () => {
    firestore.listDocuments.mockResolvedValueOnce([{ name: 'budgets/owner/transactions/t1', fields: { amount: { integerValue: '45' }, type: { stringValue: 'expense' } } }]);
    const result = await service().load();
    expect(firestore.listDocuments).toHaveBeenCalledWith('budgets/owner/transactions', 'token');
    expect(firestore.listDocuments).toHaveBeenCalledWith('budgets/owner/categories', 'token');
    expect(result.transactions[0]).toMatchObject({ id: 't1', amount: 45 });
  });
  it('creates and updates transactions without duplicating them', async () => {
    await service().saveTransaction(input);
    expect(firestore.createDocument).toHaveBeenCalledWith('budgets/owner/transactions', expect.any(String), expect.objectContaining({ amount: { doubleValue: 450.25 }, title: { stringValue: 'Groceries' } }), 'token');
    await service().saveTransaction(input, 'existing');
    expect(firestore.updateDocument).toHaveBeenCalledWith('budgets/owner/transactions/existing', expect.any(Object), 'token');
    expect(firestore.createDocument).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid input before any write', async () => {
    await expect(service().saveTransaction({ ...input, amount: -1 })).rejects.toThrow();
    expect(getSession).not.toHaveBeenCalled();
  });
  it('cleans up an uploaded receipt if the document write fails', async () => {
    photos.uploadBudgetReceipt.mockResolvedValue({ path: 'receipt-path', url: 'https://receipt' });
    firestore.createDocument.mockRejectedValue(new Error('Write failed'));
    await expect(service().saveTransaction(input, undefined, 'data:image/png;base64,photo')).rejects.toThrow('Write failed');
    expect(photos.deletePhoto).toHaveBeenCalledWith('receipt-path', 'token');
  });
  it('stores receipt metadata with the transaction', async () => {
    photos.uploadBudgetReceipt.mockResolvedValue({ path: 'receipt-path', url: 'https://receipt' });
    const result = await service().saveTransaction(input, undefined, 'local-image');
    expect(result.receiptUrl).toBe('https://receipt');
    expect(firestore.createDocument).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.objectContaining({ receiptPath: { stringValue: 'receipt-path' } }), 'token');
  });
  it('saves category fields without derived UI totals', async () => {
    await service().saveCategory({ ...DEFAULT_CATEGORIES[0], amount: 450, percent: 10 } as typeof DEFAULT_CATEGORIES[0]);
    const stored = firestore.updateDocument.mock.calls[0][1];
    expect(stored['amount']).toBeUndefined(); expect(stored['percent']).toBeUndefined();
    expect(stored['name']).toEqual({ stringValue: 'Food' });
  });
  it('never deletes a receipt outside the current account', async () => {
    await expect(service().removeReceipt('users/other/budget/t1/receipt-1')).rejects.toThrow('Invalid receipt path');
    expect(photos.deletePhoto).not.toHaveBeenCalled();
  });
});
