import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

const SubscriptionPopup = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscribed, loading: subLoading, openCheckout } = useSubscription();
  const [visible, setVisible] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!user || subLoading) return;
    if (subscribed) return;

    // Show popup only once per session
    const key = `sub_popup_shown_${user.id}`;
    if (sessionStorage.getItem(key)) return;

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(key, '1');
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, subscribed, subLoading]);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      await openCheckout();
    } catch {
      // error handled in hook
    } finally {
      setCheckoutLoading(false);
      setVisible(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setVisible(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-3xl border border-primary/30 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setVisible(false)}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Crown className="h-7 w-7 text-primary" />
              </div>
            </div>

            <h2 className="mb-1 text-center text-lg font-bold text-foreground">
              Gastronom.IA Premium
            </h2>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              {t('subscription.description')}
            </p>

            <div className="mb-4 space-y-1.5 text-sm text-muted-foreground">
              <p>✅ {t('subscription.benefit1', 'Receitas ilimitadas')}</p>
              <p>✅ {t('subscription.benefit2', 'Livro de receitas em PDF')}</p>
              <p>✅ {t('subscription.benefit3', 'Chat com chef IA (100/mês)')}</p>
            </div>

            <p className="mb-4 text-center text-2xl font-bold text-foreground">
              R$ 9,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>

            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              {t('subscription.subscribe')}
            </button>

            <button
              onClick={() => setVisible(false)}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('subscription.maybeLater', 'Talvez depois')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SubscriptionPopup;
