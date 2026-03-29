import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Loader2, Apple } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';
import bgIngredients from '@/assets/bg-ingredients.jpg';
import bgIngredients2 from '@/assets/bg-ingredients-2.jpg';
import bgIngredients3 from '@/assets/bg-ingredients-3.jpg';
import bgIngredients4 from '@/assets/bg-ingredients-4.jpg';
import bgUtensils from '@/assets/bg-utensils.jpg';

const bgImages = [bgIngredients, bgIngredients2, bgIngredients3, bgIngredients4, bgUtensils];

const Auth = () => {
  const { t } = useTranslation();
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [currentBg, setCurrentBg] = useState(0);

  const handleSocialLogin = async (provider: 'apple' | 'google') => {
    setSocialLoading(provider);
    try {
      const isNative = window.location.protocol === 'capacitor:' || (window.location.protocol === 'http:' && window.location.port === '');
      const redirectTo = isNative ? 'com.gastronom.ia://auth/callback' : `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: false },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.unexpectedError');
      toast.error(message);
    } finally {
      setSocialLoading(null);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentBg((prev) => (prev + 1) % bgImages.length), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-6 overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentBg}
            src={bgImages[currentBg]}
            alt=""
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 0.55, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/70" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <ChefHat className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t('auth.appName')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('auth.appSlogan')}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-5 sm:p-6 shadow-lg">
          <h2 className="mb-4 sm:mb-6 text-center text-base sm:text-lg font-semibold text-card-foreground">
            {t('auth.login')}
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('apple')}
              disabled={!!socialLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
            >
              {socialLoading === 'apple' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Apple className="h-5 w-5" />}
              {t('auth.continueWithApple')}
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={!!socialLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c1.61-3.21 2.53-7.93 2.53-11.67z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {t('auth.continueWithGoogle')}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t('auth.orContinueWithEmail', 'Acesso somente via Apple ou Google.')}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
