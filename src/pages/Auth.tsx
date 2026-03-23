import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Mail, Lock, User, ArrowRight, Loader2, Apple } from 'lucide-react';
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
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [currentBg, setCurrentBg] = useState(0);

  const handleSocialLogin = async (provider: 'apple' | 'google') => {
    setSocialLoading(provider);
    try {
      // Definir o redirect correto com base no ambiente
      // Para web: window.location.origin
      // Para nativo (Android/iOS): com.gastronom.ia://auth/callback
      const isNative = window.location.origin.includes('localhost') === false && 
                       (window.location.protocol === 'capacitor:' || 
                        window.location.protocol === 'http:');
      
      const redirectTo = isNative 
        ? 'com.gastronom.ia://auth/callback' 
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false, // Forçar redirecionamento no navegador/WebView
        },
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
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success(t('auth.checkEmail'));
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        toast.success(t('auth.recoveryEmail'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('auth.unexpectedError');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? t('auth.login') : mode === 'signup' ? t('auth.signup') : t('auth.forgot');

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

        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-6 shadow-lg">
          <h2 className="mb-6 text-center text-lg font-semibold text-card-foreground">{title}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Social Logins */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={loading || !!socialLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
              >
                {socialLoading === 'apple' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Apple className="h-5 w-5" />
                )}
                {t('auth.continueWithApple')}
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={loading || !!socialLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
              >
                {socialLoading === 'google' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c1.61-3.21 2.53-7.93 2.53-11.67z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {t('auth.continueWithGoogle')}
              </button>
            </div>

            <div className="relative mb-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <span className="relative bg-background px-3 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {t('auth.orContinueWithEmail')}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" placeholder={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" required />
            </div>

            {mode !== 'forgot' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" required minLength={6} />
              </div>
            )}

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {title}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center text-xs text-muted-foreground">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('forgot')} className="block w-full hover:text-foreground transition-colors">{t('auth.forgotPassword')}</button>
                <button onClick={() => setMode('signup')} className="block w-full hover:text-foreground transition-colors">{t('auth.createAccount')}</button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => setMode('login')} className="block w-full hover:text-foreground transition-colors">{t('auth.haveAccount')}</button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => setMode('login')} className="block w-full hover:text-foreground transition-colors">{t('auth.backToLogin')}</button>
            )}
            <Link to="/privacy" className="block w-full hover:text-foreground transition-colors">
              Politica de privacidade
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
