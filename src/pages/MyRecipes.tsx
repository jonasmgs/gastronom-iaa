import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Trash2, BookOpen, Eye, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLocalRecipes } from '@/hooks/useLocalRecipes';
import { useProfile } from '@/hooks/useProfile';
import BottomNav from '@/components/BottomNav';
import RecipeBookGenerator from '@/components/RecipeBookGenerator';
import RecipeBookViewer from '@/components/RecipeBookViewer';
import { useState } from 'react';

const MyRecipes = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t('recipes.title'));
  const { name: userName } = useProfile();
  const navigate = useNavigate();
  const { recipes, deleteRecipe } = useLocalRecipes();
  const [bookOpen, setBookOpen] = useState(false);

  const dateLocale = i18n.language?.startsWith('pt') ? 'pt-BR' : i18n.language?.startsWith('es') ? 'es-ES' : i18n.language?.startsWith('de') ? 'de-DE' : i18n.language?.startsWith('it') ? 'it-IT' : i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US';

  // Map local recipes to format expected by RecipeBookGenerator/Viewer
  const mappedRecipes = recipes.map((r) => ({
    id: r.id,
    user_id: '',
    recipe_name: r.titulo,
    ingredients: r.ingredientes as any,
    preparation: r.modo_preparo,
    calories_total: r.calorias_total,
    nutrition_info: r.nutrition_info,
    created_at: r.data_salva,
  }));

  return (
    <main className="min-h-screen bg-background pb-24" role="main">
      <header className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-foreground">{t('recipes.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('recipes.count', { count: recipes.length })}</p>
        {recipes.length >= 50 && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t('recipes.storageWarning', 'Você tem muitas receitas salvas. Considere excluir algumas para liberar espaço.')}
          </div>
        )}
        {recipes.length > 0 && (
          <div className="mt-3 space-y-2">
            <RecipeBookGenerator recipes={mappedRecipes} userName={userName || undefined} />
            <button
              onClick={() => setBookOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.98]"
            >
              <Eye className="h-4 w-4" />
              {t('book.readBook')}
            </button>
          </div>
        )}
      </header>

      <section className="px-5 space-y-3" aria-label={t('recipes.title')}>
        {recipes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
            <BookOpen className="mb-3 h-12 w-12 opacity-30" aria-hidden="true" />
            <p className="text-sm">{t('recipes.noRecipes')}</p>
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
                  <h3 className="text-sm font-semibold text-card-foreground">{recipe.titulo}</h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Flame className="h-3 w-3" />
                    {recipe.calorias_total} {t('common.kcal')}
                    <span>•</span>
                    <time dateTime={recipe.data_salva}>{new Date(recipe.data_salva).toLocaleDateString(dateLocale)}</time>
                  </div>
                </button>
                <button
                  onClick={() => deleteRecipe(recipe.id)}
                  aria-label={`${t('common.delete')} ${recipe.titulo}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <RecipeBookViewer
        recipes={mappedRecipes}
        userName={userName || undefined}
        open={bookOpen}
        onClose={() => setBookOpen(false)}
      />

      <BottomNav />
    </main>
  );
};

export default MyRecipes;
