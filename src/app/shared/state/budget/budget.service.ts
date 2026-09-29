import { inject, Injectable } from '@angular/core';
import { FirestoreDocument, FirestoreService, FirestoreValue } from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { AuthService } from '../authentication/authentication.service';
import { BudgetCategory, BudgetTransaction, CATEGORY_ICONS, CATEGORY_TYPES, TransactionInput, validateTransaction } from './budget.model';

function fields(record: object): Record<string, FirestoreValue> {
  return Object.fromEntries(Object.entries(record).filter(([key, value]) => key !== 'id' && value !== undefined).map(([key, value]) => [key,
    typeof value === 'number' ? { doubleValue: value } : typeof value === 'boolean' ? { booleanValue: value } : { stringValue: String(value) }]));
}
function decode<T>(doc: FirestoreDocument): T {
  return { ...Object.fromEntries(Object.entries(doc.fields ?? {}).map(([key, value]) => [key, value.stringValue ?? value.doubleValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.booleanValue)])), id: doc.name.split('/').at(-1) } as T;
}
@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);
  private readonly photos = inject(StoragePhotoService);

  async load(): Promise<{ transactions: BudgetTransaction[]; categories: BudgetCategory[] }> {
    const { uid, token } = await this.auth.getSession();
    const [transactions, categories] = await Promise.all([
      this.firestore.listDocuments(`budgets/${uid}/transactions`, token),
      this.firestore.listDocuments(`budgets/${uid}/categories`, token),
    ]);
    return { transactions: transactions.map(x => decode<BudgetTransaction>(x)), categories: categories.map(x => decode<BudgetCategory>(x)) };
  }

  async saveTransaction(input: TransactionInput, id?: string, localReceipt?: string): Promise<BudgetTransaction> {
    validateTransaction(input);
    const { uid, token } = await this.auth.getSession();
    const record = { ...input, title: input.title.trim(), amount: Math.round(input.amount * 100) / 100, id: id ?? crypto.randomUUID() };
    let upload: { path: string; url: string } | undefined;
    try {
      if (localReceipt) {
        upload = await this.photos.uploadBudgetReceipt(uid, record.id, localReceipt, token);
        record.receiptUrl = upload.url;
        record.receiptPath = upload.path;
      }
      if (id) await this.firestore.updateDocument(`budgets/${uid}/transactions/${encodeURIComponent(id)}`, fields(record), token);
      else await this.firestore.createDocument(`budgets/${uid}/transactions`, record.id, fields(record), token);
    } catch (error) {
      if (upload) await this.photos.deletePhoto(upload.path, token).catch(() => undefined);
      throw error;
    }
    return record;
  }

  async deleteTransaction(id: string): Promise<void> {
    const { uid, token } = await this.auth.getSession();
    await this.firestore.deleteDocument(`budgets/${uid}/transactions`, id, token);
  }

  async removeReceipt(path: string): Promise<void> {
    if (!path) return;
    const { uid, token } = await this.auth.getSession();
    if (!path.startsWith(`users/${uid}/budget/`)) throw new Error('Invalid receipt path.');
    await this.photos.deletePhoto(path, token);
  }

  async saveCategory(category: BudgetCategory): Promise<BudgetCategory> {
    if (!category.name.trim() || category.name.length > 40) throw new Error('Enter a category name of up to 40 characters.');
    if (!CATEGORY_TYPES.includes(category.type) || !CATEGORY_ICONS.includes(category.icon) || !/^#[\da-f]{6}$/i.test(category.colour)) throw new Error('Choose a valid category type, icon and colour.');
    if (!Number.isInteger(category.order) || category.order < 0) throw new Error('Enter a whole display order of zero or more.');
    const { uid, token } = await this.auth.getSession();
    const record: BudgetCategory = { id: category.id, name: category.name.trim(), type: category.type, icon: category.icon, colour: category.colour, order: category.order, deleted: category.deleted ?? false };
    // PATCH also creates an override for a starter category on its first edit.
    await this.firestore.updateDocument(`budgets/${uid}/categories/${encodeURIComponent(record.id)}`, fields(record), token);
    return record;
  }
}
