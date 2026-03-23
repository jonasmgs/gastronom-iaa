import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, Save, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface IngredientCostCalculatorProps {
  ingredientName: string;
  recipeQuantityStr: string;
  recipeId: string;
  onSave: () => void;
  onClose: () => void;
  initialData?: {
    purchase_quantity: number;
    purchase_unit: string;
    purchase_price: number;
  };
}

const parseQuantity = (str: string) => {
  const match = str.match(/^([\d.,]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ]+.*)$/);
  if (!match) return { val: parseFloat(str.replace(',', '.')) || 0, unit: '' };
  return {
    val: parseFloat(match[1].replace(',', '.')) || 0,
    unit: match[2].toLowerCase().trim()
  };
};

const convertToSmallestUnit = (val: number, unit: string) => {
  const u = unit.toLowerCase().trim();
  // Peso
  if (u.includes('kg') || u.includes('quilo') || u.includes('quilograma')) return { val: val * 1000, base: 'g' };
  if (u.startsWith('g') || u.includes('grama')) return { val, base: 'g' };
  
  // Volume
  if (u === 'l' || u.startsWith('litro')) return { val: val * 1000, base: 'ml' };
  if (u.includes('ml') || u.includes('mililitro')) return { val, base: 'ml' };
  
  // Unidade
  if (u.includes('dúzia') || u.includes('duzia')) return { val: val * 12, base: 'un' };
  if (u.includes('unidade') || u.includes('un') || u === 'un') return { val, base: 'un' };
  
  return { val, base: 'un' };
};

const IngredientCostCalculator = ({
  ingredientName,
  recipeQuantityStr,
  recipeId,
  onSave,
  onClose,
  initialData
}: IngredientCostCalculatorProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [purchaseQtyStr, setPurchaseQtyStr] = useState(initialData ? `${initialData.purchase_quantity}${initialData.purchase_unit}` : '');
  const [purchasePriceStr, setPurchasePriceStr] = useState(initialData ? initialData.purchase_price.toFixed(2).replace('.', ',') : '');
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  useEffect(() => {
    const pQty = parseQuantity(purchaseQtyStr);
    const pPrice = parseFloat(purchasePriceStr.replace(',', '.'));
    const rQty = parseQuantity(recipeQuantityStr);

    if (pQty.val > 0 && pPrice > 0 && rQty.val > 0) {
      const pBase = convertToSmallestUnit(pQty.val, pQty.unit);
      const rBase = convertToSmallestUnit(rQty.val, rQty.unit);

      // Só calcula se as unidades forem compatíveis (peso com peso, vol com vol, un com un)
      if (pBase.base === rBase.base) {
        const cost = (pPrice / pBase.val) * rBase.val;
        setCalculatedCost(cost);
      } else {
        setCalculatedCost(null);
      }
    } else {
      setCalculatedCost(null);
    }
  }, [purchaseQtyStr, purchasePriceStr, recipeQuantityStr]);

  const handleSave = async () => {
    if (!user) return;
    const pQty = parseQuantity(purchaseQtyStr);
    const pPrice = parseFloat(purchasePriceStr.replace(',', '.'));

    if (pQty.val <= 0 || isNaN(pPrice)) {
      toast.error(t('recipe.costCalculator.invalidQuantity'));
      return;
    }

    const cost = calculatedCost || 0;

    const { error } = await supabase.from('ingredient_costs').upsert({
      user_id: user.id,
      recipe_id: recipeId,
      ingredient_name: ingredientName,
      purchase_quantity: pQty.val,
      purchase_unit: pQty.unit,
      purchase_price: pPrice,
      calculated_cost: cost
    }, { onConflict: 'user_id,recipe_id,ingredient_name' } as any);

    if (error) {
      console.error('Error saving cost:', error);
      toast.error(t('common.error'));
    } else {
      toast.success(t('common.saved'));
      onSave();
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-x-0 bottom-0 z-50 p-6 bg-card border-t border-border rounded-t-[32px] shadow-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{t('recipe.costCalculator.title')}</h3>
            <p className="text-xs text-muted-foreground">{ingredientName}</p>
          </div>
        </div>
        <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
            {t('recipe.costCalculator.purchaseQuantity')}
          </label>
          <input
            type="text"
            value={purchaseQtyStr}
            onChange={(e) => setPurchaseQtyStr(e.target.value)}
            placeholder={t('recipe.costCalculator.unitPlaceholder')}
            className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
            {t('recipe.costCalculator.purchasePrice')}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
            <input
              type="text"
              value={purchasePriceStr}
              onChange={(e) => setPurchasePriceStr(e.target.value.replace(/[^\d,]/g, ''))}
              placeholder="0,00"
              className="w-full bg-muted/50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-muted-foreground">{t('recipe.costCalculator.recipeQuantity')}</span>
            <span className="text-sm font-bold text-foreground">{recipeQuantityStr}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">{t('recipe.costCalculator.calculatedCost')}</span>
            <span className="text-lg font-black text-primary">
              {calculatedCost !== null 
                ? `R$ ${calculatedCost.toFixed(2).replace('.', ',')}`
                : '--'}
            </span>
          </div>
          {calculatedCost === null && purchaseQtyStr && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-600 font-medium">
              <AlertCircle className="h-3 w-3" />
              <span>Unidades incompatíveis ou formato inválido</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          <Save className="h-5 w-5" />
          {t('recipe.costCalculator.save')}
        </button>
      </div>
    </motion.div>
  );
};

export default IngredientCostCalculator;
