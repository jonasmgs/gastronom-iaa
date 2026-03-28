import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Leaf, FolderPlus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import PageShell from '@/components/PageShell';
import { generateId } from '@/lib/utils';
import { hapticsImpactMedium, hapticsImpactLight, hapticsSuccess } from '@/lib/haptics';

type IngredientCategory = {
  id: string;
  name: string;
  items: string[];
};

const STORAGE_KEY = 'ingredient_categories';

const DEFAULT_CATEGORIES = [
  'Proteínas',
  'Vegetais',
  'Grãos',
  'Temperos',
  'Laticínios',
  'Frutas',
];

const IngredientsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newIngredient, setNewIngredient] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCategories(JSON.parse(saved));
      } else {
        const seed = DEFAULT_CATEGORIES.map((name) => ({
          id: generateId(),
          name,
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
    const exists = categories.some(
      (c) => c.name.toLowerCase() === newCategory.trim().toLowerCase(),
    );
    if (exists) {
      toast.error(t('ingredients.categoryExists'));
      return;
    }
    const next = [
      { id: generateId(), name: newCategory.trim(), items: [] },
      ...categories,
    ];
    hapticsImpactMedium();
    saveCategories(next);
    setNewCategory('');
  };

  const handleAddIngredient = () => {
    if (!selectedCategory) {
      toast.error(t('ingredients.selectCategory'));
      return;
    }
    if (!newIngredient.trim()) return;
    const next = categories.map((cat) =>
      cat.id === selectedCategory
        ? { ...cat, items: [newIngredient.trim(), ...cat.items].slice(0, 50) }
        : cat,
    );
    hapticsImpactMedium();
    saveCategories(next);
    setNewIngredient('');
    toast.success(t('ingredients.ingredientAdded'));
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
                <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                      <p className="text-sm font-bold text-foreground">{cat.name}</p>
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
