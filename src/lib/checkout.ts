const embeddedHosts = (import.meta.env.VITE_STRIPE_EMBEDDED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

const forceHostedCheckout = (import.meta.env.VITE_STRIPE_FORCE_HOSTED_CHECKOUT ?? '').trim() === 'true';

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

export function shouldUseEmbeddedCheckoutBrowser() {
  if (typeof window === 'undefined') return false;
  if (forceHostedCheckout) return false;

  const { hostname, protocol } = window.location;
  const normalizedHostname = hostname.toLowerCase();

  if (isLocalHostname(normalizedHostname)) return false;
  if (protocol !== 'https:') return false;

  if (embeddedHosts.length === 0) {
    return true;
  }

  return embeddedHosts.includes(normalizedHostname);
}

export function getEmbeddedCheckoutHosts() {
  return embeddedHosts;
}
