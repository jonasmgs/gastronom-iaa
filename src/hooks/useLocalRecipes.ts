import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const STORAGE_KEY = 'gastronomia_receitas';
const MAX_WARN = 50;

export interface LocalRecipe {
  id: string;
  titulo: string;
  ingredientes: any[];
  modo_preparo: string;
  calorias_total: number;
  nutrition_info: string | null;
  data_salva: string;
}

function readRecipes(): LocalRecipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRecipes(recipes: LocalRecipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function useLocalRecipes() {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<LocalRecipe[]>(() => readRecipes());

  const refresh = useCallback(() => {
    setRecipes(readRecipes());
  }, []);

  const addRecipe = useCallback((recipe: Omit<LocalRecipe, 'id' | 'data_salva'>) => {
    const current = readRecipes();
    if (current.length >= MAX_WARN) {
      toast.warning(
        t('recipes.storageWarning', `Você tem ${current.length} receitas salvas. Considere excluir algumas para liberar espaço.`)
      );
    }
    const newRecipe: LocalRecipe = {
      ...recipe,
      id: crypto.randomUUID(),
      data_salva: new Date().toISOString(),
    };
    const updated = [newRecipe, ...current];
    writeRecipes(updated);
    setRecipes(updated);
    return newRecipe;
  }, [t]);

  const deleteRecipe = useCallback((id: string) => {
    const updated = readRecipes().filter((r) => r.id !== id);
    writeRecipes(updated);
    setRecipes(updated);
    toast.success(t('recipes.deleted'));
  }, [t]);

  const getRecipe = useCallback((id: string): LocalRecipe | undefined => {
    return readRecipes().find((r) => r.id === id);
  }, []);

  const updateRecipe = useCallback((id: string, data: Partial<LocalRecipe>) => {
    const current = readRecipes();
    const updated = current.map((r) => (r.id === id ? { ...r, ...data } : r));
    writeRecipes(updated);
    setRecipes(updated);
  }, []);

  return { recipes, addRecipe, deleteRecipe, getRecipe, updateRecipe, refresh };
}
