// Type definitions for Recipe Emporium SaaS Template

export interface Recipe {
  id?: string;
  created_at?: string;
  name: string;
  ingredients: string[];
  instructions: string;
  user_id?: string;
  // Extended properties added by server actions
  userFirstName?: string;
  userImageUrl?: string;
  unlocked?: boolean;
}

export interface Comment {
  id?: string;
  created_at?: string;
  comment: string;
  user_id: string;
  recipe_id: string;
  // Extended properties added by server actions
  userFirstName?: string;
  userImageUrl?: string;
}

export interface RecipeUnlocked {
  id?: string;
  created_at?: string;
  recipe_id: string;
  user_id: string;
}