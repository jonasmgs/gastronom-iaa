import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, Check, X, Share2, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  recipeName?: string;
  checked: boolean;
  createdAt: string;
}

import { hapticsImpactLight, hapticsSuccess, hapticsImpactMedium } from '@/lib/haptics';

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
import { AlertCircle } from 'lucide-react';

const ShoppingList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const list = localStorage.getItem('shopping_list');
    if (list) {
      setItems(JSON.parse(list));
    }
    setLoading(false);
  }, []);

  const saveList = (newList: ShoppingItem[]) => {
    setItems(newList);
    localStorage.setItem('shopping_list', JSON.stringify(newList));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    hapticsImpactMedium();
    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      quantity: newItemQty.trim() || '1',
      price: parseFloat(newItemPrice) || 0,
      checked: false,
      createdAt: new Date().toISOString()
    };
    
    saveList([newItem, ...items]);
    setNewItemName('');
    setNewItemQty('');
    setNewItemPrice('');
    hapticsSuccess();
    toast.success(t('shopping.itemAdded'));
  };

  const updateItemPrice = (id: string, price: number) => {
    const newList = items.map(item => 
      item.id === id ? { ...item, price } : item
    );
    saveList(newList);
  };

  const toggleItem = (id: string) => {
    hapticsImpactLight();
    const newList = items.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    saveList(newList);
  };

  const deleteItem = (id: string) => {
    hapticsImpactMedium();
    const newList = items.filter(item => item.id !== id);
    saveList(newList);
  };

  const clearChecked = () => {
    hapticsImpactMedium();
    const newList = items.filter(item => !item.checked);
    saveList(newList);
    hapticsSuccess();
    toast.success(t('shopping.clearedChecked'));
  };

  const handleShare = async () => {
    if (items.length === 0) return;
    hapticsImpactLight();
    
    const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
    let text = `🛒 ${t('shopping.title')}\n\n`;
    items.forEach(item => {
      const priceText = item.price ? ` - R$ ${item.price.toFixed(2).replace('.', ',')}` : '';
      text += `${item.checked ? '✅' : '⬜'} ${item.name} (${item.quantity})${priceText}\n`;
    });
    text += `\n━━━━━━━━━━━━━━━━━━━━━━`;
    text += `\n${t('shopping.total')}: R$ ${total.toFixed(2).replace('.', ',')}`;
    text += `\n\nFeito com Gastronom.IA`;

    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success(t('common.copied'));
    }
  };

  return (
    <main className="min-h-screen bg-background pb-32">
      <header className="px-6 pt-14 pb-6 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="h-9 w-9 flex items-center justify-center rounded-full bg-muted text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-black text-foreground">{t('shopping.title')}</h1>
          </div>
          <button onClick={handleShare} className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        {/* Add Item Form */}
        <form onSubmit={addItem} className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={t('shopping.itemNamePlaceholder')}
              className="flex-1 bg-muted/50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <input
              type="text"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              placeholder={t('shopping.itemQtyPlaceholder')}
              className="w-20 bg-muted/50 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <input
              type="number"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              placeholder={t('shopping.itemPricePlaceholder')}
              className="w-24 bg-muted/50 border-none rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all">
            <Plus className="h-4 w-4" />
            {t('shopping.addItem')}
          </button>
        </form>

        {/* Total */}
        {items.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">{t('shopping.total')}</p>
              <p className="text-2xl font-bold text-primary">{items.reduce((sum, item) => sum + (item.price || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{items.length} {t('shopping.items')}</p>
              <p className="text-xs text-muted-foreground">{items.filter(i => i.checked).length} {t('shopping.checked')}</p>
            </div>
          </div>
        )}

        {/* List Actions */}
        {items.some(item => item.checked) && (
          <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-2 text-xs font-bold text-destructive uppercase tracking-wider mx-auto bg-destructive/10 px-4 py-2 rounded-full active:scale-95 transition-all">
                <Trash2 className="h-3.5 w-3.5" />
                {t('shopping.clearChecked')}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
              <AlertDialogHeader>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <AlertDialogTitle className="text-center">{t('common.confirm')}</AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  {t('shopping.confirmClear')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2 mt-4">
                <AlertDialogCancel className="flex-1 rounded-xl border-none bg-muted text-foreground hover:bg-muted/80">{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearChecked}
                  className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 w-full bg-muted/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 space-y-4 px-10">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-30" />
              </div>
              <p className="text-base font-bold text-foreground mb-2">{t('shopping.empty')}</p>
              <p className="text-sm text-muted-foreground mb-8">{t('shopping.emptyDesc', 'Sua lista está vazia. Adicione itens manualmente ou a partir de uma receita!')}</p>
              <button
                onClick={() => navigate('/recipes')}
                className="w-full border-2 border-primary text-primary py-4 rounded-2xl font-bold active:scale-[0.98] transition-all"
              >
                {t('nav.recipes')}
              </button>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    item.checked ? 'bg-muted/30 border-transparent' : 'bg-card border-border shadow-sm'
                  }`}
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      item.checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    }`}
                  >
                    {item.checked && <Check className="h-4 w-4 text-primary-foreground" />}
                  </button>
                  
                  <div className="flex-1" onClick={() => toggleItem(item.id)}>
                    <p className={`font-bold text-sm ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{item.quantity}</span>
                      {item.recipeName && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium line-clamp-1">
                          {item.recipeName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0,00"
                        className="w-20 bg-muted/50 border-none rounded-lg px-6 py-1.5 text-sm text-right focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <button onClick={() => deleteItem(item.id)} className="h-8 w-8 flex items-center justify-center text-muted-foreground/50 hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      <BottomNav />
    </main>
  );
};

export default ShoppingList;
