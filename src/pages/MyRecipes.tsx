import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Trash2, BookOpen, Eye, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import type { Tables } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const RecipeBookGenerator = lazy(() => import('@/components/RecipeBookGenerator'));
const RecipeBookViewer = lazy(() => import('@/components/RecipeBookViewer'));

type RecipeSummary = Pick<Tables<'recipes'>, 'id' | 'recipe_name' | 'calories_total' | 'created_at'>;

const MyRecipes = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t('recipes.title'));
  const { name: userName } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [bookRecipes, setBookRecipes] = useState<Tables<'recipes'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  const dateLocale = i18n.language?.startsWith('pt')
    ? 'pt-BR'
    : i18n.language?.startsWith('es')
      ? 'es-ES'
      : i18n.language?.startsWith('de')
        ? 'de-DE'
        : i18n.language?.startsWith('it')
          ? 'it-IT'
          : i18n.language?.startsWith('fr')
            ? 'fr-FR'
            : 'en-US';

  const fetchBookRecipes = useCallback(async () => {
    if (!user) {
      setBookRecipes([]);
      return;
    }

    setBookLoading(true);

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error(t('recipes.loadError', 'Erro ao carregar receitas'));
    } else {
      setBookRecipes(data || []);
    }

    setBookLoading(false);
  }, [t, user]);

  const fetchRecipes = useCallback(async () => {
    if (!user) {
      setRecipes([]);
      setBookRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('recipes')
      .select('id, recipe_name, calories_total, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error(t('recipes.loadError', 'Erro ao carregar receitas'));
      setRecipes([]);
    } else {
      const nextRecipes = (data || []) as RecipeSummary[];
      setRecipes(nextRecipes);

      if (nextRecipes.length > 0) {
        void fetchBookRecipes();
      } else {
        setBookRecipes([]);
      }
    }

    setLoading(false);
  }, [fetchBookRecipes, t, user]);

  useEffect(() => {
    void fetchRecipes();
  }, [fetchRecipes]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      setBookRecipes((prev) => prev.filter((r) => r.id !== id));
      toast.success(t('recipes.deleted'));
    }
    setRecipeToDelete(null);
  };

  const handleOpenBook = async () => {
    if (bookRecipes.length > 0) {
      setBookOpen(true);
      return;
    }

    await fetchBookRecipes();
    setBookOpen(true);
  };

  return (
    <main className="min-h-screen bg-background pb-24" role="main">
      <header className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-foreground">{t('recipes.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('recipes.count', { count: recipes.length })}</p>
        {recipes.length > 0 && (
          <div className="mt-3 space-y-2">
            {bookLoading && bookRecipes.length === 0 ? (
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg opacity-80"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('book.generating', 'Preparando livro...')}
              </button>
            ) : (
              <Suspense
                fallback={
                  <button
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg opacity-80"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('book.generating', 'Preparando livro...')}
                  </button>
                }
              >
                {bookRecipes.length > 0 && (
                  <RecipeBookGenerator recipes={bookRecipes} userName={userName || undefined} />
                )}
              </Suspense>
            )}

            <button
              onClick={() => void handleOpenBook()}
              disabled={bookLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {bookLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {t('book.readBook')}
            </button>
          </div>
        )}
      </header>

      <section className="space-y-3 px-5" aria-label={t('recipes.title')}>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 w-full bg-muted/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center text-muted-foreground px-10">
            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 opacity-30" aria-hidden="true" />
            </div>
            <p className="text-base font-bold text-foreground mb-2">{t('recipes.noRecipes')}</p>
            <p className="text-sm text-muted-foreground mb-8">{t('recipes.noRecipesDesc', 'Você ainda não tem receitas salvas. Comece gerando uma agora!')}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {t('home.generateRecipe')}
            </button>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {recipes.map((recipe) => (
              <motion.li
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <button onClick={() => navigate(`/recipe/${recipe.id}`)} className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-card-foreground">{recipe.recipe_name}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Flame className="h-3 w-3" />
                    {recipe.calories_total} {t('common.kcal')}
                    <span>•</span>
                    <time dateTime={recipe.created_at}>{new Date(recipe.created_at).toLocaleDateString(dateLocale)}</time>
                  </div>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/recipe/${recipe.id}`); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  <AlertDialog open={recipeToDelete === recipe.id} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRecipeToDelete(recipe.id); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                      <AlertDialogHeader>
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                          <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-center">{t('common.confirm')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                          {t('recipes.confirmDelete')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 rounded-xl border-none bg-muted text-foreground hover:bg-muted/80">{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(recipe.id)}
                          className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      {bookOpen && bookRecipes.length > 0 && (
        <Suspense fallback={null}>
          <RecipeBookViewer
            recipes={bookRecipes}
            userName={userName || undefined}
            open={bookOpen}
            onClose={() => setBookOpen(false)}
          />
        </Suspense>
      )}

      <BottomNav />
    </main>
  );
};

export default MyRecipes;
