import { inject, Injectable } from '@angular/core';
import {
  FirestoreDocument,
  FirestoreService,
  FirestoreValue,
} from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { GroceryItem, MealPlanItem } from './planning.model';

const text = (value: string): FirestoreValue => ({ stringValue: value });
const bool = (value: boolean): FirestoreValue => ({ booleanValue: value });

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);

  async listMeals(): Promise<MealPlanItem[]> {
    return this.list('mealPlan', (doc) => this.meal(doc));
  }
  async listGroceries(): Promise<GroceryItem[]> {
    return this.list('groceryItems', (doc) => this.grocery(doc));
  }

  async saveMeal(item: Omit<MealPlanItem, 'id'>, id?: string): Promise<MealPlanItem> {
    if (
      !item.date ||
      !item.title.trim() ||
      !Number.isFinite(item.servings ?? 1) ||
      (item.servings ?? 1) <= 0
    )
      throw new Error('Enter a date, title and positive servings.');
    const record = { ...item, id: id ?? crypto.randomUUID() };
    await this.save(
      'mealPlan',
      record.id,
      {
        date: text(record.date),
        title: text(record.title.trim()),
        detail: text(record.detail.trim()),
        recipeId: text(record.recipeId ?? ''),
        meal: text(record.meal ?? 'Dinner'),
        ingredientId: text(record.ingredientId ?? ''),
        quantity: { doubleValue: record.quantity ?? 100 },
        unit: text(record.unit ?? 'g'),
        servings: { doubleValue: record.servings ?? 1 },
      },
      !!id,
    );
    return record;
  }

  async saveGrocery(item: Omit<GroceryItem, 'id'>, id?: string): Promise<GroceryItem> {
    const record = { ...item, id: id ?? crypto.randomUUID() };
    await this.save(
      'groceryItems',
      record.id,
      {
        name: text(record.name.trim()),
        section: text(record.section.trim()),
        checked: bool(record.checked),
        generatedKey: text(record.generatedKey ?? ''),
      },
      !!id,
    );
    return record;
  }

  async delete(collection: string, id: string): Promise<void> {
    const { ownerId, token } = await this.scope();
    await this.firestore.deleteDocument(`users/${ownerId}/${collection}`, id, token);
  }

  private async list<T>(collection: string, convert: (doc: FirestoreDocument) => T): Promise<T[]> {
    const { ownerId, token } = await this.scope();
    return (await this.firestore.listDocuments(`users/${ownerId}/${collection}`, token)).map(
      convert,
    );
  }
  private async save(
    collection: string,
    id: string,
    fields: Record<string, FirestoreValue>,
    update: boolean,
  ): Promise<void> {
    const { ownerId, token } = await this.scope();
    const path = `users/${ownerId}/${collection}`;
    if (update)
      await this.firestore.updateDocument(`${path}/${encodeURIComponent(id)}`, fields, token);
    else await this.firestore.createDocument(path, id, fields, token);
  }
  private async scope(): Promise<{ ownerId: string; token: string }> {
    const { uid, token } = await this.auth.getSession();
    return { ownerId: uid, token };
  }
  private value(doc: FirestoreDocument, key: string): string {
    return doc.fields?.[key]?.stringValue ?? '';
  }
  private id(doc: FirestoreDocument): string {
    return doc.name.split('/').at(-1) ?? '';
  }
  private meal(doc: FirestoreDocument): MealPlanItem {
    return {
      id: this.id(doc),
      date: this.value(doc, 'date'),
      title: this.value(doc, 'title'),
      detail: this.value(doc, 'detail'),
      recipeId: this.value(doc, 'recipeId'),
      meal: (this.value(doc, 'meal') || 'Dinner') as MealPlanItem['meal'],
      ingredientId: this.value(doc, 'ingredientId'),
      quantity: Number(doc.fields?.['quantity']?.doubleValue ?? 100),
      unit: this.value(doc, 'unit') || 'g',
      servings: Number(
        doc.fields?.['servings']?.doubleValue ?? doc.fields?.['servings']?.integerValue ?? 1,
      ),
    };
  }
  private grocery(doc: FirestoreDocument): GroceryItem {
    return {
      id: this.id(doc),
      name: this.value(doc, 'name'),
      section: this.value(doc, 'section'),
      ...(this.value(doc, 'generatedKey') ? { generatedKey: this.value(doc, 'generatedKey') } : {}),
      checked: doc.fields?.['checked']?.booleanValue ?? false,
    };
  }
}
