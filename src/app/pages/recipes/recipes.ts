import { RecipeForm } from './recipe-form';
import { BackButton } from '../../shared/components/back-button/back-button';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { RECIPE_CATEGORIES, recipeCategories } from '../../shared/state/recipes/recipe.model';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';
import { AppSkeleton } from '../../shared/components/app-skeleton/app-skeleton';

@Component({
  selector: 'app-recipes',
  imports: [BackButton, IonContent, IonIcon, RouterLink, AppSkeleton, RecipeForm],
  templateUrl: './recipes.html',
  styleUrl: './recipes.css',
})
export class Recipes {
  readonly editorOpen = signal(false);
  readonly recipeCategories = recipeCategories;
  readonly store = inject(RecipeStore);
  readonly categories = RECIPE_CATEGORIES;
  readonly search = signal('');
  readonly category = signal('All');
  readonly favouritesOnly = signal(false);
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.store
      .sorted()
      .filter(
        (recipe) =>
          (!this.favouritesOnly() || recipe.favourite) &&
          (this.category() === 'All' ||
            recipeCategories(recipe).some((category) => category === this.category())) &&
          (!query ||
            [recipe.title, recipe.description, ...recipeCategories(recipe), ...recipe.tags].some(
              (value) => value.toLowerCase().includes(query),
            )),
      );
  });
}
