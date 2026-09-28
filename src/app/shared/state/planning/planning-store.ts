import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import { GroceryItem, MealPlanItem, PlanningEvent, PlanningEventInput, PlanningReminder, PlanningReminderInput } from './planning.model';
import { PlanningService } from './planning.service';

@Injectable({ providedIn: 'root' })
export class PlanningStore {
  private readonly auth = inject(AuthService); private readonly service = inject(PlanningService); private version = 0;
  readonly events = signal<PlanningEvent[]>([]); readonly reminders = signal<PlanningReminder[]>([]); readonly meals = signal<MealPlanItem[]>([]); readonly groceries = signal<GroceryItem[]>([]);
  readonly loading = signal(false); readonly error = signal('');
  readonly sortedEvents = computed(() => [...this.events()].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)));
  readonly sortedReminders = computed(() => [...this.reminders()].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
  constructor() { inject(RefreshCoordinator).register(() => this.reload()); effect(() => { const uid = this.auth.userId(); untracked(() => { this.version++; this.clear(); if (uid) void this.reload(); }); }); }
  async reload(): Promise<void> { const version = ++this.version; this.loading.set(true); this.error.set(''); try { const [events, reminders, meals, groceries] = await Promise.all([this.service.listEvents(), this.service.listReminders(), this.service.listMeals(), this.service.listGroceries()]); if (version === this.version) { this.events.set(events); this.reminders.set(reminders); this.meals.set(meals); this.groceries.set(groceries); } } catch (error) { if (version === this.version) this.error.set(error instanceof Error ? error.message : 'Could not load planning data.'); } finally { if (version === this.version) this.loading.set(false); } }
  async saveEvent(input: PlanningEventInput, id?: string): Promise<PlanningEvent> { const item = await this.service.saveEvent(input, id); this.events.update((items) => [...items.filter((x) => x.id !== item.id), item]); return item; }
  async deleteEvent(id: string): Promise<void> { await this.service.delete('planningEvents', id); this.events.update((items) => items.filter((x) => x.id !== id)); }
  async saveReminder(input: PlanningReminderInput, id?: string): Promise<PlanningReminder> { const item = await this.service.saveReminder(input, id); this.reminders.update((items) => [...items.filter((x) => x.id !== item.id), item]); return item; }
  async toggleReminder(item: PlanningReminder): Promise<void> { await this.saveReminder({ ...item, completed: !item.completed }, item.id); }
  async deleteReminder(id: string): Promise<void> { await this.service.delete('planningReminders', id); this.reminders.update((items) => items.filter((x) => x.id !== id)); }
  async saveMeal(item: Omit<MealPlanItem, 'id'>, id?: string): Promise<void> { const saved = await this.service.saveMeal(item, id); this.meals.update((items) => [...items.filter((x) => x.id !== saved.id), saved]); }
  async deleteMeal(id: string): Promise<void> { await this.service.delete('mealPlan', id); this.meals.update((items) => items.filter((x) => x.id !== id)); }
  async saveGrocery(item: Omit<GroceryItem, 'id'>, id?: string): Promise<void> { const saved = await this.service.saveGrocery(item, id); this.groceries.update((items) => [...items.filter((x) => x.id !== saved.id), saved]); }
  async toggleGrocery(item: GroceryItem): Promise<void> { await this.saveGrocery({ ...item, checked: !item.checked }, item.id); }
  async deleteGrocery(id: string): Promise<void> { await this.service.delete('groceryItems', id); this.groceries.update((items) => items.filter((x) => x.id !== id)); }
  private clear(): void { this.events.set([]); this.reminders.set([]); this.meals.set([]); this.groceries.set([]); }
}
