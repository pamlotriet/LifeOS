import { EmptyState } from '@shared/components/empty-state/empty-state';
import { RecipeBookPanel } from '@pages/recipes/components/recipe-book-panel/recipe-book-panel';
import { RecipeCard } from '@pages/recipes/components/recipe-card/recipe-card';
import { AppButton } from '@shared/components/app-button/app-button';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AppInput } from '@shared/components/app-input/app-input';
import { BackButton } from '@shared/components/back-button/back-button';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { RECIPE_CATEGORIES, recipeCategories } from '@pages/recipes/state/recipe/recipe.model';
import { RecipeStore } from '@pages/recipes/state/recipe/recipe-store';
import { AppSkeleton } from '@shared/components/app-skeleton/app-skeleton';

@Component({
  selector: 'app-recipes',
  imports: [
    EmptyState,
    RecipeBookPanel,
    RecipeCard,
    AppButton,
    TranslatePipe,
    AppInput,
    BackButton,
    IonContent,
    IonIcon,
    RouterLink,
    AppSkeleton,
  ],
  templateUrl: './recipes.html',
  styleUrl: './recipes.css',
})
export class Recipes {
  private readonly translate = inject(TranslateService);
  readonly exportOpen = signal(false);
  readonly exporting = signal(false);
  readonly exportMessage = signal('');
  readonly selectedRecipes = signal<Set<string>>(new Set());
  bookTitle = 'My recipe book';
  includePhotos = true;
  readonly exportRecipes = computed(() =>
    this.store.sorted().filter((recipe) => this.selectedRecipes().has(recipe.id)),
  );
  openExport(): void {
    this.selectedRecipes.set(new Set(this.filtered().map((recipe) => recipe.id)));
    this.exportMessage.set('');
    this.exportOpen.set(true);
  }
  selectForExport(id: string): void {
    this.selectedRecipes.update((selected) => {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  clearExportSelection(): void {
    this.selectedRecipes.set(new Set());
  }
  selectAllForExport(): void {
    this.selectedRecipes.set(new Set(this.store.sorted().map((recipe) => recipe.id)));
  }
  async exportBook(): Promise<void> {
    if (
      this.exporting() ||
      this.store.loading() ||
      this.store.error() ||
      !this.exportRecipes().length
    )
      return;
    const recipes = structuredClone(this.exportRecipes());
    const title = this.bookTitle.trim();
    const includePhotos = this.includePhotos;
    this.exporting.set(true);
    this.exportMessage.set('');
    try {
      const { createRecipeBook, loadRecipePhoto } =
        await import('@pages/recipes/state/recipe/recipe-book');
      const photos = new Map();
      const photoFailures: string[] = [];
      if (includePhotos) {
        for (let index = 0; index < recipes.length; index += 3) {
          await Promise.all(
            recipes.slice(index, index + 3).map(async (recipe) => {
              if (!recipe.photoUrl && !recipe.photoPath) return;
              const reasons: string[] = [];
              const report = (reason: string) => reasons.push(reason);
              let photo = recipe.photoPath
                ? await loadRecipePhoto(recipe.photoUrl, () => this.store.photoBlob(recipe), report)
                : null;
              if (!photo && recipe.photoUrl)
                photo = await loadRecipePhoto(recipe.photoUrl, undefined, report);
              if (photo) photos.set(recipe.id, photo);
              else
                photoFailures.push(
                  `${recipe.title}: ${[...new Set(reasons)].join(' ') || 'Photo unavailable.'}`,
                );
            }),
          );
        }
      }
      if (photoFailures.length)
        throw new Error(
          this.translate.instant('Could not export recipe photos: {{p0}}', {
            p0: photoFailures.join(' | '),
          }),
        );
      const doc = createRecipeBook(recipes, {
        title,
        photos,
        translate: (key, params) => this.translate.instant(key, params),
      });
      const filename =
        (title || 'My recipe book')
          .replace(/[^a-zA-Z0-9 _-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .slice(0, 80) || 'recipe-book';
      await doc.save(`${filename}.pdf`, { returnPromise: true });
      this.exportMessage.set('Recipe book downloaded.');
    } catch (error) {
      this.exportMessage.set(
        error instanceof Error ? error.message : 'Could not export the recipe book.',
      );
    } finally {
      this.exporting.set(false);
    }
  }
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
