import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { RECIPE_CATEGORIES } from '../../shared/state/recipes/recipe.model';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';

@Component({ selector: 'app-recipes', imports: [IonContent, IonIcon, RouterLink, PageHeader], templateUrl: './recipes.html' })
export class Recipes {
  readonly store = inject(RecipeStore); readonly categories = RECIPE_CATEGORIES;
  readonly search = signal(''); readonly category = signal('All'); readonly favouritesOnly = signal(false);
  readonly filtered = computed(() => { const query = this.search().trim().toLowerCase(); return this.store.sorted().filter((recipe) =>
    (!this.favouritesOnly() || recipe.favourite) && (this.category() === 'All' || recipe.category === this.category()) &&
    (!query || [recipe.title, recipe.description, recipe.category, ...recipe.tags].some((value) => value.toLowerCase().includes(query)))); });
}
