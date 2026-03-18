import { loadStripe, type Stripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';

let stripePromise: Promise<Stripe | null> | null = null;

export function hasStripePublishableKey() {
  return Boolean(stripePublishableKey);
}

export async function getStripe() {
  if (!hasStripePublishableKey()) {
    throw new Error('VITE_STRIPE_PUBLISHABLE_KEY nao esta configurada');
  }

  stripePromise ??= loadStripe(stripePublishableKey);
  return stripePromise;
}
