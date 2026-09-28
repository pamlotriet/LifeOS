import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AuthService } from '../authentication/authentication.service';
import { RefreshCoordinator } from '../refresh/refresh-coordinator.service';
import { RecipeInput, RecipeRecord } from './recipe.model';
import { RecipeService } from './recipe.service';

@Injectable({ providedIn: 'root' })
export class RecipeStore {
  private readonly auth = inject(AuthService); private readonly service = inject(RecipeService);
  readonly recipes = signal<RecipeRecord[]>([]); readonly loading = signal(false); readonly error = signal('');
  readonly sorted = computed(() => [...this.recipes()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  private version = 0;
  constructor() { inject(RefreshCoordinator).register(() => this.reload()); effect(() => { const uid = this.auth.userId(); untracked(() => { this.version++; this.recipes.set([]); if (uid) void this.reload(); }); }); }
  async reload(): Promise<void> { const version = ++this.version; this.loading.set(true); this.error.set(''); try { const data = await this.service.list(); if (version === this.version) this.recipes.set(data); } catch { if (version === this.version) this.error.set('Could not load recipes.'); } finally { if (version === this.version) this.loading.set(false); } }
  async get(id: string): Promise<RecipeRecord> { return this.recipes().find((item) => item.id === id) ?? this.service.get(id); }
  async save(input: RecipeInput, id?: string): Promise<RecipeRecord> { const saved = await this.service.save(input, id); this.recipes.update((items) => [saved, ...items.filter((item) => item.id !== saved.id)]); return saved; }
  async delete(recipe: RecipeRecord): Promise<void> { await this.service.delete(recipe); this.recipes.update((items) => items.filter((item) => item.id !== recipe.id)); }
}
