import { Capacitor } from '@capacitor/core';

const googlePlaySubscriptionId = import.meta.env.VITE_GOOGLE_PLAY_SUBSCRIPTION_ID?.trim() ?? '';

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function getGooglePlaySubscriptionProductId() {
  return googlePlaySubscriptionId || null;
}

export function isGooglePlayBillingConfigured() {
  return Boolean(getGooglePlaySubscriptionProductId());
}

export function getAndroidBillingUnavailableMessage() {
  if (!isGooglePlayBillingConfigured()) {
    return 'A assinatura do Google Play ainda nao foi configurada para esta versao do app.';
  }

  return 'O Google Play Billing nao esta disponivel agora. Tente novamente em alguns instantes.';
}
