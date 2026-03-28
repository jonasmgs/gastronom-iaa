import { invokeEdgeFunction } from '@/lib/edge-functions';
import { supabase } from '@/integrations/supabase/client';

const PRODUCT_ID = 'premium_mensal';
const PACKAGE_NAME = import.meta.env.VITE_GOOGLE_PLAY_PACKAGE_NAME ?? 'app.vercel.gastronom_iaa.twa';

declare global {
  interface Window {
    getDigitalGoodsService?: (backend: string) => Promise<{
      getDetails: (ids: string[]) => Promise<Array<{
        price: { value: string; currency: string };
        title?: string;
        description?: string;
      }>>;
    }>;
  }
}

export async function isPlayBillingAvailable() {
  return typeof window !== 'undefined' && 'getDigitalGoodsService' in window && typeof PaymentRequest !== 'undefined';
}

export async function fetchPlayProductDetails() {
  if (!(await isPlayBillingAvailable())) throw new Error('Digital Goods API indisponível neste dispositivo.');
  const service = await window.getDigitalGoodsService('https://play.google.com/billing');
  const [details] = await service.getDetails([PRODUCT_ID]);
  return details;
}

export async function purchasePlaySubscription() {
  if (!(await isPlayBillingAvailable())) throw new Error('Abra o app instalado pela Google Play para comprar.');

  // Verifica sessão atual para repassar token ao edge function
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Sessão não encontrada. Entre novamente.');

  const service = await window.getDigitalGoodsService('https://play.google.com/billing');
  await fetchPlayProductDetails(); // opcional para exibir preço/título

  const pr = new PaymentRequest(
    [{ supportedMethods: 'https://play.google.com/billing', data: { sku: PRODUCT_ID, type: 'subs' } }],
    { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } },
  );

  const response = await pr.show();
  const { purchaseToken } = response.details || {};
  if (!purchaseToken) {
    await response.complete('fail');
    throw new Error('Token de compra não retornado pelo Google Play.');
  }

  const { data, error } = await invokeEdgeFunction<{
    active: boolean;
    expiryTime: number | null;
    autoRenewing: boolean;
    cancelReason: number | null;
  }>('validate-subscription', {
    token: session.access_token,
    body: {
      purchaseToken,
      subscriptionId: PRODUCT_ID,
      packageName: PACKAGE_NAME,
    },
  });

  if (error) {
    await response.complete('fail');
    throw error;
  }

  await response.complete(data?.active ? 'success' : 'fail');
  if (!data?.active) throw new Error('Assinatura não está ativa.');

  return data;
}
