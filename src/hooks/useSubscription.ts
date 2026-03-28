import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getAndroidBillingUnavailableMessage,
  getGooglePlaySubscriptionProductId,
  isGooglePlayBillingConfigured,
  isNativeAndroid,
} from '@/lib/billing-platform';
import {
  GooglePlayBilling,
  type GooglePlayPurchaseEvent,
  type GooglePlaySubscriptionStatus,
} from '@/lib/google-play-billing';
import { SUBSCRIPTION_REFRESH_EVENT } from '@/lib/subscription-events';
import { isPlayBillingAvailable, purchasePlaySubscription } from '@/lib/digital-goods';
import { useAuth } from './useAuth';

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

const playPackageName = import.meta.env.VITE_GOOGLE_PLAY_PACKAGE_NAME?.trim() || 'app.vercel.gastronom_iaa.twa';

function buildGooglePlayState(data: GooglePlaySubscriptionStatus): SubscriptionState {
  return {
    subscribed: data.active,
    productId: data.active ? data.productId : null,
    subscriptionEnd: null,
    loading: false,
  };
}

async function openBillingUrl(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }

  window.location.assign(url);
}

async function waitForGooglePlayPurchase(productId: string) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let listenerHandlePromise:
      | ReturnType<typeof GooglePlayBilling.addListener>
      | null = null;

    const cleanup = async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (listenerHandlePromise) {
        try {
          const listenerHandle = await listenerHandlePromise;
          await listenerHandle.remove();
        } catch {
          // Ignore cleanup failures.
        }
      }
    };

    const settle = async (handler: () => void) => {
      if (settled) return;
      settled = true;
      await cleanup();
      handler();
    };

    const handleEvent = (event: GooglePlayPurchaseEvent) => {
      if (event.productId && event.productId !== productId) {
        return;
      }

      if (event.status === 'purchased') {
        void settle(resolve);
        return;
      }

      if (event.status === 'pending') {
        void settle(() => reject(new Error(event.message ?? 'O pagamento ficou pendente no Google Play.')));
        return;
      }

      if (event.status === 'cancelled') {
        void settle(() => reject(new Error(event.message ?? 'Compra cancelada.')));
        return;
      }

      void settle(() => reject(new Error(event.message ?? 'O Google Play nao conseguiu concluir a compra.')));
    };

    (async () => {
      try {
        listenerHandlePromise = GooglePlayBilling.addListener('purchaseUpdated', handleEvent);
        await listenerHandlePromise;
      } catch (error) {
        await settle(() => reject(error instanceof Error ? error : new Error('Nao foi possivel ouvir atualizacoes do Google Play.')));
        return;
      }

      timeoutId = setTimeout(() => {
        void settle(() => reject(new Error('O Google Play demorou muito para confirmar a compra. Tente novamente.')));
      }, 90_000);
    })();
  });
}

export function useSubscription() {
  const { session, user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    loading: true,
  });

  const getActiveSession = useCallback(async () => {
    if (session) return session;

    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return currentSession;
  }, [session]);

    const checkSubscription = useCallback(async () => {
    try {
      const activeSession = await getActiveSession();

      if (!activeSession || !user) {
        setState({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('test_access')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.warn('Erro ao buscar perfil, continuando...', profileError.message);
      }

      if (profile?.test_access) {
        setState({ subscribed: true, productId: 'test-access', subscriptionEnd: null, loading: false });
        return;
      }

      // Android nativo: consultar estado no Google Play
      if (isNativeAndroid() && isGooglePlayBillingConfigured()) {
        const productId = getGooglePlaySubscriptionProductId();
        if (productId) {
          try {
            const status = await GooglePlayBilling.getSubscriptionStatus({ productId });
            setState(buildGooglePlayState(status));
            return;
          } catch (err) {
            console.warn('Erro ao consultar assinatura no Google Play:', err);
          }
        }
      }

      // Fora do app Play, tratamos como não assinado
      setState({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
    } catch (err) {
      console.error('Error checking subscription:', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [getActiveSession, user]);

  useEffect(() => {
    void checkSubscription();

    const interval = setInterval(() => {
      void checkSubscription();
    }, 60_000);

    return () => clearInterval(interval);
  }, [checkSubscription]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRefresh = () => {
      void checkSubscription();
    };

    window.addEventListener(SUBSCRIPTION_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(SUBSCRIPTION_REFRESH_EVENT, handleRefresh);
  }, [checkSubscription]);

  const openCheckout = async () => {
    if (!Capacitor.isNativePlatform() && (await isPlayBillingAvailable())) {
      const result = await purchasePlaySubscription();
      window.dispatchEvent(new Event(SUBSCRIPTION_REFRESH_EVENT));
      return result;
    }

    if (Capacitor.isNativePlatform()) {
      throw new Error('Assinatura disponível apenas pelo Google Play neste dispositivo.');
    }

    throw new Error('Assinatura disponível somente no app instalado via Google Play.');
  };

  const openPortal = async () => {
    const productId = getGooglePlaySubscriptionProductId();

    // Native Android via plugin
    if (Capacitor.isNativePlatform()) {
      try {
        await GooglePlayBilling.openManageSubscriptions(productId ? { productId } : undefined);
        return;
      } catch (error) {
        console.warn('[PORTAL] Falha no plugin, tentando URL', error);
      }
    }

    // Web/TWA fallback: abre URL da Play Store
    const url = new URL('https://play.google.com/store/account/subscriptions');
    url.searchParams.set('package', playPackageName);
    if (productId) url.searchParams.set('sku', productId);
    await openBillingUrl(url.toString());
  };

  return { ...state, checkSubscription, openCheckout, openPortal };
}




