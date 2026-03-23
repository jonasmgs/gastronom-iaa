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

type UnitCategory = 'weight' | 'volume' | 'unit';

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
  
  // Tenta inferir a categoria inicial
  const getInitialCategory = (): UnitCategory => {
    if (!initialData) {
      const rQty = parseQuantity(recipeQuantityStr);
      const base = convertToSmallestUnit(rQty.val, rQty.unit).base;
      if (base === 'g') return 'weight';
      if (base === 'ml') return 'volume';
      return 'unit';
    }
    const base = convertToSmallestUnit(initialData.purchase_quantity, initialData.purchase_unit).base;
    if (base === 'g') return 'weight';
    if (base === 'ml') return 'volume';
    return 'unit';
  };

  const [unitCategory, setUnitCategory] = useState<UnitCategory>(getInitialCategory());
  const [purchaseQtyValue, setPurchaseQtyValue] = useState(initialData ? initialData.purchase_quantity.toString() : '');
  const [purchaseUnit, setPurchaseUnit] = useState(initialData ? initialData.purchase_unit : '');
  const [purchasePriceStr, setPurchasePriceStr] = useState(initialData ? initialData.purchase_price.toFixed(2).replace('.', ',') : '');
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  useEffect(() => {
    const pVal = parseFloat(purchaseQtyValue.replace(',', '.'));
    const pPrice = parseFloat(purchasePriceStr.replace(',', '.'));
    const rQty = parseQuantity(recipeQuantityStr);

    if (pVal > 0 && pPrice > 0 && rQty.val > 0 && purchaseUnit) {
      const pBase = convertToSmallestUnit(pVal, purchaseUnit);
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
  }, [purchaseQtyValue, purchaseUnit, purchasePriceStr, recipeQuantityStr]);

  const handleSave = async () => {
    if (!user) return;
    const pVal = parseFloat(purchaseQtyValue.replace(',', '.'));
    const pPrice = parseFloat(purchasePriceStr.replace(',', '.'));

    if (pVal <= 0 || isNaN(pPrice) || !purchaseUnit) {
      toast.error(t('recipe.costCalculator.invalidQuantity'));
      return;
    }

    const cost = calculatedCost || 0;

    const { error } = await supabase.from('ingredient_costs').upsert({
      user_id: user.id,
      recipe_id: recipeId,
      ingredient_name: ingredientName,
      purchase_quantity: pVal,
      purchase_unit: purchaseUnit,
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

  const unitsByCategory = {
    weight: ['g', 'kg'],
    volume: ['ml', 'l'],
    unit: ['un', 'dúzia']
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full p-6 bg-card border-t border-border rounded-t-[32px] shadow-2xl safe-area-bottom"
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

      <div className="space-y-6">
        {/* Seletor de Categoria de Unidade */}
        <div className="flex p-1 bg-muted rounded-xl">
          {(['weight', 'volume', 'unit'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setUnitCategory(cat);
                setPurchaseUnit(unitsByCategory[cat][0]);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                unitCategory === cat 
                  ? 'bg-card text-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat === 'weight' ? 'Peso' : cat === 'volume' ? 'Volume' : 'Unidade'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
              {t('recipe.costCalculator.purchaseQuantity')}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={purchaseQtyValue}
              onChange={(e) => setPurchaseQtyValue(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="0,00"
              className="w-full bg-muted/50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
              Unidade
            </label>
            <div className="flex gap-2 h-[44px]">
              {unitsByCategory[unitCategory].map((u) => (
                <button
                  key={u}
                  onClick={() => setPurchaseUnit(u)}
                  className={`flex-1 rounded-xl text-sm font-bold transition-all border-2 ${
                    purchaseUnit === u 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
            {t('recipe.costCalculator.purchasePrice')}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
            <input
              type="text"
              inputMode="decimal"
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
          {calculatedCost === null && purchaseQtyValue && purchaseUnit && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-600 font-medium">
              <AlertCircle className="h-3 w-3" />
              <span>Unidades incompatíveis com a receita ({parseQuantity(recipeQuantityStr).unit})</span>
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
  </div>
);
};

export default IngredientCostCalculator;
