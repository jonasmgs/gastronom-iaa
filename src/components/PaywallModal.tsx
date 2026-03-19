import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, X, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { getAndroidBillingUnavailableMessage, isNativeAndroid } from '@/lib/billing-platform';
import { useSubscription } from '@/hooks/useSubscription';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
}

const PaywallModal = ({ open, onClose }: PaywallModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openCheckout } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const androidNative = isNativeAndroid();

  const handleSubscribe = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);

    try {
      await openCheckout();
      onClose();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : t('paywall.checkoutError', 'Erro ao processar pagamento, tente novamente.');

      setCheckoutError(message);
      toast.error(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleDismiss = () => {
    setCheckoutError(null);
    onClose();
    navigate('/', { replace: true });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleDismiss}
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
              onClick={handleDismiss}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-accent transition-colors"
              aria-label={t('common.close', 'Fechar')}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
            </div>

            <h2 className="mb-1 text-center text-lg font-bold text-foreground">
              {t('paywall.title', 'Desbloqueie receitas ilimitadas!')}
            </h2>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              {t('paywall.description', 'Assine o Gastronom.IA Premium e tenha acesso a todas as funcionalidades.')}
            </p>

            <div className="mb-4 space-y-2 text-sm text-muted-foreground">
              <p>✅ {t('subscription.benefit1', 'Receitas ilimitadas')}</p>
              <p>✅ {t('subscription.benefit2', 'Livro de receitas em PDF')}</p>
              <p>✅ {t('subscription.benefit3', 'Chat com chef IA (100/mês)')}</p>
            </div>

            <p className="mb-5 text-center text-2xl font-bold text-foreground">
              R$ 9,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>

            {androidNative ? (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {getAndroidBillingUnavailableMessage()}
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                {t('paywall.subscribe', 'Assinar agora')}
              </button>
            )}

            {checkoutError && (
              <div
                className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                aria-live="polite"
              >
                {checkoutError}
              </div>
            )}

            <button
              onClick={handleDismiss}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {t('paywall.maybeLater', 'Talvez depois')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallModal;
