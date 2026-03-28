import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { DietaryFilters } from '@/utils/recipeSearch';

const defaultFilters: DietaryFilters = {
  vegan: false,
  glutenFree: false,
  lactoseFree: false,
  vegetarian: false,
};

function toArray(filters: DietaryFilters) {
  const list: string[] = [];
  if (filters.vegan) list.push('vegan');
  if (filters.vegetarian) list.push('vegetarian');
  if (filters.glutenFree) list.push('glutenFree');
  if (filters.lactoseFree) list.push('lactoseFree');
  return list;
}

function fromArray(values: string[] | null | undefined): DietaryFilters {
  return {
    vegan: values?.includes('vegan') ?? false,
    vegetarian: values?.includes('vegetarian') ?? false,
    glutenFree: values?.includes('glutenFree') ?? false,
    lactoseFree: values?.includes('lactoseFree') ?? false,
  };
}

export function useDietaryRestrictions() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DietaryFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        if (active) {
          setFilters(defaultFilters);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('dietary_restrictions')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setFilters(defaultFilters);
      } else {
        setFilters(fromArray(data?.dietary_restrictions as string[] | null));
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [user]);

  const saveFilters = useCallback(async (next: DietaryFilters) => {
    setFilters(next);
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ dietary_restrictions: toArray(next) })
      .eq('id', user.id);
  }, [user]);

  const toggle = useCallback((key: keyof DietaryFilters) => {
    saveFilters({
      ...filters,
      [key]: !filters[key],
    });
  }, [filters, saveFilters]);

  return { filters, loading, saveFilters, toggle };
}
