import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import { GroceryItem, MealPlanItem } from './planning.model';
import { PlanningService } from './planning.service';

@Injectable({ providedIn: 'root' })
export class PlanningStore {
  private readonly auth = inject(AuthService);
  private readonly service = inject(PlanningService);
  private version = 0;
  readonly meals = signal<MealPlanItem[]>([]);
  readonly groceries = signal<GroceryItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  constructor() {
    inject(RefreshCoordinator).register(() => this.reload());
    effect(() => {
      const uid = this.auth.userId();
      untracked(() => {
        this.version++;
        this.clear();
        if (uid) void this.reload();
      });
    });
  }
  async reload(): Promise<void> {
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    try {
      const [meals, groceries] = await Promise.all([
        this.service.listMeals(),
        this.service.listGroceries(),
      ]);
      if (version === this.version) {
        this.meals.set(meals);
        this.groceries.set(groceries);
      }
    } catch (error) {
      if (version === this.version)
        this.error.set(error instanceof Error ? error.message : 'Could not load planning data.');
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }
  async saveMeal(item: Omit<MealPlanItem, 'id'>, id?: string): Promise<void> {
    const saved = await this.service.saveMeal(item, id);
    this.meals.update((items) => [...items.filter((x) => x.id !== saved.id), saved]);
  }
  async deleteMeal(id: string): Promise<void> {
    await this.service.delete('mealPlan', id);
    this.meals.update((items) => items.filter((x) => x.id !== id));
  }
  async saveGrocery(item: Omit<GroceryItem, 'id'>, id?: string): Promise<void> {
    const saved = await this.service.saveGrocery(item, id);
    this.groceries.update((items) => [...items.filter((x) => x.id !== saved.id), saved]);
  }
  async toggleGrocery(item: GroceryItem): Promise<void> {
    await this.saveGrocery({ ...item, checked: !item.checked }, item.id);
  }
  async deleteGrocery(id: string): Promise<void> {
    await this.service.delete('groceryItems', id);
    this.groceries.update((items) => items.filter((x) => x.id !== id));
  }
  private clear(): void {
    this.meals.set([]);
    this.groceries.set([]);
  }
}
