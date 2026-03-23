import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type GooglePlayPurchaseStatus = 'purchased' | 'pending' | 'cancelled' | 'error';

export interface GooglePlayAvailabilityResult {
  available: boolean;
  ready: boolean;
}

export interface GooglePlayProductDetails {
  productId: string;
  title?: string;
  description?: string;
  formattedPrice?: string;
  priceAmountMicros?: number;
  priceCurrencyCode?: string;
  billingPeriod?: string;
  basePlanId?: string;
  offerId?: string | null;
  offerToken?: string;
}

export interface GooglePlaySubscriptionStatus {
  productId: string;
  active: boolean;
  pending: boolean;
  autoRenewing: boolean;
  acknowledged: boolean;
  orderId?: string;
  purchaseToken?: string;
  purchaseTime?: number;
  platform?: 'google-play';
}

export interface GooglePlayPurchaseResult {
  started: boolean;
  alreadyOwned?: boolean;
  productId: string;
}

export interface GooglePlayPurchaseEvent {
  status: GooglePlayPurchaseStatus;
  productId?: string;
  message?: string;
  platform: 'google-play';
}

interface GooglePlayBillingPlugin {
  isAvailable(): Promise<GooglePlayAvailabilityResult>;
  getProductDetails(options: { productId: string }): Promise<GooglePlayProductDetails>;
  getSubscriptionStatus(options: { productId: string }): Promise<GooglePlaySubscriptionStatus>;
  purchaseSubscription(options: { productId: string }): Promise<GooglePlayPurchaseResult>;
  openManageSubscriptions(options?: { productId?: string }): Promise<void>;
  addListener(
    eventName: 'purchaseUpdated',
    listenerFunc: (event: GooglePlayPurchaseEvent) => void,
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export const GooglePlayBilling = registerPlugin<GooglePlayBillingPlugin>('GooglePlayBilling');
