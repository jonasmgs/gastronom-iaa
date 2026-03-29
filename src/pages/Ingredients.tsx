import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Leaf, X, Check, ArrowLeft, Wheat, Coffee, Fish, Apple, Candy, Cookie, Beef, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import PageShell from '@/components/PageShell';
import { hapticsImpactMedium, hapticsImpactLight, hapticsSuccess } from '@/lib/haptics';
import {
  loadCategories,
  saveCategories as persistCategories,
  slugify,
  addIngredientAuto,
  PantryCategory,
} from '@/utils/pantry';
import { generateId } from '@/lib/utils';

const IngredientsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<PantryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newIngredient, setNewIngredient] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const categoryLabel = (cat: PantryCategory) => {
    if (cat.name) return cat.name;
    const key = `ingredients.cat_${cat.slug}`;
    const translated = t(key);
    return translated === key ? cat.slug : translated;
  };

  useEffect(() => {
    try {
      const seed = loadCategories();
      setCategories(seed);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      toast.error(t('common.storageError', 'Erro ao carregar dados locais.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const setAndSave = (next: PantryCategory[]) => {
    try {
      persistCategories(next);
      setCategories(next);
      hapticsSuccess();
    } catch (error) {
      console.error('Error saving ingredients:', error);
      toast.error(t('common.storageError', 'Erro ao salvar dados localmente.'));
    }
  };

  const handleAddIngredient = async () => {
    const ingredient = newIngredient.trim();
    if (!ingredient) return;
    hapticsImpactMedium();
    const next = await addIngredientAuto(ingredient, selectedCategory || undefined);
    if (!selectedCategory) {
      toast.success(t('ingredients.autoCategorized', 'Categoria detectada automaticamente.'));
    }
    setCategories(next);
    setNewIngredient('');
  };

  const handleRemoveIngredient = (catId: string, idx: number) => {
    const next = categories.map((cat) =>
      cat.id === catId
        ? { ...cat, items: cat.items.filter((_, i) => i !== idx) }
        : cat,
    );
    hapticsImpactLight();
    setAndSave(next);
    toast.success(t('ingredients.ingredientRemoved'));
  };

  const toggleSelect = (catId: string, item: string) => {
    const key = `${catId}:${item}`;
    setSelectedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSendToRecipe = () => {
    const selected = Object.entries(selectedItems)
      .filter(([, v]) => v)
      .map(([k]) => k.split(':')[1]);
    if (selected.length === 0) {
      toast.error(t('ingredients.selectCategory'));
      return;
    }
    try {
      localStorage.setItem('selected_ingredients', JSON.stringify(selected));
      toast.success(t('ingredients.sentToRecipe', 'Ingredientes enviados para a tela de receita.'));
      setSelectedItems({});
    } catch (err) {
      console.error(err);
      toast.error(t('common.storageError', 'Erro ao salvar dados localmente.'));
    }
  };

  const handleClearAll = () => {
    const cleared = categories.map((c) => ({ ...c, items: [] }));
    hapticsImpactMedium();
    setAndSave(cleared);
    toast.success(t('ingredients.clearedAll'));
  };

  const renderCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'proteins': return <Beef className="h-4 w-4" />;
      case 'vegetables': return <Leaf className="h-4 w-4" />;
      case 'fruits': return <Apple className="h-4 w-4" />;
      case 'grains': return <Wheat className="h-4 w-4" />;
      case 'flours': return <Cookie className="h-4 w-4" />;
      case 'leaveners': return <Circle className="h-4 w-4" />;
      case 'sweeteners': return <Candy className="h-4 w-4" />;
      case 'spices': return <Leaf className="h-4 w-4" />;
      case 'dairy': return <Cookie className="h-4 w-4" />;
      case 'seafood': return <Fish className="h-4 w-4" />;
      case 'beverages': return <Coffee className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
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
                      {renderCategoryIcon(cat.slug)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{categoryLabel(cat)}</p>
                      <p className="text-xs text-muted-foreground">{cat.items.length} {t('ingredients.items', { count: cat.items.length, defaultValue: 'itens' })}</p>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {cat.items.map((item, idx) => {
                      const key = `${cat.id}:${item}`;
                      const checked = Boolean(selectedItems[key]);
                      return (
                      <motion.div
                        key={`${cat.id}-${idx}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 mb-2 last:mb-0 transition-colors ${checked ? 'bg-primary/10 border border-primary/30' : 'bg-muted/40'}`}
                      >
                        <button
                          onClick={() => toggleSelect(cat.id, item)}
                          className="flex items-center gap-2 text-left"
                        >
                          <div className={`h-4 w-4 rounded-sm border ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
                          <span className="text-sm text-foreground">{item}</span>
                        </button>
                        <button
                          onClick={() => handleRemoveIngredient(cat.id, idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSendToRecipe}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 font-semibold shadow-md active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            {t('ingredients.sendToRecipe', 'Usar na receita')}
          </button>
        </div>
      </PageShell>
      <BottomNav />
    </main>
  );
};

export default IngredientsPage;
