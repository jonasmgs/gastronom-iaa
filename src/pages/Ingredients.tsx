import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Leaf, FolderPlus, X, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import PageShell from '@/components/PageShell';
import { generateId } from '@/lib/utils';
import { hapticsImpactMedium, hapticsImpactLight, hapticsSuccess } from '@/lib/haptics';

type IngredientCategory = {
  id: string;
  slug: string;
  name?: string;
  items: string[];
};

const STORAGE_KEY = 'ingredient_categories';

const DEFAULT_CATEGORY_SLUGS = [
  'proteins',
  'vegetables',
  'grains',
  'spices',
  'dairy',
  'fruits',
  'seafood',
  'beverages',
  'others',
];

const IngredientsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newIngredient, setNewIngredient] = useState('');

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'others';

  const categoryLabel = (cat: IngredientCategory) => {
    if (cat.name) return cat.name;
    const key = `ingredients.cat_${cat.slug}`;
    const translated = t(key);
    return translated === key ? cat.slug : translated;
  };

  const ensureCategory = (slug: string) => {
    const found = categories.find((c) => c.slug === slug);
    if (found) return found;
    const created: IngredientCategory = { id: generateId(), slug, items: [] };
    const next = [created, ...categories];
    setCategories(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return created;
  };

  const guessCategorySlug = async (ingredient: string): Promise<string> => {
    const text = ingredient.toLowerCase();
    const keywordMap: Record<string, string[]> = {
      proteins: ['frango', 'carne', 'boi', 'bife', 'porco', 'ovo', 'egg', 'chicken', 'beef', 'pork', 'tofu', 'tempeh', 'lamb', 'steak'],
      vegetables: ['alface', 'couve', 'brocolis', 'cenoura', 'tomate', 'pepino', 'salad', 'lettuce', 'kale', 'broccoli', 'carrot', 'tomato', 'cucumber', 'spinach'],
      fruits: ['maca', 'banana', 'laranja', 'pera', 'uva', 'manga', 'apple', 'banana', 'orange', 'grape', 'mango', 'berry', 'strawberry'],
      grains: ['arroz', 'feijao', 'lentilha', 'grao', 'quinoa', 'oats', 'rice', 'bean', 'lentil', 'oat', 'quinoa', 'barley'],
      spices: ['pimenta', 'sal', 'ervas', 'oregano', 'alho', 'onion', 'garlic', 'pepper', 'spice', 'herb', 'paprika', 'curry'],
      dairy: ['leite', 'queijo', 'manteiga', 'cream', 'milk', 'cheese', 'butter', 'yogurt'],
      seafood: ['peixe', 'camarao', 'tilapia', 'fish', 'shrimp', 'salmon', 'tuna'],
      beverages: ['suco', 'juice', 'cafe', 'coffee', 'cha', 'tea'],
      others: [],
    };
    for (const [slug, words] of Object.entries(keywordMap)) {
      if (words.some((w) => text.includes(w))) return slug;
    }

    // Tentativa com Open Food Facts para pegar categorias
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: any[] = JSON.parse(saved);
        const migrated = parsed.map((c) => {
          if (c.slug) return c;
          const slug = slugify(c.name || '');
          return { ...c, slug };
        });
        setCategories(migrated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } else {
        const seed = DEFAULT_CATEGORY_SLUGS.map((slug) => ({
          id: generateId(),
          slug,
          items: [],
        }));
        setCategories(seed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
      toast.error(t('common.storageError', 'Erro ao carregar dados locais.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const saveCategories = (next: IngredientCategory[]) => {
    try {
      setCategories(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      hapticsSuccess();
    } catch (error) {
      console.error('Error saving ingredients:', error);
      toast.error(t('common.storageError', 'Erro ao salvar dados localmente.'));
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const slug = slugify(newCategory);
    const exists = categories.some((c) => c.slug === slug);
    if (exists) {
      toast.error(t('ingredients.categoryExists'));
      return;
    }
    const next = [
      { id: generateId(), slug, name: newCategory.trim(), items: [] },
      ...categories,
    ];
    hapticsImpactMedium();
    saveCategories(next);
    setNewCategory('');
  };

  const handleAddIngredient = async () => {
    const ingredient = newIngredient.trim();
    if (!ingredient) return;

    let targetCategoryId = selectedCategory;

    if (!targetCategoryId) {
      const slug = await guessCategorySlug(ingredient);
      const cat = ensureCategory(slug);
      targetCategoryId = cat.id;
      toast.success(t('ingredients.autoCategorized', 'Categoria detectada automaticamente.'));
    }

    const next = categories.map((cat) =>
      cat.id === targetCategoryId
        ? { ...cat, items: [ingredient, ...cat.items].slice(0, 50) }
        : cat,
    );
    hapticsImpactMedium();
    saveCategories(next);
    setNewIngredient('');
  };

  const handleRemoveIngredient = (catId: string, idx: number) => {
    const next = categories.map((cat) =>
      cat.id === catId
        ? { ...cat, items: cat.items.filter((_, i) => i !== idx) }
        : cat,
    );
    hapticsImpactLight();
    saveCategories(next);
    toast.success(t('ingredients.ingredientRemoved'));
  };

  const handleClearAll = () => {
    const cleared = categories.map((c) => ({ ...c, items: [] }));
    hapticsImpactMedium();
    saveCategories(cleared);
    toast.success(t('ingredients.clearedAll'));
  };

  return (
    <main className="min-h-screen bg-background pb-36 sm:pb-40">
      <PageShell className="space-y-4">
        <header className="pt-12 sm:pt-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-muted text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              {t('ingredients.subtitle', 'Pantry')}
            </p>
            <h1 className="text-2xl font-black text-foreground">{t('ingredients.title')}</h1>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleClearAll}
              className="h-10 px-3 rounded-full bg-muted text-xs font-semibold text-foreground/80 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t('ingredients.removeAll')}
            </button>
          </div>
        </header>

        {/* Add Category */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{t('ingredients.addCategory')}</p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t('ingredients.categoryPlaceholder')}
              className="flex-1 min-w-0 bg-muted/50 border-none rounded-xl px-3 sm:px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              {t('ingredients.addCategory')}
            </button>
          </div>
        </div>

        {/* Add Ingredient */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{t('ingredients.addIngredient')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-w-[180px] bg-muted/50 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">{t('ingredients.selectCategory')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{categoryLabel(cat)}</option>
              ))}
            </select>
            <input
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              placeholder={t('ingredients.ingredientPlaceholder')}
              className="flex-1 min-w-0 bg-muted/50 border-none rounded-xl px-3 sm:px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <button
              onClick={handleAddIngredient}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              {t('ingredients.addIngredient')}
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : categories.every((c) => c.items.length === 0) ? (
            <div className="text-center py-14 border border-dashed border-border rounded-2xl bg-muted/20">
              <p className="text-base font-semibold text-foreground mb-1">{t('ingredients.empty')}</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('ingredients.emptyDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="border border-border rounded-2xl bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{categoryLabel(cat)}</p>
                      <p className="text-xs text-muted-foreground">{cat.items.length} {t('ingredients.items', { count: cat.items.length, defaultValue: 'itens' })}</p>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {cat.items.map((item, idx) => (
                      <motion.div
                        key={`${cat.id}-${idx}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 mb-2 last:mb-0"
                      >
                        <span className="text-sm text-foreground">{item}</span>
                        <button
                          onClick={() => handleRemoveIngredient(cat.id, idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageShell>
      <BottomNav />
    </main>
  );
};

export default IngredientsPage;
