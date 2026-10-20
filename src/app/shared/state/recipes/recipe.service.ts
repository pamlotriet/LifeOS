import { validMacros } from '../nutrition/nutrition.model';
import { inject, Injectable } from '@angular/core';
import {
  FirestoreDocument,
  FirestoreService,
  FirestoreValue,
} from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { AuthService } from '../authentication/authentication.service';
import { RecipeInput, RecipeRecord, RecipeStep, recipeCategories } from './recipe.model';

const text = (value: string): FirestoreValue => ({ stringValue: value });
const strings = (values: string[]): FirestoreValue => ({
  arrayValue: { values: values.map(text) },
});

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);
  private readonly storage = inject(StoragePhotoService);

  async list(): Promise<RecipeRecord[]> {
    const { ownerId, token } = await this.scope();
    return (await this.firestore.listDocuments(`users/${ownerId}/recipes`, token)).map((doc) =>
      this.fromDocument(doc),
    );
  }
  async get(id: string): Promise<RecipeRecord> {
    const { ownerId, token } = await this.scope();
    return this.fromDocument(
      await this.firestore.getDocument(`users/${ownerId}/recipes/${encodeURIComponent(id)}`, token),
    );
  }
  async save(input: RecipeInput, id?: string): Promise<RecipeRecord> {
    if (!Number.isFinite(input.servings) || input.servings <= 0)
      throw new Error('Servings must be positive.');
    if (
      (input.nutritionIngredients ?? []).some(
        (item) =>
          !Number.isFinite(item.quantity ?? item.grams) ||
          (item.quantity ?? item.grams) <= 0 ||
          (!item.linked && !validMacros(item.per100)),
      )
    )
      throw new Error('Ingredient weight must be positive.');
    if (
      input.servingWeight != null &&
      (!Number.isFinite(input.servingWeight) || input.servingWeight <= 0)
    )
      throw new Error('Serving weight must be positive.');
    if (!input.title.trim()) throw new Error('Enter a recipe title.');
    if (!input.ingredients.length && !input.nutritionIngredients?.length)
      throw new Error('Add at least one ingredient.');
    if (!input.steps.length) throw new Error('Add at least one step.');
    const categories = recipeCategories(input);
    if (!categories.length) throw new Error('Choose at least one recipe category.');
    const { uid, ownerId, token } = await this.scope();
    const recipeId = id ?? crypto.randomUUID();
    const previous = id ? await this.get(id) : null;
    let photoUrl = input.photoUrl;
    let photoPath = input.photoPath;
    if (photoUrl.startsWith('blob:') || photoUrl.startsWith('data:')) {
      const uploaded = await this.storage.uploadRecipePhoto(uid, recipeId, photoUrl, token);
      photoUrl = uploaded.url;
      photoPath = uploaded.path;
    }
    const recipe: RecipeRecord = {
      ...input,
      categories,
      category: categories[0],
      id: recipeId,
      title: input.title.trim(),
      photoUrl,
      photoPath,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
    };
    const path = `users/${ownerId}/recipes`;
    if (id)
      await this.firestore.updateDocument(
        `${path}/${encodeURIComponent(id)}`,
        this.fields(recipe),
        token,
      );
    else await this.firestore.createDocument(path, recipe.id, this.fields(recipe), token);
    if (previous?.photoPath && previous.photoPath !== photoPath)
      await this.storage.deletePhoto(previous.photoPath, token);
    return recipe;
  }
  async delete(recipe: RecipeRecord): Promise<void> {
    const { ownerId, token } = await this.scope();
    await this.firestore.deleteDocument(`users/${ownerId}/recipes`, recipe.id, token);
    if (recipe.photoPath) await this.storage.deletePhoto(recipe.photoPath, token);
  }
  private async scope(): Promise<{ uid: string; ownerId: string; token: string }> {
    const { uid, token } = await this.auth.getSession();
    return { uid, ownerId: uid, token };
  }
  private fields(recipe: RecipeRecord): Record<string, FirestoreValue> {
    return {
      title: text(recipe.title),
      description: text(recipe.description),
      category: text(recipe.category),
      categories: strings(recipeCategories(recipe)),
      cookTime: { integerValue: String(recipe.cookTime) },
      servings: { doubleValue: recipe.servings },
      servingWeight:
        recipe.servingWeight != null ? { doubleValue: recipe.servingWeight } : { nullValue: null },
      difficulty: text(recipe.difficulty),
      photoUrl: text(recipe.photoUrl),
      photoPath: text(recipe.photoPath),
      nutritionIngredients: text(JSON.stringify(recipe.nutritionIngredients ?? [])),
      ingredients: strings(recipe.ingredients),
      tags: strings(recipe.tags),
      source: text(recipe.source),
      sourceLink: text(recipe.sourceLink),
      notes: text(recipe.notes),
      favourite: { booleanValue: recipe.favourite },
      private: { booleanValue: recipe.private },
      createdAt: { timestampValue: recipe.createdAt },
      steps: {
        arrayValue: {
          values: recipe.steps.map((step) => ({
            mapValue: {
              fields: {
                id: text(step.id),
                title: text(step.title),
                instruction: text(step.instruction),
              },
            },
          })),
        },
      },
    };
  }
  private fromDocument(doc: FirestoreDocument): RecipeRecord {
    const f = doc.fields ?? {};
    const s = (key: string) => f[key]?.stringValue ?? '';
    const list = (key: string) =>
      f[key]?.arrayValue?.values?.map((value) => value.stringValue ?? '').filter(Boolean) ?? [];
    const steps: RecipeStep[] = (f['steps']?.arrayValue?.values ?? []).map((value) => ({
      id: value.mapValue?.fields?.['id']?.stringValue ?? crypto.randomUUID(),
      title: value.mapValue?.fields?.['title']?.stringValue ?? '',
      instruction: value.mapValue?.fields?.['instruction']?.stringValue ?? '',
    }));
    return {
      id: doc.name.split('/').at(-1) ?? '',
      title: s('title'),
      description: s('description'),
      category: (s('category') || 'Other') as RecipeRecord['category'],
      categories: recipeCategories({
        category: (s('category') || 'Other') as RecipeRecord['category'],
        categories: f['categories']?.arrayValue
          ? (list('categories') as NonNullable<RecipeRecord['categories']>)
          : undefined,
      }),
      cookTime: Number(f['cookTime']?.integerValue ?? 0),
      servings: Number(f['servings']?.doubleValue ?? f['servings']?.integerValue ?? 1),
      ...(f['servingWeight']?.doubleValue ? { servingWeight: f['servingWeight'].doubleValue } : {}),
      difficulty: (s('difficulty') || 'Easy') as RecipeRecord['difficulty'],
      photoUrl: s('photoUrl'),
      photoPath: s('photoPath'),
      ingredients: list('ingredients'),
      steps,
      tags: list('tags'),
      source: s('source'),
      sourceLink: s('sourceLink'),
      nutritionIngredients: JSON.parse(s('nutritionIngredients') || '[]'),
      notes: s('notes'),
      favourite: f['favourite']?.booleanValue ?? false,
      private: f['private']?.booleanValue ?? true,
      createdAt: f['createdAt']?.timestampValue ?? '',
    };
  }
}
