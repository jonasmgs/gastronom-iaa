import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Tables } from '@/integrations/supabase/types';

interface Ingredient {
  name: string;
  quantity: string;
  calories: number;
  tip?: string;
}

interface Step {
  step_number: number;
  title: string;
  description: string;
  duration?: string;
  tip?: string;
}

interface RecipeMeta {
  nutrition_info?: string;
  chef_tips?: string;
  difficulty?: string;
  prep_time?: string;
  cook_time?: string;
  servings?: number;
  steps?: Step[];
}

const CATEGORIES = [
  { key: 'salads', emoji: '🥗' },
  { key: 'meats', emoji: '🥩' },
  { key: 'fish', emoji: '🐟' },
  { key: 'vegetarian', emoji: '🌱' },
  { key: 'pasta', emoji: '🍝' },
  { key: 'soups', emoji: '🍲' },
  { key: 'sides', emoji: '🥦' },
  { key: 'sweets', emoji: '🍰' },
  { key: 'drinks', emoji: '🥤' },
  { key: 'breakfast', emoji: '🍳' },
];

const CAT_KEYWORDS: Record<string, string[]> = {
  salads: ['salad', 'salada', 'ensalada'],
  meats: ['carne', 'meat', 'frango', 'chicken', 'beef', 'pork', 'porco'],
  fish: ['peixe', 'fish', 'salmão', 'salmon', 'camarão', 'shrimp', 'seafood'],
  vegetarian: ['vegano', 'vegan', 'vegetarian', 'vegetariano', 'tofu'],
  pasta: ['massa', 'pasta', 'macarrão', 'arroz', 'rice'],
  soups: ['sopa', 'soup', 'caldo', 'broth'],
  sides: ['acompanhamento', 'side', 'purê'],
  sweets: ['doce', 'sweet', 'bolo', 'cake', 'torta', 'mousse', 'pudim', 'cookie'],
  drinks: ['bebida', 'drink', 'smoothie', 'suco', 'juice'],
  breakfast: ['café da manhã', 'breakfast', 'panqueca', 'omelete'],
};

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return key;
  }
  return 'other';
}

interface BookPage {
  type: 'cover' | 'index' | 'recipe';
  recipe?: Tables<'recipes'>;
  catKey?: string;
}

interface Props {
  recipes: Tables<'recipes'>[];
  userName?: string;
  open: boolean;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

const RecipeBookViewer = ({ recipes, userName, open, onClose }: Props) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const buildPages = useCallback((): BookPage[] => {
    const pages: BookPage[] = [{ type: 'cover' }, { type: 'index' }];
    const grouped: Record<string, Tables<'recipes'>[]> = {};
    for (const r of recipes) {
      const cat = categorize(r.recipe_name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    }
    for (const [catKey, catRecipes] of Object.entries(grouped)) {
      for (const recipe of catRecipes) {
        pages.push({ type: 'recipe', recipe, catKey });
      }
    }
    return pages;
  }, [recipes]);

  const pages = buildPages();

  const goTo = useCallback((delta: number) => {
    setCurrentPage(prev => {
      const next = prev + delta;
      if (next < 0 || next >= pages.length) return prev;
      setDirection(delta);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50);
      return next;
    });
  }, [pages.length]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && info.velocity.x < -100) {
      goTo(1);
    } else if (info.offset.x > SWIPE_THRESHOLD && info.velocity.x > 100) {
      goTo(-1);
    }
  }, [goTo]);

  const getCatLabel = (key: string) => {
    const cat = CATEGORIES.find(c => c.key === key);
    if (cat) return `${cat.emoji} ${t(`book.cat_${cat.key}`)}`;
    return `📋 ${t('book.cat_other')}`;
  };

  // Page flip animation — 3D rotation around Y axis
  const pageFlipVariants = {
    enter: (d: number) => ({
      rotateY: d > 0 ? 90 : -90,
      opacity: 0,
      transformOrigin: d > 0 ? 'left center' : 'right center',
      scale: 0.95,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      transformOrigin: 'center center',
      scale: 1,
    },
    exit: (d: number) => ({
      rotateY: d > 0 ? -90 : 90,
      opacity: 0,
      transformOrigin: d > 0 ? 'right center' : 'left center',
      scale: 0.95,
    }),
  };

  const renderCover = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-8 py-12">
      <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8">
        <BookOpen className="h-12 w-12 text-primary" />
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-3 font-serif">{t('book.title')}</h2>
      <p className="text-xl text-muted-foreground mb-2">{userName || t('home.chef')}</p>
      <p className="text-base text-muted-foreground">{new Date().toLocaleDateString()}</p>
      <p className="text-sm text-muted-foreground mt-12 italic">Gastronom.IA</p>
      <p className="text-xs text-muted-foreground/50 mt-6">← {t('book.swipeHint')} →</p>
    </div>
  );

  const renderIndex = () => {
    const grouped: Record<string, Tables<'recipes'>[]> = {};
    for (const r of recipes) {
      const cat = categorize(r.recipe_name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    }
    return (
      <div className="px-6 py-8">
        <h3 className="text-2xl font-bold text-foreground mb-6 font-serif border-b border-border pb-3">{t('book.index')}</h3>
        <div className="space-y-5">
          {Object.entries(grouped).map(([catKey, catRecipes]) => (
            <div key={catKey}>
              <p className="text-base font-bold text-primary mb-2">{getCatLabel(catKey)}</p>
              {catRecipes.map((r, i) => (
                <p key={i} className="text-sm text-muted-foreground ml-4 py-1">• {r.recipe_name}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRecipe = (page: BookPage) => {
    const recipe = page.recipe!;
    let meta: RecipeMeta = {};
    try { meta = JSON.parse(recipe.nutrition_info || '{}'); } catch { /* */ }
    let ingredients: Ingredient[] = [];
    try {
      ingredients = typeof recipe.ingredients === 'string' 
        ? JSON.parse(recipe.ingredients) 
        : (recipe.ingredients as unknown as Ingredient[]) || [];
    } catch { ingredients = []; }
    const steps = meta.steps || [];

    return (
      <div className="px-6 py-6">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          {getCatLabel(page.catKey || 'other')}
        </span>
        <h3 className="text-2xl font-bold text-foreground mt-2 mb-3 font-serif leading-tight">
          {recipe.recipe_name}
        </h3>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-5 pb-4 border-b border-border">
          {recipe.calories_total > 0 && <span>🔥 {recipe.calories_total} kcal</span>}
          {meta.difficulty && <span>📊 {meta.difficulty}</span>}
          {meta.prep_time && <span>⏱️ {meta.prep_time}</span>}
          {meta.cook_time && <span>🕐 {meta.cook_time}</span>}
          {meta.servings && <span>👥 {meta.servings} porções</span>}
        </div>

        <div className="mb-6">
          <p className="text-base font-bold text-foreground mb-3">{t('recipe.ingredients')}</p>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{ing.name}</span>
                    <span className="text-muted-foreground"> — {ing.quantity}</span>
                    <span className="text-primary/70 text-xs ml-1">({ing.calories} kcal)</span>
                  </p>
                  {ing.tip && <p className="text-xs text-muted-foreground/70 italic mt-0.5">{ing.tip}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {steps.length > 0 && (
          <div className="mb-6">
            <p className="text-base font-bold text-foreground mb-3">{t('recipe.stepByStep')}</p>
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.step_number} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{step.step_number}</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    {step.duration && <p className="text-xs text-muted-foreground/60 mt-1">⏱️ {step.duration}</p>}
                    {step.tip && <p className="text-xs text-primary/70 mt-1 italic">💡 {step.tip}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {steps.length === 0 && recipe.preparation && (
          <div className="mb-6">
            <p className="text-base font-bold text-foreground mb-3">{t('recipe.preparation')}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{recipe.preparation}</p>
          </div>
        )}

        {meta.nutrition_info && (
          <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm font-bold text-foreground mb-2">📊 {t('recipe.nutritionInfo')}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{meta.nutrition_info}</p>
          </div>
        )}

        {meta.chef_tips && (
          <div className="mb-6 p-4 rounded-xl bg-accent/50 border border-border">
            <p className="text-sm font-bold text-foreground mb-2">👨‍🍳 {t('recipe.chefTips') || 'Dicas do Chef'}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{meta.chef_tips}</p>
          </div>
        )}
      </div>
    );
  };

  if (!open) return null;

  const page = pages[currentPage];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <span className="text-sm font-medium text-muted-foreground">
          {currentPage + 1} / {pages.length}
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Swipeable content with page flip effect */}
      <div className="flex-1 overflow-hidden relative" style={{ perspective: '1200px' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            ref={scrollRef}
            custom={direction}
            variants={pageFlipVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 overflow-y-auto overscroll-y-contain bg-card"
            style={{ touchAction: 'pan-y', backfaceVisibility: 'hidden' }}
          >
            {/* Paper texture overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.02] z-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
            {/* Spine shadow */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/10 to-transparent z-10" />

            <div className="relative z-0">
              {page.type === 'cover' && renderCover()}
              {page.type === 'index' && renderIndex()}
              {page.type === 'recipe' && renderRecipe(page)}
            </div>

            {/* Bottom padding so content doesn't hide behind nav */}
            <div className="h-24" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation — above everything with safe area padding */}
      <div className="shrink-0 flex gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border bg-background">
        <button
          onClick={() => goTo(-1)}
          disabled={currentPage === 0}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-all disabled:opacity-30 active:scale-[0.97]"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('book.prevPage')}
        </button>
        <button
          onClick={() => goTo(1)}
          disabled={currentPage >= pages.length - 1}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all disabled:opacity-30 active:scale-[0.97]"
        >
          {t('book.nextPage')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default RecipeBookViewer;
