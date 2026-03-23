import { useEffect, useMemo, useRef, useState } from 'react';
import type { StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { closeEmbeddedCheckout, useEmbeddedCheckout } from '@/hooks/useEmbeddedCheckout';
import { SUBSCRIPTION_REFRESH_EVENT } from '@/lib/subscription-events';
import { getStripe } from '@/lib/stripe';

const EmbeddedCheckoutModal = () => {
  const { t } = useTranslation();
  const checkoutContainerRef = useRef<HTMLDivElement | null>(null);
  const embeddedCheckoutRef = useRef<StripeEmbeddedCheckout | null>(null);
  const { clientSecret, open } = useEmbeddedCheckout();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => t('subscription.subscribe', 'Assinar agora'),
    [t],
  );

  useEffect(() => {
    if (!open || !clientSecret || !checkoutContainerRef.current) return;

    let cancelled = false;

    const mountEmbeddedCheckout = async () => {
      setError(null);
      setLoading(true);

      try {
        const stripe = await getStripe();
        if (!stripe) throw new Error('Nao foi possivel inicializar o Stripe');

        const embeddedCheckout = await stripe.initEmbeddedCheckout({
          clientSecret,
          onComplete: () => {
            window.dispatchEvent(new Event(SUBSCRIPTION_REFRESH_EVENT));
            closeEmbeddedCheckout();
            toast.success(t('subscription.success', 'Assinatura ativada com sucesso!'));
          },
        });

        if (cancelled) {
          embeddedCheckout.destroy();
          return;
        }

        embeddedCheckoutRef.current = embeddedCheckout;
        embeddedCheckout.mount(checkoutContainerRef.current!);
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : t('paywall.checkoutError', 'Erro ao processar pagamento, tente novamente.');

        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void mountEmbeddedCheckout();

    return () => {
      cancelled = true;
      setLoading(false);
      embeddedCheckoutRef.current?.destroy();
      embeddedCheckoutRef.current = null;
    };
  }, [clientSecret, open, t]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeEmbeddedCheckout()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden border-border bg-card p-0 sm:rounded-3xl">
        <div className="border-b border-border px-6 py-4">
          <DialogTitle className="text-left text-lg text-foreground">{title}</DialogTitle>
          <DialogDescription className="mt-1 text-left">
            {t('paywall.description', 'Assine o Gastronom.IA Premium e tenha acesso a todas as funcionalidades.')}
          </DialogDescription>
        </div>

        <div className="relative min-h-[560px] bg-background">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {error ? (
            <div className="flex min-h-[560px] items-center justify-center px-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div ref={checkoutContainerRef} className="min-h-[560px]" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmbeddedCheckoutModal;
