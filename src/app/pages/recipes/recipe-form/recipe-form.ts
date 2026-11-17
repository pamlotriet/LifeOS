import { FieldFeedback } from '@shared/directives/field-feedback';
import { AppForm } from '@shared/directives/app-form';
import { RecipeQuickFood } from '@pages/recipes/components/recipe-quick-food/recipe-quick-food';
import { RecipeScalingControls } from '@pages/recipes/components/recipe-scaling-controls/recipe-scaling-controls';
import { RecipeMethodEditor } from '@pages/recipes/components/recipe-method-editor/recipe-method-editor';
import { RecipeIngredientRow } from '@pages/recipes/components/recipe-ingredient-row/recipe-ingredient-row';
import { RecipePhotoPicker } from '@pages/recipes/components/recipe-photo-picker/recipe-photo-picker';
import { RecipeBasicsFields } from '@pages/recipes/components/recipe-basics-fields/recipe-basics-fields';
import { RecipeNutritionPanel } from '@pages/recipes/components/recipe-nutrition-panel/recipe-nutrition-panel';
import { BackButton } from '@shared/components/back-button/back-button';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppInput } from '@shared/components/app-input/app-input';
import {
  calculateRecipe,
  ingredientNutrition,
} from '@pages/nutrition/state/calculations/nutrition.calculations';
import { NutritionService } from '@pages/nutrition/state/nutrition/nutrition.service';
import { NutritionIngredient } from '@pages/nutrition/state/nutrition/nutrition.model';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { SelectOption } from '@shared/components/app-select/app-select';
import { addIcons } from 'ionicons';
import {
  heart,
  heartOutline,
  lockClosedOutline,
  globeOutline,
  closeOutline,
  cameraOutline,
} from 'ionicons/icons';
import {
  RECIPE_CATEGORIES,
  RecipeCategory,
  recipeCategories,
  RECIPE_DIFFICULTIES,
  RecipeInput,
  RecipeStep,
} from '@pages/recipes/state/recipe/recipe.model';
import { RecipeStore } from '@pages/recipes/state/recipe/recipe-store';
import { pickImage } from '@shared/utils/pick-image';

@Component({
  selector: 'app-recipe-form',
  imports: [
    FieldFeedback,
    AppForm,
    RecipeQuickFood,
    RecipeScalingControls,
    RecipeMethodEditor,
    RecipeIngredientRow,
    RecipePhotoPicker,
    RecipeBasicsFields,
    RecipeNutritionPanel,
    BackButton,
    TranslatePipe,
    AppInput,
    AppButton,
    IonContent,
    IonIcon,
    FormsModule,
  ],
  templateUrl: './recipe-form.html',
  styleUrl: './recipe-form.css',
})
export class RecipeForm {
  readonly icons = {
    heart,
    heartOutline,
    lockClosedOutline,
    globeOutline,
    closeOutline,
    cameraOutline,
  };
  readonly macroKeys = ['protein', 'carbs', 'fat'] as const;
  readonly editorStep = signal<'details' | 'ingredients' | 'method'>('details');
  readonly editorSteps = ['details', 'ingredients', 'method'] as const;
  readonly loadFailed = signal(false);
  readonly creatingFood = signal(false);
  readonly linkingIndex = signal<number | null>(null);
  linkIngredient(index: number): void {
    this.linkingIndex.set(index);
    this.foodQuery = '';
    this.foodId = '';
    this.error.set('');
  }
  selectFood(): void {
    const food = this.nutrition.foods().find((item) => item.id === this.foodId);
    this.foodUnit = food?.baseUnit ?? 'g';
  }
  close(): void {
    if (!this.saving())
      void this.router.navigateByUrl(this.id ? `/recipes/${this.id}` : '/recipes');
  }
  readonly nutrition = inject(NutritionService);
  readonly nutritionIngredients = signal<NutritionIngredient[]>([]);
  foodId = '';
  foodGrams = 100;
  foodUnit = 'g';
  foodQuery = '';
  filteredFoods() {
    return this.nutrition
      .foods()
      .filter(
        (f) =>
          !f.archived &&
          `${f.name} ${f.brand ?? ''} ${f.preparation ?? ''}`
            .toLowerCase()
            .includes(this.foodQuery.toLowerCase()),
      );
  }
  units() {
    return [
      'g',
      'kg',
      'ml',
      'l',
      ...(this.nutrition.foods().find((f) => f.id === this.foodId)?.portions ?? []).map(
        (p) => p.unit,
      ),
    ];
  }
  summary() {
    return calculateRecipe(
      this.nutritionIngredients(),
      Number(this.model.servings),
      this.nutrition.foods(),
      this.ingredients(),
    );
  }
  updateFood(index: number, quantity: number): void {
    this.nutritionIngredients.update((items) =>
      items.map((x, i) => (i === index ? { ...x, quantity, grams: quantity } : x)),
    );
  }
  scaleFactor = 1;
  scaleRecipe(): void {
    if (!Number.isFinite(this.scaleFactor) || this.scaleFactor <= 0) return;
    if (this.ingredients().some((item) => item.trim())) {
      this.error.set('Link ingredient notes before scaling the recipe.');
      return;
    }
    this.error.set('');
    this.nutritionIngredients.update((items) =>
      items.map((x) => ({
        ...x,
        grams: x.grams * this.scaleFactor,
        quantity: (x.quantity ?? x.grams) * this.scaleFactor,
      })),
    );
    this.model.servings *= this.scaleFactor;
  }
  quickFoodName = '';
  async createMissing(): Promise<void> {
    if (this.creatingFood() || !this.quickFoodName.trim()) return;
    this.creatingFood.set(true);
    this.error.set('');
    try {
      const id = crypto.randomUUID();
      await this.nutrition.saveFood({
        id,
        name: this.quickFoodName,
        category: 'Other',
        calories: this.quickCalories,
        protein: this.quickProtein,
        carbs: this.quickCarbs,
        fat: this.quickFat,
      });
      this.foodId = id;
      this.quickFoodName = '';
      this.selectFood();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not create ingredient.');
    } finally {
      this.creatingFood.set(false);
    }
  }
  quickCalories = 0;
  quickProtein = 0;
  quickCarbs = 0;
  quickFat = 0;
  addFood(): void {
    this.error.set('');
    const food = this.nutrition.foods().find((f) => f.id === this.foodId);
    if (!food || !Number.isFinite(this.foodGrams) || this.foodGrams <= 0) {
      this.error.set('Select a food and enter a positive gram quantity.');
      return;
    }
    try {
      ingredientNutrition(food, this.foodGrams, this.foodUnit);
    } catch (e) {
      this.error.set((e as Error).message);
      return;
    }
    this.nutritionIngredients.update((items) => [
      ...items,
      {
        linked: true,
        quantity: this.foodGrams,
        unit: this.foodUnit,
        foodId: food.id,
        name: food.name,
        grams: this.foodGrams,
        per100: {
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        },
      },
    ]);
    const linkedIndex = this.linkingIndex();
    if (linkedIndex !== null) {
      this.ingredients.update((items) => items.filter((_, index) => index !== linkedIndex));
      this.linkingIndex.set(null);
    }
    this.foodId = '';
    this.foodQuery = '';
    this.foodGrams = 100;
  }
  removeFood(index: number): void {
    this.nutritionIngredients.update((items) => items.filter((_, i) => i !== index));
  }

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly store = inject(RecipeStore);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly loading = signal(!!this.id);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly ingredients = signal<string[]>([]);
  readonly steps = signal<RecipeStep[]>([{ id: crypto.randomUUID(), title: '', instruction: '' }]);
  readonly tags = signal<string[]>([]);
  readonly tagInput = signal('');
  readonly categories = RECIPE_CATEGORIES;
  readonly difficultyOptions: SelectOption[] = RECIPE_DIFFICULTIES.map((value) => ({
    value,
    label: value,
  }));
  model: RecipeInput = {
    title: '',
    description: '',
    category: 'Dinner',
    categories: ['Dinner'],
    cookTime: 30,
    servings: 4,
    difficulty: 'Easy',
    photoUrl: '',
    photoPath: '',
    ingredients: [],
    steps: [],
    tags: [],
    source: '',
    sourceLink: '',
    notes: '',
    favourite: false,
    private: true,
  };
  constructor() {
    addIcons({ heart, heartOutline, lockClosedOutline, globeOutline, closeOutline, cameraOutline });
    if (this.id) void this.load();
  }
  async load(): Promise<void> {
    try {
      const recipe = await this.store.get(this.id!);
      const { id, createdAt, ...input } = recipe;
      this.model = input;
      this.nutritionIngredients.set(recipe.nutritionIngredients ?? []);
      this.ingredients.set([...recipe.ingredients]);
      this.steps.set(recipe.steps.map((step) => ({ ...step })));
      this.tags.set([...recipe.tags]);
    } catch {
      this.loadFailed.set(true);
      this.error.set('Could not load recipe.');
    } finally {
      this.loading.set(false);
    }
  }
  readonly selectedCategories = () => recipeCategories(this.model);
  toggleCategory(value: RecipeCategory): void {
    const selected = this.selectedCategories();
    this.model.categories = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    this.model.category = this.model.categories[0] ?? 'Other';
  }
  setDifficulty(value: string): void {
    this.model.difficulty = value as RecipeInput['difficulty'];
  }
  updateIngredient(index: number, value: string): void {
    this.ingredients.update((items) => items.map((item, i) => (i === index ? value : item)));
  }
  addIngredient(): void {
    this.ingredients.update((items) => [...items, '']);
  }
  removeIngredient(index: number): void {
    this.ingredients.update((items) => items.filter((_, i) => i !== index));
  }
  updateStep(index: number, field: 'title' | 'instruction', value: string): void {
    this.steps.update((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }
  addStep(): void {
    this.steps.update((items) => [
      ...items,
      { id: crypto.randomUUID(), title: '', instruction: '' },
    ]);
  }
  removeStep(index: number): void {
    this.steps.update((items) => items.filter((_, i) => i !== index));
  }
  addTag(): void {
    const value = this.tagInput().trim();
    if (value && !this.tags().includes(value)) this.tags.update((items) => [...items, value]);
    this.tagInput.set('');
  }
  removeTag(tag: string): void {
    this.tags.update((items) => items.filter((item) => item !== tag));
  }
  async save(formUi?: AppForm): Promise<void> {
    if (this.saving() || this.loading() || this.loadFailed() || this.creatingFood()) return;
    const ingredients = this.ingredients()
      .map((item) => item.trim())
      .filter(Boolean);
    const steps = this.steps()
      .map((item) => ({ ...item, title: item.title.trim(), instruction: item.instruction.trim() }))
      .filter((item) => item.instruction);
    if (!this.model.title.trim()) {
      this.editorStep.set('details');
      this.error.set('Enter a recipe title.');
      return;
    }
    if ((!ingredients.length && !this.nutritionIngredients().length) || !steps.length) {
      this.editorStep.set(
        !ingredients.length && !this.nutritionIngredients().length ? 'ingredients' : 'method',
      );
      this.error.set('Add at least one ingredient and one step.');
      return;
    }
    if (!this.selectedCategories().length) {
      this.editorStep.set('details');
      this.error.set('Choose at least one recipe category.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.store.save(
        {
          ...this.model,
          cookTime: Number(this.model.cookTime),
          servings: Number(this.model.servings),
          ingredients,
          nutritionIngredients: this.nutritionIngredients(),
          steps,
          tags: this.tags(),
        },
        this.id ?? undefined,
      );
      formUi?.markSaved();
      await this.router.navigateByUrl(`/recipes/${saved.id}`, { replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save recipe.');
    } finally {
      this.saving.set(false);
    }
  }
  async pickPhoto(): Promise<void> {
    try {
      const photo = await pickImage();
      if (photo) this.model.photoUrl = photo;
    } catch {
      this.error.set('Could not read the photo.');
    }
  }
}
