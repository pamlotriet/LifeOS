import { MealCategory } from '../nutrition/nutrition.model';
export interface MealPlanItem {
  id: string;
  date: string;
  title: string;
  detail: string;
  recipeId?: string;
  servings?: number;
  meal?: MealCategory;
  ingredientId?: string;
  quantity?: number;
  unit?: string;
}
export interface GroceryItem {
  id: string;
  name: string;
  section: string;
  checked: boolean;
  generatedKey?: string;
}

export type MealPlanEntry = MealPlanItem;
