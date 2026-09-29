import { computed, inject, Injectable, signal } from '@angular/core';
import { BookStore } from '../books/book-store';
import { BudgetStore } from '../budget/budget.store';
import { money, summary } from '../budget/budget.model';
import { PlanningStore } from '../planning/planning-store';
import { RecipeStore } from '../recipes/recipe-store';
import { RefuelStore } from '../refuels/refuel-store';

export type TodaySection = 'events' | 'reminders' | 'dinner' | 'groceries' | 'budget' | 'fuel' | 'reading' | 'quickActions';
export type TodayPreferences = Record<TodaySection, boolean>;
export const DEFAULT_TODAY_PREFERENCES: TodayPreferences = { events: true, reminders: true, dinner: true, groceries: true, budget: true, fuel: true, reading: true, quickActions: true };

export function localIso(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function dateStrip(date: Date): Array<{ iso: string; day: string; number: number }> { return Array.from({ length: 7 }, (_, i) => { const value = new Date(date); const daysSinceMonday = (value.getDay() + 6) % 7; value.setDate(value.getDate() - daysSinceMonday + i); return { iso: localIso(value), day: value.toLocaleDateString('en-US', { weekday: 'short' }), number: value.getDate() }; }); }

@Injectable({ providedIn: 'root' })
export class TodayService {
  private readonly planning = inject(PlanningStore); private readonly budgetStore = inject(BudgetStore); private readonly refuels = inject(RefuelStore); private readonly books = inject(BookStore); private readonly recipes = inject(RecipeStore);
  readonly selectedDate = signal(localIso()); readonly preferences = signal<TodayPreferences>(this.restorePreferences());
  readonly day = computed(() => new Date(`${this.selectedDate()}T12:00:00`));
  readonly days = computed(() => dateStrip(this.day()));
  readonly events = computed(() => this.planning.sortedEvents().filter(item => item.date === this.selectedDate()));
  readonly reminders = computed(() => this.planning.sortedReminders().filter(item => item.date === this.selectedDate()));
  readonly dinner = computed(() => this.planning.meals().find(item => item.date === this.selectedDate()) ?? null);
  readonly dinnerRecipe = computed(() => { const meal = this.dinner(); return meal ? this.recipes.recipes().find(recipe => recipe.title.toLowerCase() === meal.title.toLowerCase()) ?? null : null; });
  readonly groceries = computed(() => this.planning.groceries().slice(0, 6));
  readonly budget = computed(() => summary(this.budgetStore.monthly(), this.budgetStore.categories()));
  readonly fuel = computed(() => this.refuels.averages());
  readonly reading = computed(() => this.books.books().find(book => book.status === 'Reading') ?? null);
  readonly loading = computed(() => this.planning.loading() || this.budgetStore.loading() || this.refuels.loading() || this.books.loading() || this.recipes.loading());
  show(section: TodaySection): boolean { return this.preferences()[section]; }
  selectDate(iso: string): void { this.selectedDate.set(iso); }
  resetDate(): void { this.selectedDate.set(localIso()); }
  setPreference(section: TodaySection, visible: boolean): void { this.preferences.update(value => { const next = { ...value, [section]: visible }; this.persistPreferences(next); return next; }); }
  async toggleReminder(id: string): Promise<void> { const item = this.reminders().find(value => value.id === id); if (item) await this.planning.toggleReminder(item); }
  async toggleGrocery(id: string): Promise<void> { const item = this.planning.groceries().find(value => value.id === id); if (item) await this.planning.toggleGrocery(item); }
  money(value: number): string { return money(value); }
  private restorePreferences(): TodayPreferences { try { return { ...DEFAULT_TODAY_PREFERENCES, ...JSON.parse(localStorage.getItem('lifeos.today.preferences') ?? '{}') }; } catch { return { ...DEFAULT_TODAY_PREFERENCES }; } }
  private persistPreferences(value: TodayPreferences): void { try { localStorage.setItem('lifeos.today.preferences', JSON.stringify(value)); } catch { /* Persistence is optional. */ } }
}
