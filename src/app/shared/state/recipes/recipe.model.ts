import { NutritionIngredient } from '../nutrition/nutrition.model';
export const RECIPE_CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
  'Desserts',
  'Drinks',
  'Other',
] as const;
export const RECIPE_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];
export type RecipeDifficulty = (typeof RECIPE_DIFFICULTIES)[number];
export interface RecipeStep {
  id: string;
  title: string;
  instruction: string;
}
export interface RecipeRecord {
  id: string;
  title: string;
  description: string;
  category: RecipeCategory;
  categories?: RecipeCategory[];
  cookTime: number;
  servings: number;
  servingWeight?: number;
  difficulty: RecipeDifficulty;
  photoUrl: string;
  photoPath: string;
  nutritionIngredients?: NutritionIngredient[];
  ingredients: string[];
  steps: RecipeStep[];
  tags: string[];
  source: string;
  sourceLink: string;
  notes: string;
  favourite: boolean;
  private: boolean;
  createdAt: string;
}
export type RecipeInput = Omit<RecipeRecord, 'id' | 'createdAt'>;

/** Reads legacy single-category recipes as a one-item selection. */
export function recipeCategories(recipe: {
  category?: RecipeCategory;
  categories?: readonly RecipeCategory[];
}): RecipeCategory[] {
  const values = recipe.categories ?? [recipe.category ?? 'Other'];
  return [...new Set(values.filter((value) => RECIPE_CATEGORIES.includes(value)))];
}
