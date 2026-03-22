export interface Step {
  step_number: number;
  title: string;
  description: string;
  duration?: string;
  tip?: string;
}

export interface Ingredient {
  name: string;
  quantity: string;
  calories: number;
  tip?: string;
}

export interface RecipeGeneratorResponse {
  recipe_name: string;
  difficulty?: string;
  prep_time?: string;
  cook_time?: string;
  servings?: number;
  dietary_tags?: string[];
  ingredients?: Ingredient[];
  steps?: Step[];
  calories_total?: number;
  nutrition_info?: string;
  chef_tips?: string;
  substitutions_made?: string;
  preparation?: string;
}

export interface EdgeFunctionError {
  message?: string;
  error?: string;
}
