import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, Sun, Moon, Monitor, Type, ALargeSmall, Crown, Loader2, CreditCard, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supportedLanguages } from '@/i18n';
import { getTheme, setTheme, getFontSize, setFontSize, getFontFamily, setFontFamily, type ThemeMode, type FontSize, type FontFamily } from '@/lib/theme';
import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { invokeEdgeFunction } from '@/lib/edge-functions';
import {
  getAndroidBillingUnavailableMessage,
  isGooglePlayBillingConfigured,
  isNativeAndroid,
} from '@/lib/billing-platform';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Settings = () => {
  const { t, i18n } = useTranslation();
  usePageTitle(t('settings.title'));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, signOut } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(getTheme());
  const [currentSize, setCurrentSize] = useState<FontSize>(getFontSize());
  const [currentFont, setCurrentFont] = useState<FontFamily>(getFontFamily());
  const { subscribed, subscriptionEnd, loading: subLoading, openCheckout, openPortal, checkSubscription } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const androidNative = isNativeAndroid();
  const androidBillingConfigured = isGooglePlayBillingConfigured();

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success(t('subscription.success') || 'Assinatura ativada com sucesso!');
      void checkSubscription();
    } else if (checkout === 'cancel') {
      toast.info(t('subscription.cancelled') || 'Assinatura cancelada.');
    }
  }, [searchParams, checkSubscription, t]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      await openCheckout();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error') || 'Erro ao iniciar pagamento');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    try {
      await openPortal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error') || 'Erro ao abrir portal');
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.access_token) {
      toast.error('Sessao nao encontrada. Entre novamente para continuar.');
      return;
    }

    setDeleteLoading(true);

    try {
      const { error } = await invokeEdgeFunction('delete-account', {
        token: session.access_token,
      });

      if (error) throw error;

      await signOut();
      navigate('/auth', { replace: true });
      toast.success('Conta excluida com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir conta');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTheme = (mode: ThemeMode) => {
    setTheme(mode);
    setCurrentTheme(mode);
  };

  const handleSize = (size: FontSize) => {
    setFontSize(size);
    setCurrentSize(size);
  };

  const handleFont = (font: FontFamily) => {
    setFontFamily(font);
    setCurrentFont(font);
  };

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('settings.light'), icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: t('settings.dark'), icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: t('settings.system'), icon: <Monitor className="h-4 w-4" /> },
  ];

  const sizeOptions: { value: FontSize; label: string }[] = [
    { value: 'small', label: t('settings.small') },
    { value: 'medium', label: t('settings.mediumSize') },
    { value: 'large', label: t('settings.largeSize') },
  ];

  const fontOptions: { value: FontFamily; label: string; sample: string }[] = [
    { value: 'inter', label: 'Inter', sample: 'Aa' },
    { value: 'serif', label: 'Serif', sample: 'Aa' },
    { value: 'mono', label: 'Mono', sample: 'Aa' },
    { value: 'rounded', label: 'Rounded', sample: 'Aa' },
  ];

  const fontFamilyStyle = (font: FontFamily) => {
    const map: Record<FontFamily, string> = {
      inter: 'Inter, sans-serif',
      serif: 'Georgia, serif',
      mono: 'SF Mono, monospace',
      rounded: 'Nunito, sans-serif',
    };
    return map[font];
  };

  return (
    <main className="min-h-screen bg-background pb-24" role="main">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 ios-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-muted-foreground hover:bg-accent" aria-label={t('common.cancel')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('settings.title')}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-6 px-4 py-6">
        <section aria-label="Premium">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Crown className="h-4 w-4" />
            Premium
          </div>
          <div className={`rounded-2xl border p-4 ${subscribed ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
            {subLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : subscribed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Gastronom.IA Premium</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('subscription.activeUntil') || 'Ativo ate'}{' '}
                  {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : '-'}
                </p>
                {androidNative && !androidBillingConfigured ? (
                  <p className="text-xs text-muted-foreground">
                    {getAndroidBillingUnavailableMessage()}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handlePortal}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-all active:scale-[0.97]"
                    >
                      <CreditCard className="h-4 w-4" />
                      {androidNative ? 'Gerenciar no Google Play' : t('subscription.manage') || 'Gerenciar'}
                    </button>
                    <button
                      onClick={() => void checkSubscription()}
                      className="flex items-center justify-center rounded-xl border border-border px-3 py-2.5 text-muted-foreground transition-all active:scale-[0.97]"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">Gastronom.IA Premium</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('subscription.description') || 'Receitas ilimitadas, livro PDF, chat com chef IA'}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  R$ 9,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li>Receitas ilimitadas</li>
                  <li>Livro de receitas em PDF</li>
                  <li>Chat com chef IA (100/mês)</li>
                </ul>
                {androidNative && !androidBillingConfigured ? (
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    {getAndroidBillingUnavailableMessage()}
                  </div>
                ) : (
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.97] disabled:opacity-50"
                  >
                    {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                    {androidNative ? 'Assinar no Google Play' : t('subscription.subscribe') || 'Assinar agora'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section aria-label="Privacidade e conta">
          <div className="mb-3 text-sm font-medium text-muted-foreground">
            Privacidade e conta
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <button
              onClick={() => navigate('/privacy')}
              className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent"
            >
              <span>Politica de privacidade</span>
              <span className="text-muted-foreground">Abrir</span>
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/10">
                  <span>Excluir conta</span>
                  <span>Permanentemente</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acao remove sua conta, receitas e perfil nutricional do app. Registros de pagamento podem ser mantidos pelo provedor de pagamento quando exigido por lei.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDeleteAccount();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Excluindo...' : 'Excluir conta'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        <section aria-label={t('settings.language')}>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Globe className="h-4 w-4" />
            {t('settings.language')}
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('settings.language')}>
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                role="radio"
                aria-checked={i18n.language?.startsWith(lang.code)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  i18n.language?.startsWith(lang.code)
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label={t('settings.theme')}>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sun className="h-4 w-4" />
            {t('settings.theme')}
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label={t('settings.theme')}>
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleTheme(opt.value)}
                role="radio"
                aria-checked={currentTheme === opt.value}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs transition-colors ${
                  currentTheme === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section aria-label={t('settings.fontSize')}>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ALargeSmall className="h-4 w-4" />
            {t('settings.fontSize')}
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label={t('settings.fontSize')}>
            {sizeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSize(opt.value)}
                role="radio"
                aria-checked={currentSize === opt.value}
                className={`flex flex-1 items-center justify-center rounded-xl border px-3 py-3 transition-colors ${
                  currentSize === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
                style={{ fontSize: opt.value === 'small' ? '12px' : opt.value === 'large' ? '16px' : '14px' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section aria-label={t('settings.fontFamily')}>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Type className="h-4 w-4" />
            {t('settings.fontFamily')}
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('settings.fontFamily')}>
            {fontOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFont(opt.value)}
                role="radio"
                aria-checked={currentFont === opt.value}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors ${
                  currentFont === opt.value
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-card-foreground hover:bg-accent'
                }`}
              >
                <span className="text-lg" style={{ fontFamily: fontFamilyStyle(opt.value) }}>{opt.sample}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
};

export default Settings;
