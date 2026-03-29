import { generateId } from '@/lib/utils';

export type PantryCategory = {
  id: string;
  slug: string;
  name?: string;
  items: string[];
};

const STORAGE_KEY = 'ingredient_categories';

export const DEFAULT_CATEGORY_SLUGS = [
  'proteins',
  'vegetables',
  'grains',
  'flours',
  'spices',
  'dairy',
  'fruits',
  'sweeteners',
  'seafood',
  'beverages',
  'others',
];

const keywordMap: Record<string, string[]> = {
  proteins: ['frango', 'carne', 'boi', 'bife', 'porco', 'ovo', 'egg', 'chicken', 'beef', 'pork', 'tofu', 'tempeh', 'lamb', 'steak'],
  vegetables: ['alface', 'couve', 'brocolis', 'cenoura', 'tomate', 'pepino', 'salad', 'lettuce', 'kale', 'broccoli', 'carrot', 'tomato', 'cucumber', 'spinach'],
  fruits: ['maca', 'banana', 'laranja', 'pera', 'uva', 'manga', 'apple', 'banana', 'orange', 'grape', 'mango', 'berry', 'strawberry'],
  grains: ['arroz', 'feijao', 'lentilha', 'grao', 'quinoa', 'oats', 'rice', 'bean', 'lentil', 'oat', 'quinoa', 'barley', 'cereal'],
  flours: ['farinha', 'flour', 'trigo', 'rice flour', 'almond flour', 'oat flour', 'corn starch', 'maizena'],
  sweeteners: ['acucar', 'açúcar', 'sugar', 'mel', 'honey', 'stevia', 'adoçante', 'xylitol', 'eritritol', 'erythritol', 'agave', 'maple'],
  spices: ['pimenta', 'sal', 'ervas', 'oregano', 'alho', 'onion', 'garlic', 'pepper', 'spice', 'herb', 'paprika', 'curry'],
  dairy: ['leite', 'queijo', 'manteiga', 'cream', 'milk', 'cheese', 'butter', 'yogurt'],
  seafood: ['peixe', 'camarao', 'tilapia', 'fish', 'shrimp', 'salmon', 'tuna'],
  beverages: ['suco', 'juice', 'cafe', 'coffee', 'cha', 'tea'],
  others: [],
};

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'others';

const migrate = (cats: any[]): PantryCategory[] =>
  cats.map((c) => {
    if (c.slug) return c as PantryCategory;
    return { ...c, slug: slugify(c.name || '') || 'others' } as PantryCategory;
  });

export const loadCategories = (): PantryCategory[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = migrate(JSON.parse(raw));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
    const seed = DEFAULT_CATEGORY_SLUGS.map((slug) => ({
      id: generateId(),
      slug,
      items: [],
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  } catch (err) {
    console.error('loadCategories', err);
    return [];
  }
};

export const saveCategories = (cats: PantryCategory[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
  return cats;
};

export const guessCategorySlug = async (ingredient: string): Promise<string> => {
  const text = ingredient.toLowerCase();
  for (const [slug, words] of Object.entries(keywordMap)) {
    if (words.some((w) => text.includes(w))) return slug;
  }
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(ingredient)}&json=1&page_size=1`,
    );
    const data = await response.json();
    const tags: string[] = data?.products?.[0]?.categories_tags || [];
    const tagStr = tags.join(' ').toLowerCase();
    if (tagStr.includes('fruit')) return 'fruits';
    if (tagStr.includes('vegetable')) return 'vegetables';
    if (tagStr.includes('meat') || tagStr.includes('poultry')) return 'proteins';
    if (tagStr.includes('flour') || tagStr.includes('starch')) return 'flours';
    if (tagStr.includes('sugar') || tagStr.includes('sweetener') || tagStr.includes('honey')) return 'sweeteners';
    if (tagStr.includes('fish') || tagStr.includes('seafood')) return 'seafood';
    if (tagStr.includes('dairy')) return 'dairy';
    if (tagStr.includes('cereal') || tagStr.includes('grain')) return 'grains';
    if (tagStr.includes('spice') || tagStr.includes('herb')) return 'spices';
    if (tagStr.includes('beverage') || tagStr.includes('drink')) return 'beverages';
  } catch (err) {
    console.warn('OpenFoodFacts lookup failed', err);
  }
  return 'others';
};

const ingredientExists = (cats: PantryCategory[], ingredient: string) => {
  const lower = ingredient.toLowerCase();
  return cats.some((c) => c.items.some((i) => i.toLowerCase() === lower));
};

export const addIngredientAuto = async (
  ingredient: string,
  preferredCategoryId?: string,
): Promise<PantryCategory[]> => {
  const clean = ingredient.trim();
  if (!clean) return loadCategories();

  let cats = loadCategories();

  // dedupe global
  if (ingredientExists(cats, clean)) return cats;

  let targetId = preferredCategoryId;
  let targetSlug: string | null = null;

  if (!targetId) {
    targetSlug = await guessCategorySlug(clean);
    let target = cats.find((c) => c.slug === targetSlug);
    if (!target) {
      target = { id: generateId(), slug: targetSlug, items: [] };
      cats = [target, ...cats];
    }
    targetId = target.id;
  }

  const next = cats.map((c) =>
    c.id === targetId ? { ...c, items: [clean, ...c.items].slice(0, 50) } : c,
  );
  return saveCategories(next);
};

export const addIngredientsAuto = async (ingredients: string[]) => {
  let cats = loadCategories();
  for (const ing of ingredients) {
    const clean = ing?.trim();
    if (!clean || ingredientExists(cats, clean)) continue;
    const slug = await guessCategorySlug(clean);
    let target = cats.find((c) => c.slug === slug);
    if (!target) {
      target = { id: generateId(), slug, items: [] };
      cats = [target, ...cats];
    }
    target.items = [clean, ...target.items].slice(0, 50);
  }
  return saveCategories(cats);
};

export const ensureDefaultCategories = () => loadCategories();
