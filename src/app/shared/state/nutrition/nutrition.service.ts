import { assertNotLogged, snapshotLog, normalizeNutrition } from './nutrition.calculations';
import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import {
  calculateTargets,
  normalizeProfile,
  Food,
  FoodLog,
  Macros,
  NutritionProfile,
  validMacros,
  zeroMacros,
} from './nutrition.model';
export const defaultProfile = (): NutritionProfile => ({
  name: '',
  age: 0,
  height: 0,
  weight: 0,
  goal: '',
  sex: '',
  activity: 'sedentary',
  goalWeight: null,
  calorieDeficit: null,
  targetOverrides: { calories: null, protein: null, carbs: null, fat: null },
  targets: zeroMacros(),
});
@Injectable({ providedIn: 'root' })
export class NutritionService {
  private readonly auth = inject(AuthService);
  private readonly db = inject(FirestoreService);
  readonly foods = signal<Food[]>([]);
  readonly logs = signal<FoodLog[]>([]);
  readonly profile = signal<NutritionProfile>(defaultProfile());
  readonly loading = signal(false);
  readonly error = signal('');
  private version = 0;
  constructor() {
    inject(RefreshCoordinator).register(() => this.reload());
    effect(() => {
      const uid = this.auth.userId();
      untracked(() => {
        this.version++;
        this.foods.set([]);
        this.logs.set([]);
        this.profile.set(defaultProfile());
        this.error.set('');
        if (uid) void this.reload();
      });
    });
  }
  async reload(): Promise<void> {
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    try {
      const { uid, token } = await this.auth.getSession();
      const docs = await this.db.listDocuments(`users/${uid}/nutrition`, token);
      const ownerId = uid;
      const ingredients = await this.db.listDocuments(`users/${ownerId}/ingredients`, token);
      if (version !== this.version) return;
      const read = <T>(kind: string): T[] =>
        docs
          .filter((d) => d.fields?.['kind']?.stringValue === kind)
          .map((d) => JSON.parse(d.fields?.['data']?.stringValue ?? '{}') as T);
      this.foods.set(
        [
          ...read<Food>('food'),
          ...ingredients
            .filter((d) => d.fields?.['kind']?.stringValue === 'ingredient')
            .map((d) => JSON.parse(d.fields?.['data']?.stringValue ?? '{}') as Food),
        ].filter((f, i, all) => !all.slice(i + 1).some((x) => x.id === f.id)),
      );
      this.logs.set(read<FoodLog>('log'));
      this.profile.set(normalizeProfile(read<NutritionProfile>('profile')[0] ?? defaultProfile()));
    } catch (error) {
      if (version === this.version)
        this.error.set(
          error instanceof Error && error.message.includes('(403)')
            ? 'Nutrition access was denied. Deploy the updated Firestore rules for this project, then retry.'
            : error instanceof Error
              ? error.message
              : 'Could not load nutrition.',
        );
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }
  private async write(kind: string, id: string, data: unknown): Promise<boolean> {
    const { uid, token } = await this.auth.getSession();
    const version = this.version;
    await this.db.updateDocument(
      `users/${uid}/nutrition/${id}`,
      { kind: { stringValue: kind }, data: { stringValue: JSON.stringify(data) } },
      token,
    );
    return version === this.version && uid === this.auth.userId();
  }
  async saveFood(food: Food): Promise<void> {
    if (
      !food.name.trim() ||
      !validMacros({
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      })
    )
      throw new Error('Enter a food name and non-negative nutrition values.');
    normalizeNutrition(food, 100);
    food = { ...food, portions: food.portions?.map((p) => ({ ...p, unit: p.unit.trim() })) };
    for (const p of food.portions ?? [])
      if (
        !p.unit.trim() ||
        !Number.isFinite(p.amount) ||
        p.amount <= 0 ||
        !['g', 'ml'].includes(p.baseUnit) ||
        ['g', 'kg', 'ml', 'l'].includes(p.unit)
      )
        throw new Error(
          'Define each household portion with a unique name and positive weight or volume.',
        );
    if (new Set((food.portions ?? []).map((p) => p.unit)).size !== (food.portions ?? []).length)
      throw new Error('Portion names must be unique.');
    if (food.density !== undefined && (!Number.isFinite(food.density) || food.density <= 0))
      throw new Error('Density must be positive.');
    const { uid, token } = await this.auth.getSession();
    const version = this.version;
    const ownerId = uid;
    const now = new Date().toISOString();
    food = {
      ...food,
      name: food.name.trim(),
      userId: ownerId,
      createdAt: food.createdAt ?? now,
      updatedAt: now,
    };
    await this.db.updateDocument(
      `users/${ownerId}/ingredients/${food.id}`,
      { kind: { stringValue: 'ingredient' }, data: { stringValue: JSON.stringify(food) } },
      token,
    );
    if (version === this.version && uid === this.auth.userId())
      this.foods.update((items) => [
        ...items.filter((x) => x.id !== food.id),
        structuredClone(food),
      ]);
  }
  async archiveFood(food: Food): Promise<void> {
    await this.saveFood({ ...food, archived: !food.archived });
  }
  async saveLog(input: Omit<FoodLog, 'id'>, id?: string, repeat = false): Promise<void> {
    if (!id && !repeat) assertNotLogged(this.logs(), input.plannedMealId);
    const item = snapshotLog(
      {
        ...input,
        createdAt: input.createdAt ?? new Date().toISOString(),
        goalSnapshot:
          input.goalSnapshot ?? (id ? undefined : structuredClone(this.profile().targets)),
      },
      id ?? crypto.randomUUID(),
    );
    // A deterministic ID makes repeated taps and retries idempotent across devices.
    if (!id && input.plannedMealId && !repeat) item.id = `meal-${input.plannedMealId}`;
    if (!id && input.plannedMealId && !repeat) {
      const { uid, token } = await this.auth.getSession();
      const version = this.version;
      try {
        await this.db.createDocument(
          `users/${uid}/nutrition`,
          item.id,
          { kind: { stringValue: 'log' }, data: { stringValue: JSON.stringify(item) } },
          token,
        );
      } catch (e) {
        if (e instanceof Error && e.message.includes('(409)'))
          throw new Error('This meal is already logged on another device. Refresh your diary.');
        throw e;
      }
      if (version === this.version && uid === this.auth.userId())
        this.logs.update((items) => [...items.filter((x) => x.id !== item.id), item]);
    } else if (await this.write('log', item.id, item))
      this.logs.update((items) => [...items.filter((x) => x.id !== item.id), item]);
  }
  async saveProfile(profile: NutritionProfile): Promise<void> {
    profile = normalizeProfile(profile);
    if (
      profile.goalWeight != null &&
      (!Number.isFinite(profile.goalWeight) || profile.goalWeight <= 0)
    )
      throw new Error('Enter a positive goal weight or leave it blank to maintain weight.');
    profile.targets = calculateTargets(profile);
    if (
      !validMacros(profile.targets) ||
      [profile.age, profile.height, profile.weight].some((n) => !Number.isFinite(n) || n < 0)
    )
      throw new Error('Enter valid, non-negative details and targets.');
    if (await this.write('profile', 'profile', profile)) this.profile.set(structuredClone(profile));
  }
  async log(date: string, name: string, amount: string, nutrition: Macros): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name.trim() || !validMacros(nutrition))
      throw new Error('Enter a date, food and valid nutrition.');
    await this.saveLog({ date, name, amount, nutrition, meal: 'Snacks', sourceType: 'manual' });
  }

  async removeLog(id: string): Promise<void> {
    const { uid, token } = await this.auth.getSession();
    const version = this.version;
    await this.db.deleteDocument(`users/${uid}/nutrition`, id, token);
    if (version === this.version) this.logs.update((items) => items.filter((x) => x.id !== id));
  }
}
