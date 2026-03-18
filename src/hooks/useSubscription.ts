import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { openEmbeddedCheckout } from '@/hooks/useEmbeddedCheckout';
import { SUBSCRIPTION_REFRESH_EVENT } from '@/lib/subscription-events';
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
  fn: string,
  timeoutMessage: string,
  body?: Record<string, unknown>
) {
  return Promise.race([
    supabase.functions.invoke<T>(fn, body ? { body } : undefined),
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
    const fallbackMessage = (error as { message?: string })?.message;
    if (fallbackMessage) {
      message = fallbackMessage;
    }
  }

  return message;
}

async function openBillingUrl(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }

  window.location.assign(url);
}

export function useSubscription() {
  const { session, user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!session || !user) {
      setState({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('test_access')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.test_access) {
        setState({
          subscribed: true,
          productId: 'test-access',
          subscriptionEnd: null,
          loading: false,
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke<{
        product_id?: string | null;
        subscribed?: boolean;
        subscription_end?: string | null;
      }>('check-subscription');

      if (error) throw error;

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
  }, [session, user]);

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
    const embedded = !Capacitor.isNativePlatform() && hasStripePublishableKey();

    console.log('[CHECKOUT] Invoking create-checkout...');

    const { data, error } = await invokeWithTimeout<{
      clientSecret?: string;
      error?: string;
      url?: string;
    }>(
      'create-checkout',
      'O servidor demorou muito para responder. Tente novamente.',
      { embedded }
    );

    console.log('[CHECKOUT] Response:', { data, error });

    if (error) {
      throw new Error(await getFunctionErrorMessage(error, 'Erro ao criar checkout'));
    }

    if (data?.error) throw new Error(data.error);

    if (embedded) {
      if (!data?.clientSecret) throw new Error('Nenhum client secret de checkout retornado');
      openEmbeddedCheckout(data.clientSecret);
      return;
    }

    if (!data?.url) throw new Error('Nenhuma URL de checkout retornada');

    await openBillingUrl(data.url);
  };

  const openPortal = async () => {
    try {
      const { data, error } = await invokeWithTimeout<{ error?: string; url?: string }>(
        'customer-portal',
        'O servidor demorou muito para responder. Tente novamente.'
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
