import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { AppSelect, SelectOption } from '../../shared/components/app-select/app-select';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { RECIPE_CATEGORIES, RECIPE_DIFFICULTIES, RecipeInput, RecipeStep } from '../../shared/state/recipes/recipe.model';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';
import { pickImage } from '../../shared/utils/pick-image';

@Component({ selector: 'app-recipe-form', imports: [IonContent, IonIcon, FormsModule, AppSelect, PageHeader], templateUrl: './recipe-form.html' })
export class RecipeForm {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); readonly store = inject(RecipeStore);
  readonly id = this.route.snapshot.paramMap.get('id'); readonly loading = signal(!!this.id); readonly saving = signal(false); readonly error = signal('');
  readonly ingredients = signal<string[]>(['']); readonly steps = signal<RecipeStep[]>([{ id: crypto.randomUUID(), title: '', instruction: '' }]); readonly tags = signal<string[]>([]); readonly tagInput = signal('');
  readonly categoryOptions: SelectOption[] = RECIPE_CATEGORIES.map((value) => ({ value, label: value }));
  readonly difficultyOptions: SelectOption[] = RECIPE_DIFFICULTIES.map((value) => ({ value, label: value }));
  model: RecipeInput = { title: '', description: '', category: 'Dinner', cookTime: 30, servings: 4, difficulty: 'Easy', photoUrl: '', photoPath: '', ingredients: [], steps: [], tags: [], source: '', sourceLink: '', notes: '', favourite: false, private: true };
  constructor() { if (this.id) void this.load(); }
  async load(): Promise<void> { try { const recipe = await this.store.get(this.id!); const { id, createdAt, ...input } = recipe; this.model = input; this.ingredients.set([...recipe.ingredients]); this.steps.set(recipe.steps.map((step) => ({ ...step }))); this.tags.set([...recipe.tags]); } catch { this.error.set('Could not load recipe.'); } finally { this.loading.set(false); } }
  setCategory(value: string): void { this.model.category = value as RecipeInput['category']; }
  setDifficulty(value: string): void { this.model.difficulty = value as RecipeInput['difficulty']; }
  updateIngredient(index: number, value: string): void { this.ingredients.update((items) => items.map((item, i) => i === index ? value : item)); }
  addIngredient(): void { this.ingredients.update((items) => [...items, '']); }
  removeIngredient(index: number): void { this.ingredients.update((items) => items.filter((_, i) => i !== index)); }
  updateStep(index: number, field: 'title' | 'instruction', value: string): void { this.steps.update((items) => items.map((item, i) => i === index ? { ...item, [field]: value } : item)); }
  addStep(): void { this.steps.update((items) => [...items, { id: crypto.randomUUID(), title: '', instruction: '' }]); }
  removeStep(index: number): void { this.steps.update((items) => items.filter((_, i) => i !== index)); }
  addTag(): void { const value = this.tagInput().trim(); if (value && !this.tags().includes(value)) this.tags.update((items) => [...items, value]); this.tagInput.set(''); }
  removeTag(tag: string): void { this.tags.update((items) => items.filter((item) => item !== tag)); }
  async save(): Promise<void> { if (this.saving()) return; const ingredients = this.ingredients().map((item) => item.trim()).filter(Boolean); const steps = this.steps().map((item) => ({ ...item, title: item.title.trim(), instruction: item.instruction.trim() })).filter((item) => item.instruction); if (!this.model.title.trim()) { this.error.set('Enter a recipe title.'); return; } if (!ingredients.length || !steps.length) { this.error.set('Add at least one ingredient and one step.'); return; } this.saving.set(true); this.error.set(''); try { const saved = await this.store.save({ ...this.model, cookTime: Number(this.model.cookTime), servings: Number(this.model.servings), ingredients, steps, tags: this.tags() }, this.id ?? undefined); await this.router.navigateByUrl(`/recipes/${saved.id}`, { replaceUrl: true }); } catch (error) { this.error.set(error instanceof Error ? error.message : 'Could not save recipe.'); } finally { this.saving.set(false); } }
  async pickPhoto(): Promise<void> { try { const photo = await pickImage(); if (photo) this.model.photoUrl = photo; } catch { this.error.set('Could not read the photo.'); } }
}
