export const RECIPE_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts', 'Drinks', 'Other'] as const;
export const RECIPE_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type RecipeCategory = typeof RECIPE_CATEGORIES[number];
export type RecipeDifficulty = typeof RECIPE_DIFFICULTIES[number];
export interface RecipeStep { id: string; title: string; instruction: string; }
export interface RecipeRecord {
  id: string; title: string; description: string; category: RecipeCategory; cookTime: number;
  servings: number; difficulty: RecipeDifficulty; photoUrl: string; photoPath: string;
  ingredients: string[]; steps: RecipeStep[]; tags: string[]; source: string; sourceLink: string;
  notes: string; favourite: boolean; private: boolean; createdAt: string;
}
export type RecipeInput = Omit<RecipeRecord, 'id' | 'createdAt'>;
