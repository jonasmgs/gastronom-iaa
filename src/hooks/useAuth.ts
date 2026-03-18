import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

function generateSessionToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(
    () => localStorage.getItem('session_token')
  );

  const signOut = useCallback(async (message?: string) => {
    localStorage.removeItem('session_token');
    setSessionToken(null);
    await supabase.auth.signOut();
    if (message) {
      toast.error(message);
    }
  }, []);

  const validateSession = useCallback(async (userId: string, token: string | null) => {
    if (!token) return;
    const { data } = await supabase
      .from('profiles')
      .select('session_token')
      .eq('id', userId)
      .single();

    if (data && data.session_token && data.session_token !== token) {
      // Dynamic import to avoid circular dependency
      const i18n = (await import('@/i18n')).default;
      await signOut(
        i18n.t('auth.sessionExpired', 'Sua sessão foi encerrada porque você entrou em outro dispositivo.')
      );
    }
  }, [signOut]);

  const registerSession = useCallback(async (userId: string) => {
    const token = generateSessionToken();
    localStorage.setItem('session_token', token);
    setSessionToken(token);
    await supabase
      .from('profiles')
      .update({ session_token: token } as any)
      .eq('id', userId);
    return token;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' && session?.user) {
        await registerSession(session.user.id);
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('session_token');
        setSessionToken(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user && sessionToken) {
        validateSession(session.user.id, sessionToken);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic session validation every 30s
  useEffect(() => {
    if (!user || !sessionToken) return;
    const interval = setInterval(() => {
      validateSession(user.id, sessionToken);
    }, 30000);
    return () => clearInterval(interval);
  }, [user, sessionToken, validateSession]);

  return { user, session, loading, signOut: () => signOut() };
}
