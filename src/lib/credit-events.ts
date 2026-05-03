export const CREDIT_REFRESH_EVENT = 'credits:refresh';

export function notifyCreditsChanged() {
  window.dispatchEvent(new Event(CREDIT_REFRESH_EVENT));
}
