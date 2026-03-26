import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/edge-functions';
import { openEmbeddedCheckout } from '@/hooks/useEmbeddedCheckout';
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
import { shouldUseEmbeddedCheckoutBrowser } from '@/lib/checkout';
import { hasStripePublishableKey } from '@/lib/stripe';
import { useAuth } from './useAuth';

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

function createTimeoutError(message: string) {
  return new Error(message);
}

async function invokeWithTimeout<T>(
  fn: () => Promise<{ data: T | null; error: Error | null }>,
  timeoutMessage: string,
) {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(createTimeoutError(timeoutMessage)), 20_000);
    }),
  ]);
}

async function getFunctionErrorMessage(error: unknown, fallback: string) {
  let message = fallback;

  try {
    const body = await (error as { context?: { json?: () => Promise<{ error?: string }> } })?.context?.json?.();
    if (body?.error) {
      message = body.error;
    }
  } catch {
    // Ignore body parsing failures and fall back to the error message below.
  }

  const fallbackMessage = (error as { message?: string })?.message;
  if (fallbackMessage) {
    message = fallbackMessage;
  }

  return message;
}

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
        setState({
          subscribed: true,
          productId: 'test-access',
          subscriptionEnd: null,
          loading: false,
        });
        return;
      }

      if (Capacitor.isNativePlatform()) {
        // Política: Stripe só no web. Em nativo não habilitar assinatura.
        setState({
          subscribed: false,
          productId: null,
          subscriptionEnd: null,
          loading: false,
        });
        return;
      }

      const { data, error } = await invokeEdgeFunction<{
        product_id?: string | null;
        subscribed?: boolean;
        subscription_end?: string | null;
      }>('check-subscription', { token: activeSession.access_token });

      if (error) {
        console.warn('Erro ao verificar assinatura:', error.message);
      }

      setState({
        subscribed: data?.subscribed ?? false,
        productId: data?.product_id ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        loading: false,
      });
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
    if (Capacitor.isNativePlatform()) {
      throw new Error('Assinaturas via Stripe estão disponíveis apenas na versão web.');
    }

    const activeSession = await getActiveSession();
    if (!activeSession) {
      throw new Error('Sessao nao encontrada. Entre novamente para continuar.');
    }

    let shouldUseEmbedded = !Capacitor.isNativePlatform() && hasStripePublishableKey() && shouldUseEmbeddedCheckoutBrowser();

    const invokeCheckout = (useEmbedded: boolean) =>
      invokeWithTimeout<{
        clientSecret?: string;
        error?: string;
        url?: string;
      }>(
        () =>
          invokeEdgeFunction('create-checkout', {
            body: { embedded: useEmbedded },
            token: activeSession.access_token,
          }),
        'O servidor demorou muito para responder. Tente novamente.',
      );

    let { data, error } = await invokeCheckout(shouldUseEmbedded);

    if (shouldUseEmbedded && error) {
      console.warn('[CHECKOUT] Embedded checkout failed, falling back to hosted checkout', error);
      shouldUseEmbedded = false;
      ({ data, error } = await invokeCheckout(false));
    }

    if (error) {
      throw new Error(await getFunctionErrorMessage(error, 'Erro ao criar checkout'));
    }

    if (data?.error) throw new Error(data.error);

    if (shouldUseEmbedded) {
      if (!data?.clientSecret) throw new Error('Nenhum client secret de checkout retornado');
      openEmbeddedCheckout(data.clientSecret);
      return;
    }

    if (!data?.url) throw new Error('Nenhuma URL de checkout retornada');

    await openBillingUrl(data.url);
  };

  const openPortal = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        throw new Error('Portal de assinatura disponível apenas na versão web.');
      }

      const activeSession = await getActiveSession();
      if (!activeSession) {
        throw new Error('Sessao nao encontrada. Entre novamente para continuar.');
      }

      const { data, error } = await invokeWithTimeout<{ error?: string; url?: string }>(
        () =>
          invokeEdgeFunction('customer-portal', {
            token: activeSession.access_token,
          }),
        'O servidor demorou muito para responder. Tente novamente.',
      );

      if (error) {
        throw new Error(await getFunctionErrorMessage(error, 'Erro ao abrir portal'));
      }

      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('Nenhuma URL do portal retornada');

      await openBillingUrl(data.url);
    } catch (err) {
      console.error('Error opening portal:', err);
      throw err;
    }
  };

  return { ...state, checkSubscription, openCheckout, openPortal };
}
