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
  recipeName?: string;
  checked: boolean;
  createdAt: string;
}

import { hapticsImpactLight, hapticsSuccess, hapticsImpactMedium } from '@/lib/haptics';

const ShoppingList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

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
      checked: false,
      createdAt: new Date().toISOString()
    };
    
    saveList([newItem, ...items]);
    setNewItemName('');
    setNewItemQty('');
    hapticsSuccess();
    toast.success(t('shopping.itemAdded'));
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
    
    let text = `🛒 ${t('shopping.title')}\n\n`;
    items.forEach(item => {
      text += `${item.checked ? '✅' : '⬜'} ${item.name} (${item.quantity})\n`;
    });
    text += `\nFeito com Gastronom.IA`;

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
              className="w-24 bg-muted/50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all">
            <Plus className="h-4 w-4" />
            {t('shopping.addItem')}
          </button>
        </form>

        {/* List Actions */}
        {items.some(item => item.checked) && (
          <button onClick={clearChecked} className="flex items-center gap-2 text-xs font-bold text-destructive uppercase tracking-wider mx-auto bg-destructive/10 px-4 py-2 rounded-full">
            <Trash2 className="h-3.5 w-3.5" />
            {t('shopping.clearChecked')}
          </button>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                <ShoppingCart className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">{t('shopping.empty')}</p>
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

                  <button onClick={() => deleteItem(item.id)} className="h-8 w-8 flex items-center justify-center text-muted-foreground/50 hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
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
