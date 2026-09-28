import { inject, Injectable } from '@angular/core';
import { FirestoreDocument, FirestoreService, FirestoreValue } from '../../../core/firebase/firestore.service';
import { StoragePhotoService } from '../../../core/firebase/storage-photo.service';
import { AuthService } from '../authentication/authentication.service';
import { RecipeInput, RecipeRecord, RecipeStep } from './recipe.model';

const text = (value: string): FirestoreValue => ({ stringValue: value });
const strings = (values: string[]): FirestoreValue => ({ arrayValue: { values: values.map(text) } });

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly auth = inject(AuthService);
  private readonly firestore = inject(FirestoreService);
  private readonly storage = inject(StoragePhotoService);

  async list(): Promise<RecipeRecord[]> {
    const { ownerId, token } = await this.scope();
    return (await this.firestore.listDocuments(`users/${ownerId}/recipes`, token)).map((doc) => this.fromDocument(doc));
  }
  async get(id: string): Promise<RecipeRecord> {
    const { ownerId, token } = await this.scope();
    return this.fromDocument(await this.firestore.getDocument(`users/${ownerId}/recipes/${encodeURIComponent(id)}`, token));
  }
  async save(input: RecipeInput, id?: string): Promise<RecipeRecord> {
    if (!input.title.trim()) throw new Error('Enter a recipe title.');
    if (!input.ingredients.length) throw new Error('Add at least one ingredient.');
    if (!input.steps.length) throw new Error('Add at least one step.');
    const { uid, ownerId, token } = await this.scope();
    const recipeId = id ?? crypto.randomUUID();
    const previous = id ? await this.get(id) : null;
    let photoUrl = input.photoUrl;
    let photoPath = input.photoPath;
    if (photoUrl.startsWith('blob:') || photoUrl.startsWith('data:')) {
      const uploaded = await this.storage.uploadRecipePhoto(uid, recipeId, photoUrl, token);
      photoUrl = uploaded.url; photoPath = uploaded.path;
    }
    const recipe: RecipeRecord = { ...input, id: recipeId, title: input.title.trim(), photoUrl, photoPath, createdAt: previous?.createdAt ?? new Date().toISOString() };
    const path = `users/${ownerId}/recipes`;
    if (id) await this.firestore.updateDocument(`${path}/${encodeURIComponent(id)}`, this.fields(recipe), token);
    else await this.firestore.createDocument(path, recipe.id, this.fields(recipe), token);
    if (previous?.photoPath && previous.photoPath !== photoPath) await this.storage.deletePhoto(previous.photoPath, token);
    return recipe;
  }
  async delete(recipe: RecipeRecord): Promise<void> {
    const { ownerId, token } = await this.scope();
    await this.firestore.deleteDocument(`users/${ownerId}/recipes`, recipe.id, token);
    if (recipe.photoPath) await this.storage.deletePhoto(recipe.photoPath, token);
  }
  private async scope(): Promise<{ uid: string; ownerId: string; token: string }> {
    const { uid, token } = await this.auth.getSession();
    const profile = await this.firestore.tryGetDocument(`users/${uid}`, token);
    return { uid, ownerId: profile?.fields?.['familyOwnerId']?.stringValue || uid, token };
  }
  private fields(recipe: RecipeRecord): Record<string, FirestoreValue> {
    return {
      title: text(recipe.title), description: text(recipe.description), category: text(recipe.category),
      cookTime: { integerValue: String(recipe.cookTime) }, servings: { integerValue: String(recipe.servings) },
      difficulty: text(recipe.difficulty), photoUrl: text(recipe.photoUrl), photoPath: text(recipe.photoPath),
      ingredients: strings(recipe.ingredients), tags: strings(recipe.tags), source: text(recipe.source),
      sourceLink: text(recipe.sourceLink), notes: text(recipe.notes), favourite: { booleanValue: recipe.favourite },
      private: { booleanValue: recipe.private }, createdAt: { timestampValue: recipe.createdAt },
      steps: { arrayValue: { values: recipe.steps.map((step) => ({ mapValue: { fields: { id: text(step.id), title: text(step.title), instruction: text(step.instruction) } } })) } },
    };
  }
  private fromDocument(doc: FirestoreDocument): RecipeRecord {
    const f = doc.fields ?? {}; const s = (key: string) => f[key]?.stringValue ?? '';
    const list = (key: string) => f[key]?.arrayValue?.values?.map((value) => value.stringValue ?? '').filter(Boolean) ?? [];
    const steps: RecipeStep[] = (f['steps']?.arrayValue?.values ?? []).map((value) => ({
      id: value.mapValue?.fields?.['id']?.stringValue ?? crypto.randomUUID(),
      title: value.mapValue?.fields?.['title']?.stringValue ?? '', instruction: value.mapValue?.fields?.['instruction']?.stringValue ?? '',
    }));
    return { id: doc.name.split('/').at(-1) ?? '', title: s('title'), description: s('description'), category: (s('category') || 'Other') as RecipeRecord['category'],
      cookTime: Number(f['cookTime']?.integerValue ?? 0), servings: Number(f['servings']?.integerValue ?? 1), difficulty: (s('difficulty') || 'Easy') as RecipeRecord['difficulty'],
      photoUrl: s('photoUrl'), photoPath: s('photoPath'), ingredients: list('ingredients'), steps, tags: list('tags'), source: s('source'), sourceLink: s('sourceLink'),
      notes: s('notes'), favourite: f['favourite']?.booleanValue ?? false, private: f['private']?.booleanValue ?? true, createdAt: f['createdAt']?.timestampValue ?? '' };
  }
}
