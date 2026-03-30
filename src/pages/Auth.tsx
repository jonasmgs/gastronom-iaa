import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Mail, Lock, User, ArrowRight, Loader2, Chrome, Apple } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LanguageSelector from '@/components/LanguageSelector';
import bgIngredients from '@/assets/bg-ingredients.jpg';
import bgIngredients2 from '@/assets/bg-ingredients-2.jpg';
import bgIngredients3 from '@/assets/bg-ingredients-3.jpg';
import bgIngredients4 from '@/assets/bg-ingredients-4.jpg';
import bgUtensils from '@/assets/bg-utensils.jpg';

const bgImages = [bgIngredients, bgIngredients2, bgIngredients3, bgIngredients4, bgUtensils];

type Mode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.unexpectedError');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* Language selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Rotating Background */}
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
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <ChefHat className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('auth.appName')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('auth.appSlogan')}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-8 shadow-xl">
          <h2 className="mb-8 text-center text-xl font-bold text-card-foreground">
            {t('auth.login')}
          </h2>

          <div className="space-y-4">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-4 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:border-primary/50 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />}
              <span>{t('auth.signInWithGoogle')}</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-primary bg-primary px-4 py-4 text-sm font-semibold text-primary-foreground transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              <Apple className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>{t('auth.signInWithApple')}</span>
            </button>
          </div>

          <p className="mt-6 text-center text-[10px] text-muted-foreground/60 leading-relaxed px-4">
            {t('auth.oauthNotice', 'Ao entrar com Google ou Apple, sua conta no GastronomIA será criada ou acessada automaticamente.')}
          </p>

          <div className="mt-8 text-center">
            <Link to="/privacy" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors">
              Politica de privacidade e Termos
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
