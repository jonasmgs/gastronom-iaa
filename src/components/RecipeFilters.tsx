import { useState } from 'react';
import { Plus, X, Salad, Cake, Beef, Sandwich, Soup, Droplets, Zap, ChefHat, Crown, Leaf, WheatOff, MilkOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface RecipeFiltersProps {
  category: string | null;
  onCategoryChange: (val: string | null) => void;
  complexity: string | null;
  onComplexityChange: (val: string | null) => void;
  ingredients: string[];
  onIngredientsChange: (val: string[]) => void;
  description?: string;
  onDescriptionChange?: (val: string) => void;
  showDescription?: boolean;
  dietaryFilters?: {
    vegan?: boolean;
    glutenFree?: boolean;
    lactoseFree?: boolean;
    vegetarian?: boolean;
  };
  onDietaryChange?: (filters: NonNullable<RecipeFiltersProps['dietaryFilters']>) => void;
}

const RecipeFilters = ({
  category, onCategoryChange,
  complexity, onComplexityChange,
  ingredients, onIngredientsChange,
  description = '', onDescriptionChange,
  showDescription = false,
  dietaryFilters,
  onDietaryChange,
}: RecipeFiltersProps) => {
  const { t } = useTranslation();
  const [ingredientInput, setIngredientInput] = useState('');

  const categories = [
    { id: 'salada', label: t('home.salad'), icon: Salad },
    { id: 'sobremesa', label: t('home.dessert'), icon: Cake },
    { id: 'salgado', label: t('home.savory'), icon: Beef },
    { id: 'lanche', label: t('home.snack'), icon: Sandwich },
    { id: 'sopa', label: t('home.soup'), icon: Soup },
    { id: 'molho', label: t('home.sauce'), icon: Droplets },
  ];

  const complexities = [
    { id: 'simples', label: t('home.simple'), icon: Zap },
    { id: 'media', label: t('home.medium'), icon: ChefHat },
    { id: 'elaborada', label: t('home.elaborate'), icon: Crown },
  ];

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (!trimmed) return;
    const exists = ingredients.some(i => i.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.error(t('home.alreadyAdded'));
      return;
    }
    onIngredientsChange([...ingredients, trimmed]);
    setIngredientInput('');
  };

  return (
    <div className="space-y-4">
      {/* Description */}
      {showDescription && onDescriptionChange && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('home.descriptionLabel')}</label>
          <input
            type="text"
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder={t('home.descriptionPlaceholder')}
            spellCheck
            autoCorrect="on"
            className="w-full rounded-xl border border-input bg-card/90 backdrop-blur-sm px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Dish type */}
      <section aria-label={t('home.dishType')}>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t('home.dishType')}</p>
        <div className="flex flex-wrap gap-2" role="group">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(category === cat.id ? null : cat.id)}
              aria-pressed={category === cat.id}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                category === cat.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card/80 backdrop-blur-sm border border-input text-muted-foreground'
              }`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Complexity */}
      <section aria-label={t('home.complexity')}>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t('home.complexity')}</p>
        <div className="flex flex-wrap gap-2" role="group">
          {complexities.map(opt => (
            <button
              key={opt.id}
              onClick={() => onComplexityChange(complexity === opt.id ? null : opt.id)}
              aria-pressed={complexity === opt.id}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                complexity === opt.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card/80 backdrop-blur-sm border border-input text-muted-foreground'
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dietary filters (persist profile) */}
      {dietaryFilters && onDietaryChange && (
        <section aria-label={t('edit.dietaryFilters')}>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('edit.dietaryFilters')}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('edit.dietaryFilters')}>
            <button
              onClick={() => onDietaryChange({ ...dietaryFilters, vegan: !dietaryFilters.vegan, vegetarian: !dietaryFilters.vegan ? true : dietaryFilters.vegetarian })}
              aria-pressed={dietaryFilters.vegan}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${
                dietaryFilters.vegan ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Leaf className="h-3.5 w-3.5" /> {t('recipe.vegan')}
            </button>
            <button
              onClick={() => onDietaryChange({ ...dietaryFilters, vegetarian: !dietaryFilters.vegetarian })}
              aria-pressed={dietaryFilters.vegetarian}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${
                dietaryFilters.vegetarian ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Leaf className="h-3.5 w-3.5" /> {t('recipe.vegan', 'Vegana').replace('Vegana', 'Vegetariana')}
            </button>
            <button
              onClick={() => onDietaryChange({ ...dietaryFilters, glutenFree: !dietaryFilters.glutenFree })}
              aria-pressed={dietaryFilters.glutenFree}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${
                dietaryFilters.glutenFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
              }`}
            >
              <WheatOff className="h-3.5 w-3.5" /> {t('recipe.glutenFree')}
            </button>
            <button
              onClick={() => onDietaryChange({ ...dietaryFilters, lactoseFree: !dietaryFilters.lactoseFree })}
              aria-pressed={dietaryFilters.lactoseFree}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${
                dietaryFilters.lactoseFree ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
              }`}
            >
              <MilkOff className="h-3.5 w-3.5" /> {t('recipe.lactoseFree')}
            </button>
          </div>
        </section>
      )}

      {/* Ingredients */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('home.ingredientsLabel')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ingredientInput}
            onChange={e => setIngredientInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
            placeholder={t('home.ingredientPlaceholder')}
            spellCheck
            autoCorrect="on"
            className="flex-1 rounded-xl border border-input bg-card/90 backdrop-blur-sm py-3 px-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addIngredient}
            aria-label={t('home.ingredientPlaceholder')}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <AnimatePresence>
          {ingredients.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-1.5 mt-2">
              {ingredients.map(ing => (
                <span key={ing} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {ing}
                  <button onClick={() => onIngredientsChange(ingredients.filter(i => i !== ing))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecipeFilters;
