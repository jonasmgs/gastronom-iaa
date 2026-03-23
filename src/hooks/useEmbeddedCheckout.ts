import { useSyncExternalStore } from 'react';

type EmbeddedCheckoutState = {
  clientSecret: string | null;
  open: boolean;
};

type EmbeddedCheckoutListener = () => void;

const listeners = new Set<EmbeddedCheckoutListener>();

let embeddedCheckoutState: EmbeddedCheckoutState = {
  clientSecret: null,
  open: false,
};

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: EmbeddedCheckoutListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return embeddedCheckoutState;
}

export function openEmbeddedCheckout(clientSecret: string) {
  embeddedCheckoutState = {
    clientSecret,
    open: true,
  };
  notifyListeners();
}

export function closeEmbeddedCheckout() {
  embeddedCheckoutState = {
    clientSecret: null,
    open: false,
  };
  notifyListeners();
}

export function useEmbeddedCheckout() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
