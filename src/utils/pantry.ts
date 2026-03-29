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
  'produce',
  'dairy',
  'others',
];

const keywordMap: Record<string, string[]> = {
  proteins: ['frango', 'carne', 'boi', 'bife', 'porco', 'ovo', 'egg', 'chicken', 'beef', 'pork', 'tofu', 'tempeh', 'lamb', 'steak', 'peixe', 'camarao', 'tilapia', 'fish', 'shrimp', 'salmon', 'tuna'],
  produce: ['alface', 'couve', 'brocolis', 'cenoura', 'tomate', 'pepino', 'salad', 'lettuce', 'kale', 'broccoli', 'carrot', 'tomato', 'cucumber', 'spinach', 'maca', 'banana', 'laranja', 'pera', 'uva', 'manga', 'apple', 'orange', 'grape', 'mango', 'berry', 'strawberry', 'lemon', 'lime'],
  dairy: ['leite', 'queijo', 'manteiga', 'manteiga sem sal', 'cream', 'milk', 'cheese', 'butter', 'yogurt'],
  others: [],
};

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'others';

const normalizeIngredientName = (raw: string) => {
  const base = raw.split('(')[0].split(',')[0].trim();
  const firstWord = base.split(/\s+/)[0] || base;
  const display = base || raw.trim();
  const normalized = firstWord
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return { display, normalized };
};

const migrate = (cats: any[]): PantryCategory[] => {
  const mapping: Record<string, string> = {
    proteins: 'proteins',
    seafood: 'proteins',
    vegetables: 'produce',
    fruits: 'produce',
    produce: 'produce',
    dairy: 'dairy',
  };

  const consolidated: Record<string, PantryCategory> = {};

  // Initialize defaults
  DEFAULT_CATEGORY_SLUGS.forEach(slug => {
    consolidated[slug] = { id: generateId(), slug, items: [] };
  });

  cats.forEach((c) => {
    const oldSlug = c.slug || slugify(c.name || '') || 'others';
    const newSlug = mapping[oldSlug] || 'others';
    
    // Merge items into the new slug
    const target = consolidated[newSlug];
    if (target && Array.isArray(c.items)) {
      c.items.forEach((item: string) => {
        if (!target.items.includes(item)) {
          target.items.push(item);
        }
      });
    }
  });

  return Object.values(consolidated);
};

export const loadCategories = (): PantryCategory[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return migrate(JSON.parse(raw));
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
    
    if (tagStr.includes('meat') || tagStr.includes('poultry') || tagStr.includes('fish') || tagStr.includes('seafood')) return 'proteins';
    if (tagStr.includes('fruit') || tagStr.includes('vegetable')) return 'produce';
    if (tagStr.includes('dairy') || tagStr.includes('cheese') || tagStr.includes('milk')) return 'dairy';
  } catch (err) {
    console.warn('OpenFoodFacts lookup failed', err);
  }
  return 'others';
};

const ingredientExists = (cats: PantryCategory[], ingredient: string) => {
  const norm = normalizeIngredientName(ingredient).normalized;
  return cats.some((c) => c.items.some((i) => normalizeIngredientName(i).normalized === norm));
};

export const addIngredientAuto = async (
  ingredient: string,
  preferredCategoryId?: string,
): Promise<PantryCategory[]> => {
  const { display, normalized } = normalizeIngredientName(ingredient);
  if (!display) return loadCategories();

  let cats = loadCategories();

  // dedupe global
  if (ingredientExists(cats, display)) return cats;

  let targetId = preferredCategoryId;
  let targetSlug: string | null = null;

  if (!targetId) {
    targetSlug = await guessCategorySlug(normalized);
    let target = cats.find((c) => c.slug === targetSlug);
    if (!target) {
      target = { id: generateId(), slug: targetSlug, items: [] };
      cats = [target, ...cats];
    }
    targetId = target.id;
  }

  const next = cats.map((c) =>
    c.id === targetId ? { ...c, items: [display, ...c.items].slice(0, 50) } : c,
  );
  return saveCategories(next);
};

export const addIngredientsAuto = async (ingredients: string[]) => {
  let cats = loadCategories();
  for (const ing of ingredients) {
    const { display, normalized } = normalizeIngredientName(ing || '');
    if (!display || ingredientExists(cats, display)) continue;
    const slug = await guessCategorySlug(normalized);
    let target = cats.find((c) => c.slug === slug);
    if (!target) {
      target = { id: generateId(), slug, items: [] };
      cats = [target, ...cats];
    }
    target.items = [display, ...target.items].slice(0, 50);
  }
  return saveCategories(cats);
};

export const ensureDefaultCategories = () => loadCategories();
