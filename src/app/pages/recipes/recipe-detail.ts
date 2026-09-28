import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { RecipeRecord } from '../../shared/state/recipes/recipe.model';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';

@Component({ selector: 'app-recipe-detail', imports: [IonContent, IonIcon, RouterLink, PageHeader], templateUrl: './recipe-detail.html' })
export class RecipeDetail {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); readonly store = inject(RecipeStore);
  readonly recipe = signal<RecipeRecord | null>(null); readonly loading = signal(true); readonly deleting = signal(false); readonly error = signal('');
  readonly checked = signal<Set<number>>(new Set());
  constructor() { void this.load(); }
  async load(): Promise<void> { try { this.recipe.set(await this.store.get(this.route.snapshot.paramMap.get('id')!)); } catch { this.error.set('Recipe not found.'); } finally { this.loading.set(false); } }
  toggleIngredient(index: number): void { this.checked.update((current) => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; }); }
  async toggleFavourite(): Promise<void> { const recipe = this.recipe(); if (!recipe) return; const { id, createdAt, ...input } = recipe; const saved = await this.store.save({ ...input, favourite: !recipe.favourite }, id); this.recipe.set(saved); }
  async delete(): Promise<void> { const recipe = this.recipe(); if (!recipe || this.deleting()) return; this.deleting.set(true); try { await this.store.delete(recipe); await this.router.navigateByUrl('/recipes', { replaceUrl: true }); } finally { this.deleting.set(false); } }
}
