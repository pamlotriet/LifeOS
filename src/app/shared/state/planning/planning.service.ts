import { inject, Injectable } from '@angular/core';
import { FirestoreDocument, FirestoreService, FirestoreValue } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { GroceryItem, MealPlanItem, PlanningEvent, PlanningEventInput, PlanningReminder, PlanningReminderInput } from './planning.model';

const text = (value: string): FirestoreValue => ({ stringValue: value });
const bool = (value: boolean): FirestoreValue => ({ booleanValue: value });

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);

  async listEvents(): Promise<PlanningEvent[]> { return this.list('planningEvents', (doc) => this.event(doc)); }
  async listReminders(): Promise<PlanningReminder[]> { return this.list('planningReminders', (doc) => this.reminder(doc)); }
  async listMeals(): Promise<MealPlanItem[]> { return this.list('mealPlan', (doc) => this.meal(doc)); }
  async listGroceries(): Promise<GroceryItem[]> { return this.list('groceryItems', (doc) => this.grocery(doc)); }

  async saveEvent(input: PlanningEventInput, id?: string): Promise<PlanningEvent> {
    if (!input.title.trim() || !input.date) throw new Error('Enter an event title and date.');
    const record: PlanningEvent = { ...input, title: input.title.trim(), id: id ?? crypto.randomUUID(), createdAt: new Date().toISOString() };
    await this.save('planningEvents', record.id, {
      title: text(record.title), date: text(record.date), startTime: text(record.startTime), endTime: text(record.endTime), location: text(record.location), notes: text(record.notes), category: text(record.category), repeat: text(record.repeat), reminder: bool(record.reminder), attendeeIds: { arrayValue: { values: record.attendeeIds.map(text) } }, createdAt: { timestampValue: record.createdAt },
    }, !!id);
    return record;
  }

  async saveReminder(input: PlanningReminderInput, id?: string): Promise<PlanningReminder> {
    if (!input.title.trim() || !input.date) throw new Error('Enter a reminder title and date.');
    const record: PlanningReminder = { ...input, title: input.title.trim(), id: id ?? crypto.randomUUID(), createdAt: new Date().toISOString() };
    await this.save('planningReminders', record.id, { title: text(record.title), date: text(record.date), time: text(record.time), category: text(record.category), completed: bool(record.completed), createdAt: { timestampValue: record.createdAt } }, !!id);
    return record;
  }

  async saveMeal(item: Omit<MealPlanItem, 'id'>, id?: string): Promise<MealPlanItem> {
    const record = { ...item, id: id ?? crypto.randomUUID() };
    await this.save('mealPlan', record.id, { date: text(record.date), title: text(record.title.trim()), detail: text(record.detail.trim()) }, !!id);
    return record;
  }

  async saveGrocery(item: Omit<GroceryItem, 'id'>, id?: string): Promise<GroceryItem> {
    const record = { ...item, id: id ?? crypto.randomUUID() };
    await this.save('groceryItems', record.id, { name: text(record.name.trim()), section: text(record.section.trim()), checked: bool(record.checked) }, !!id);
    return record;
  }

  async delete(collection: string, id: string): Promise<void> { const { ownerId, token } = await this.scope(); await this.firestore.deleteDocument(`users/${ownerId}/${collection}`, id, token); }

  private async list<T>(collection: string, convert: (doc: FirestoreDocument) => T): Promise<T[]> { const { ownerId, token } = await this.scope(); return (await this.firestore.listDocuments(`users/${ownerId}/${collection}`, token)).map(convert); }
  private async save(collection: string, id: string, fields: Record<string, FirestoreValue>, update: boolean): Promise<void> { const { ownerId, token } = await this.scope(); const path = `users/${ownerId}/${collection}`; if (update) await this.firestore.updateDocument(`${path}/${encodeURIComponent(id)}`, fields, token); else await this.firestore.createDocument(path, id, fields, token); }
  private async scope(): Promise<{ ownerId: string; token: string }> { const { uid, token } = await this.auth.getSession(); const profile = await this.firestore.tryGetDocument(`users/${uid}`, token); return { ownerId: profile?.fields?.['familyOwnerId']?.stringValue || uid, token }; }
  private value(doc: FirestoreDocument, key: string): string { return doc.fields?.[key]?.stringValue ?? ''; }
  private id(doc: FirestoreDocument): string { return doc.name.split('/').at(-1) ?? ''; }
  private event(doc: FirestoreDocument): PlanningEvent { return { id: this.id(doc), title: this.value(doc, 'title'), date: this.value(doc, 'date'), startTime: this.value(doc, 'startTime'), endTime: this.value(doc, 'endTime'), location: this.value(doc, 'location'), notes: this.value(doc, 'notes'), category: (this.value(doc, 'category') || 'Personal') as PlanningEvent['category'], repeat: this.value(doc, 'repeat'), reminder: doc.fields?.['reminder']?.booleanValue ?? false, attendeeIds: doc.fields?.['attendeeIds']?.arrayValue?.values?.map(x => x.stringValue ?? '').filter(Boolean) ?? [], createdAt: doc.fields?.['createdAt']?.timestampValue ?? '' }; }
  private reminder(doc: FirestoreDocument): PlanningReminder { return { id: this.id(doc), title: this.value(doc, 'title'), date: this.value(doc, 'date'), time: this.value(doc, 'time'), category: (this.value(doc, 'category') || 'Personal') as PlanningReminder['category'], completed: doc.fields?.['completed']?.booleanValue ?? false, createdAt: doc.fields?.['createdAt']?.timestampValue ?? '' }; }
  private meal(doc: FirestoreDocument): MealPlanItem { return { id: this.id(doc), date: this.value(doc, 'date'), title: this.value(doc, 'title'), detail: this.value(doc, 'detail') }; }
  private grocery(doc: FirestoreDocument): GroceryItem { return { id: this.id(doc), name: this.value(doc, 'name'), section: this.value(doc, 'section'), checked: doc.fields?.['checked']?.booleanValue ?? false }; }
}
