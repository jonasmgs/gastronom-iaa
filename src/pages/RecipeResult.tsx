import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, Share2, Check, Clock, ChefHat, Users, Gauge, Leaf, WheatOff, MilkOff, Loader2, Wand2, MessageCircle, Pencil, Play, ShoppingCart, X, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import BottomNav from '@/components/BottomNav';
import RecipeChat from '@/components/RecipeChat';
import RecipeEditDrawer from '@/components/RecipeEditDrawer';
import CookingMode from '@/components/CookingMode';
import bgUtensils from '@/assets/bg-utensils.jpg';
import type { Tables } from '@/integrations/supabase/types';
import { invokeEdgeFunction } from '@/lib/edge-functions';
import type { Ingredient, RecipeGeneratorResponse, Step } from '@/types/recipe';
import { hapticsImpactLight, hapticsSuccess, hapticsError } from '@/lib/haptics';

function safeParseJSONArray<T>(data: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed as T[] : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function safeParseJSONObject<T>(data: unknown, fallback: T): T {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) return data as T;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return (typeof parsed === 'object' && parsed !== null) ? parsed as T : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

interface RecipeMeta {
  nutrition_info?: string;
  chef_tips?: string;
  difficulty?: string;
  prep_time?: string;
  cook_time?: string;
  servings?: number;
  steps?: Step[];
  dietary_tags?: string[];
  substitutions_made?: string;
}

interface DietaryFilters {
  vegan: boolean;
  glutenFree: boolean;
  lactoseFree: boolean;
}

const RecipeResult = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Tables<'recipes'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [transforming, setTransforming] = useState(false);
  const [filters, setFilters] = useState<DietaryFilters>({ vegan: false, glutenFree: false, lactoseFree: false });
  const [chatOpen, setChatOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cookingModeOpen, setCookingModeOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [shoppingList, setShoppingList] = useState<Array<{id: string; name: string; quantity: string; price: number; recipeName: string; checked: boolean; createdAt: string}>>([]);

  const addToShoppingList = () => {
    if (!recipe) return;
    setAddingToCart(true);
    hapticsImpactLight();
    const currentIngredients = safeParseJSONArray<Ingredient>(recipe.ingredients);
    
    const existingListStr = localStorage.getItem('shopping_list');
    const existingList = existingListStr ? JSON.parse(existingListStr) : [];
    
    const newItems = currentIngredients.map(ing => ({
      id: crypto.randomUUID(),
      name: ing.name,
      quantity: ing.quantity,
      price: ing.price || 0,
      recipeName: recipe.recipe_name,
      checked: false,
      createdAt: new Date().toISOString()
    }));
    
    localStorage.setItem('shopping_list', JSON.stringify([...existingList, ...newItems]));
    
    setTimeout(() => {
      setAddingToCart(false);
      hapticsSuccess();
      toast.success(t('recipe.addedToShoppingList'));
    }, 500);
  };

  usePageTitle(recipe?.recipe_name);

  const fetchRecipe = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      toast.error(t('recipes.notFound'));
      navigate('/');
    } else {
      setRecipe(data);
    }
    setLoading(false);
  }, [id, navigate, t]);

  useEffect(() => {
    fetchRecipe();
  }, [fetchRecipe]);

  const handleShare = async () => {
    if (!recipe) return;
    hapticsImpactLight();
    const shareIngredients = safeParseJSONArray<Ingredient>(recipe.ingredients);
    const shareMeta = safeParseJSONObject<RecipeMeta>(recipe.nutrition_info, {});
    const shareSteps = safeParseJSONArray<Step>(shareMeta.steps);

    let text = `🍽️ ${recipe.recipe_name}\n`;
    text += `🔥 ${recipe.calories_total} kcal\n`;
    if (meta.difficulty) text += `📊 ${t('recipe.difficulty')}: ${meta.difficulty}\n`;
    if (meta.prep_time) text += `⏱️ ${t('common.prep')}: ${meta.prep_time}\n`;
    if (meta.cook_time) text += `🕐 ${t('common.cooking')}: ${meta.cook_time}\n`;
    if (meta.servings) text += `👥 ${meta.servings} ${t('common.portions')}\n`;
    text += `\n${t('recipe.ingredients')}\n`;
    shareIngredients.forEach(ing => {
      text += `• ${ing.name} — ${ing.quantity} (${ing.calories} kcal)\n`;
    });
    text += `\n${t('recipe.stepByStep')}\n`;
    if (shareSteps.length > 0) {
      shareSteps.forEach(step => {
        text += `${step.step_number}. ${step.title}: ${step.description}`;
        if (step.duration) text += ` (${step.duration})`;
        if (step.tip) text += `\n   💡 ${step.tip}`;
        text += '\n\n';
      });
    } else {
      text += recipe.preparation + '\n';
    }
    if (shareMeta.chef_tips) text += `\n👨‍🍳 ${t('recipe.chefTips')}\n${shareMeta.chef_tips}\n`;
    if (shareMeta.nutrition_info) text += `\n📊 ${t('recipe.nutritionInfo')}\n${shareMeta.nutrition_info}\n`;
    text += `\nFeito com Gastronom.IA`;

    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success(t('common.copied'));
    }
  };

  const toggleFilter = (key: keyof DietaryFilters) => {
    hapticsImpactLight();
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasActiveFilters = filters.vegan || filters.glutenFree || filters.lactoseFree;

  const transformRecipe = async () => {
    if (!recipe || !hasActiveFilters || !user) return;
    setTransforming(true);
    hapticsImpactLight();
    try {
      const transformIngredients = safeParseJSONArray<Ingredient>(recipe.ingredients);
      const transformMeta = safeParseJSONObject<RecipeMeta>(recipe.nutrition_info, {});
      
      const existingText = `Nome: ${recipe.recipe_name}\nIngredientes: ${transformIngredients.map(i => `${i.name} (${i.quantity})`).join(', ')}\nPreparo: ${recipe.preparation}`;

      const { data, error } = await invokeEdgeFunction<RecipeGeneratorResponse>('recipe-generator', {
        body: { mode: 'transform', existing_recipe: existingText, filters },
        token: session?.access_token,
      });
      if (error) throw error;

      const transformed = data;
      const preparation = transformed.steps
        ? transformed.steps.map((s: Step) => `${s.step_number}. ${s.title}: ${s.description}`).join('\n\n')
        : transformed.preparation || '';

      const { data: saved, error: saveErr } = await supabase.from('recipes').insert({
        user_id: user.id,
        recipe_name: transformed.recipe_name,
        ingredients: (transformed.ingredients || []) as any,
        preparation,
        calories_total: transformed.calories_total || 0,
        nutrition_info: JSON.stringify({
          nutrition_info: transformed.nutrition_info || '',
          chef_tips: transformed.chef_tips || '',
          difficulty: transformed.difficulty || '',
          prep_time: transformed.prep_time || '',
          cook_time: transformed.cook_time || '',
          servings: transformed.servings || 0,
          steps: transformed.steps || [],
          dietary_tags: transformed.dietary_tags || [],
          substitutions_made: transformed.substitutions_made || '',
        }),
      }).select().single();

      if (saveErr) throw saveErr;
      hapticsSuccess();
      toast.success(t('recipe.transformed'));
      navigate(`/recipe/${saved.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('recipe.transformError');
      hapticsError();
      toast.error(message);
    } finally {
      setTransforming(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background pb-40" role="main">
        <div className="px-5 pt-14 space-y-4" role="status" aria-label={t('common.loading')}>
          <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <span className="sr-only">{t('common.loading')}</span>
        </div>
        <BottomNav />
      </main>
    );
  }

  if (!recipe) return null;

  const ingredients = safeParseJSONArray<Ingredient>(recipe.ingredients);
  const meta = safeParseJSONObject<RecipeMeta>(recipe.nutrition_info, {});
  const steps = safeParseJSONArray<Step>(meta.steps);
  const hasDetailedFormat = steps.length > 0;
  const totalCost = Object.values(ingredientCosts).reduce((sum, item) => sum + (item.calculated_cost || 0), 0);

  const handleNameSave = async (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== recipe.recipe_name) {
      await supabase.from('recipes').update({ recipe_name: trimmed }).eq('id', recipe.id);
      setRecipe(prev => prev ? { ...prev, recipe_name: trimmed } : prev);
      toast.success(t('recipe.saved'));
    }
    setEditingName(false);
  };

  return (
    <main className="min-h-screen bg-background pb-40 relative" role="main">
      {/* Background */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img src={bgUtensils} alt="" className="h-52 w-full object-cover opacity-15" />
        <div className="absolute inset-0 h-52 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 pt-14 pb-4">
          <button onClick={() => navigate('/')} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground" aria-label={t('common.cancel')}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          {editingName ? (
            <input
              autoFocus
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={() => handleNameSave(editedName)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="flex-1 text-base font-bold text-foreground bg-transparent border-b-2 border-primary outline-none py-1"
            />
          ) : (
            <h1
              className="flex-1 text-base font-bold text-foreground line-clamp-2 leading-tight cursor-pointer"
              onClick={() => { setEditedName(recipe.recipe_name); setEditingName(true); }}
              title={t('recipe.editRecipeName')}
            >
              {recipe.recipe_name}
              <Pencil className="inline ml-1.5 h-3 w-3 text-muted-foreground" />
            </h1>
          )}
          <button onClick={handleShare} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground" aria-label="Share">
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCookingModeOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all active:scale-95"
            aria-label={t('recipe.cookingMode')}
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            onClick={addToShoppingList}
            disabled={addingToCart}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-all active:scale-95 disabled:opacity-50"
            aria-label={t('recipe.addToShoppingList')}
          >
            {addingToCart ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </header>

        <div className="px-5 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap gap-2" role="list" aria-label="Recipe info">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary" role="listitem">
              <Flame className="h-4 w-4" />
              {recipe.calories_total} {t('common.kcal')}
            </motion.div>
            {meta.difficulty && (
              <div className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground" role="listitem">
                <Gauge className="h-3 w-3" /> {meta.difficulty}
              </div>
            )}
            {meta.prep_time && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground" role="listitem">
                <Clock className="h-3 w-3" /> {t('common.prep')}: {meta.prep_time}
              </div>
            )}
            {meta.cook_time && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground" role="listitem">
                <Clock className="h-3 w-3" /> {t('common.cooking')}: {meta.cook_time}
              </div>
            )}
            {meta.servings && (
              <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground" role="listitem">
                <Users className="h-3 w-3" /> {meta.servings} {t('common.portions')}
              </div>
            )}
            {Array.isArray(meta.dietary_tags) && meta.dietary_tags.length > 0 && meta.dietary_tags.map((tag, i) => (
              <div key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary" role="listitem">
                <Leaf className="h-3 w-3" /> {tag}
              </div>
            ))}
            <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground" role="listitem">
              <Check className="h-3 w-3" /> {t('common.saved')}
            </div>
          </div>

          {/* Substitutions made */}
          {meta.substitutions_made && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h2 className="mb-2 text-sm font-semibold text-primary flex items-center gap-1.5">
                <Wand2 className="h-4 w-4" /> {t('recipe.substitutionsMade')}
              </h2>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{meta.substitutions_made}</p>
            </section>
          )}

          {/* Dietary Filter Transform */}
          <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.transformRecipe')}>
            <h2 className="mb-3 text-sm font-semibold text-card-foreground flex items-center gap-1.5">
              <Wand2 className="h-4 w-4" /> {t('recipe.transformRecipe')}
            </h2>
            <p className="text-xs text-muted-foreground mb-3">{t('recipe.transformDescription')}</p>
            <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label={t('recipe.transformRecipe')}>
              <button onClick={() => toggleFilter('vegan')} aria-pressed={filters.vegan} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${filters.vegan ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <Leaf className="h-3.5 w-3.5" /> {t('recipe.vegan')}
              </button>
              <button onClick={() => toggleFilter('glutenFree')} aria-pressed={filters.glutenFree} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${filters.glutenFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <WheatOff className="h-3.5 w-3.5" /> {t('recipe.glutenFree')}
              </button>
              <button onClick={() => toggleFilter('lactoseFree')} aria-pressed={filters.lactoseFree} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${filters.lactoseFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <MilkOff className="h-3.5 w-3.5" /> {t('recipe.lactoseFree')}
              </button>
            </div>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={transformRecipe}
                disabled={transforming}
                aria-busy={transforming}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {transforming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {transforming ? t('recipe.transforming') : t('recipe.transform')}
              </motion.button>
            )}
          </section>

          {/* Ingredients */}
          <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.ingredients')}>
            <h2 className="mb-3 text-sm font-semibold text-card-foreground">{t('recipe.ingredients')}</h2>
            <div className="flex flex-col gap-3">
                {ingredients.map((ing, i) => (
                  <div key={i} className="group relative flex items-start justify-between gap-3 rounded-2xl bg-muted/30 p-4 transition-all hover:bg-muted/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary/40" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{ing.name}</p>
                        <p className="text-xs text-muted-foreground">{ing.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </section>

          {/* Step-by-step */}
          {hasDetailedFormat ? (
            <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.stepByStep')}>
              <h2 className="mb-4 text-sm font-semibold text-card-foreground">{t('recipe.stepByStep')}</h2>
              <ol className="space-y-4" role="list">
                {steps.map((step, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative pl-8">
                    <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden="true">{step.step_number}</div>
                    {i < steps.length - 1 && <div className="absolute left-[11px] top-7 h-[calc(100%)] w-0.5 bg-border" aria-hidden="true" />}
                    <div className="pb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-card-foreground">{step.title}</h3>
                        {step.duration && step.duration !== '0 minutos' && step.duration !== '0 min' && step.duration !== '0' && !step.duration.match(/^0\s*min/) && <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {step.duration}</span>}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                      {step.tip && <p className="mt-1.5 text-xs text-primary/80 italic">💡 {t('recipe.tip')}: {step.tip}</p>}
                    </div>
                  </motion.li>
                ))}
              </ol>
            </section>
          ) : (
            <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.preparation')}>
              <h2 className="mb-3 text-sm font-semibold text-card-foreground">{t('recipe.preparation')}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{recipe.preparation}</p>
            </section>
          )}

          {/* Chef Tips */}
          {meta.chef_tips && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <h2 className="mb-2 text-sm font-semibold text-primary flex items-center gap-1.5"><ChefHat className="h-4 w-4" /> {t('recipe.chefTips')}</h2>
              <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{meta.chef_tips}</p>
            </section>
          )}

          {/* Nutrition */}
          {(meta.nutrition_info || (!hasDetailedFormat && recipe.nutrition_info)) && (
            <section className="rounded-2xl border border-border bg-card p-4" aria-label={t('recipe.nutritionInfo')}>
              <h2 className="mb-3 text-sm font-semibold text-card-foreground">{t('recipe.nutritionInfo')}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{meta.nutrition_info || recipe.nutrition_info}</p>
            </section>
          )}
        </div>
      </div>

      {/* Chat FAB */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all active:scale-95 hover:shadow-xl"
        aria-label={t('recipe.askChef')}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {chatOpen && (
          <RecipeChat
            recipe={{
              name: recipe.recipe_name,
              ingredients: ingredients.map(i => `${i.name} (${i.quantity})`).join(', '),
              preparation: recipe.preparation,
              calories: recipe.calories_total,
            }}
            recipeId={recipe.id}
            rawIngredients={ingredients}
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            onRecipeUpdated={fetchRecipe}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editOpen && (
          <RecipeEditDrawer
            open={editOpen}
            onClose={() => setEditOpen(false)}
            recipeId={recipe.id}
            recipeName={recipe.recipe_name}
            ingredients={ingredients}
            preparation={recipe.preparation}
            onRecipeUpdated={fetchRecipe}
            onOpenChat={() => setChatOpen(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cookingModeOpen && (
          <CookingMode
            recipeName={recipe.recipe_name}
            ingredients={ingredients}
            steps={steps}
            onClose={() => setCookingModeOpen(false)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </main>
  );
};

export default RecipeResult;
