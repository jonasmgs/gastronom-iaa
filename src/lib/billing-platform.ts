import { Capacitor } from '@capacitor/core';

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function getAndroidBillingUnavailableMessage() {
  return 'Assinaturas no Android ainda nao estao disponiveis nesta versao. O suporte ao Google Play Billing sera adicionado antes da publicacao.';
}
