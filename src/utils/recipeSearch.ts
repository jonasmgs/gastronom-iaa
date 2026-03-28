export interface DietaryFilters {
  vegan?: boolean;
  glutenFree?: boolean;
  lactoseFree?: boolean;
  vegetarian?: boolean;
}

type ExternalRecipe = {
  name: string;
  category?: string;
  instructions?: string;
  ingredients: string[];
  thumbnail?: string;
  nutrition?: any;
  source?: string;
};

const spoonacularKey = import.meta.env.VITE_SPOONACULAR_KEY;

// Busca no Spoonacular (requer API key)
const searchSpoonacular = async (recipeName: string): Promise<{ found: false } | { found: true; data: ExternalRecipe }> => {
  if (!spoonacularKey) return { found: false };
  try {
    const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(recipeName)}&addRecipeInformation=true&number=1&apiKey=${spoonacularKey}`;
    const response = await fetch(url);
    if (!response.ok) return { found: false };
    const data = await response.json();
    const result = data?.results?.[0];
    if (!result) return { found: false };

    const ingredients =
      result.extendedIngredients?.map((ing: any) => `${ing.original}`.trim()).filter(Boolean) || [];

    return {
      found: true,
      data: {
        name: result.title,
        category: result.dishTypes?.[0],
        instructions: result.instructions || '',
        ingredients,
        thumbnail: result.image,
        nutrition: result.nutrition,
        source: 'Spoonacular',
      },
    };
  } catch (err) {
    console.warn('Spoonacular search failed', err);
    return { found: false };
  }
};

// Busca no TheMealDB
const searchMealDB = async (recipeName: string) => {
  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(recipeName)}`,
    );
    const data = await response.json();
    if (data.meals && data.meals.length > 0) {
      return { found: true as const, source: 'MealDB', data: data.meals[0] };
    }
    return { found: false as const };
  } catch {
    return { found: false as const };
  }
};

// Busca por categoria/filtro no MealDB
const searchByDietaryFilter = async (filters: DietaryFilters) => {
  try {
    // MealDB tem categorias: Vegetarian, Vegan, etc (vegan listado dentro de Vegetarian)
    if (filters.vegan || filters.vegetarian) {
      const response = await fetch(
        'https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian',
      );
      const data = await response.json();
      return data.meals || [];
    }
    return [];
  } catch {
    return [];
  }
};

// Busca no Open Food Facts (ingredientes e informações nutricionais)
const searchOpenFoodFacts = async (ingredient: string) => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(ingredient)}&json=1&page_size=1`,
    );
    const data = await response.json();
    if (data.products && data.products.length > 0) {
      return { found: true as const, nutrition: data.products[0].nutriments };
    }
    return { found: false as const };
  } catch {
    return { found: false as const };
  }
};

const hydrateMealFromId = async (idMeal: string) => {
  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(idMeal)}`,
    );
    const data = await response.json();
    if (data.meals && data.meals.length > 0) {
      return data.meals[0];
    }
    return null;
  } catch {
    return null;
  }
};

export const searchRecipeFromAPIs = async (
  recipeName: string,
  filters: DietaryFilters,
) => {
  // 1) Spoonacular (se tiver chave)
  const spoon = await searchSpoonacular(recipeName);
  if (spoon.found) {
    return {
      found: true,
      source: spoon.data.source || 'Spoonacular',
      name: spoon.data.name,
      category: spoon.data.category,
      instructions: spoon.data.instructions,
      ingredients: spoon.data.ingredients,
      thumbnail: spoon.data.thumbnail,
      nutrition: spoon.data.nutrition,
    };
  }

  // 2) MealDB (sem chave)
  const [mealDB, filterMeals] = await Promise.all([
    searchMealDB(recipeName),
    searchByDietaryFilter(filters),
  ]);

  const pickMeal = async () => {
    if (mealDB.found) return mealDB.data;
    if (filterMeals.length > 0) {
      const detailed = await hydrateMealFromId(filterMeals[0].idMeal);
      if (detailed) return detailed;
    }
    return null;
  };

  const meal = await pickMeal();
  if (meal) {
    const ingredients: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push(`${(measure || '').trim()} ${ingredient.trim()}`.trim());
      }
    }

    const nutritionSource = ingredients.length > 0
      ? await searchOpenFoodFacts(ingredients[0].split(' ').slice(-1).join(' '))
      : { found: false as const };

    return {
      found: true,
      source: mealDB.found ? 'MealDB' : 'MealDB:Filter',
      name: meal.strMeal,
      category: meal.strCategory,
      instructions: meal.strInstructions,
      ingredients,
      thumbnail: meal.strMealThumb,
      nutrition: nutritionSource.found ? nutritionSource.nutrition : null,
    };
  }

  return { found: false as const };
};
