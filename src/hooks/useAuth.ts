import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionToken: string | null;
};

type AuthListener = () => void;

const STORAGE_KEY = 'session_token';
const listeners = new Set<AuthListener>();

let authState: AuthState = {
  user: null,
  session: null,
  loading: true,
  sessionToken: getStoredSessionToken(),
};

let initialized = false;
let validationInterval: ReturnType<typeof setInterval> | null = null;
let registerSessionPromise: Promise<string | null> | null = null;
let registerSessionUserId: string | null = null;

function generateSessionToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
}

function getStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function syncValidationLoop() {
  if (validationInterval) {
    clearInterval(validationInterval);
    validationInterval = null;
  }

  if (!authState.user || !authState.sessionToken) return;

  validationInterval = setInterval(() => {
    void validateSession(authState.user!.id, authState.sessionToken);
  }, 30_000);
}

function setAuthState(next: Partial<AuthState>) {
  authState = { ...authState, ...next };
  syncValidationLoop();
  notifyListeners();
}

function setStoredSessionToken(token: string | null) {
  if (typeof window !== 'undefined') {
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  setAuthState({ sessionToken: token });
}

function subscribe(listener: AuthListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return authState;
}

async function signOutInternal(message?: string) {
  setStoredSessionToken(null);
  setAuthState({
    user: null,
    session: null,
    loading: false,
  });

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[AUTH] signOut remote call failed, cleared local state anyway:', err);
  }

  if (message) {
    toast.error(message);
  }
}

async function validateSession(userId: string, token: string | null) {
  if (!token) return;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('session_token')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('[AUTH] session validation failed:', error);
      return;
    }

    if (data?.session_token && data.session_token !== token) {
      const i18n = (await import('@/i18n')).default;
      await signOutInternal(
        i18n.t(
          'auth.sessionExpired',
          'Sua sessao foi encerrada porque voce entrou em outro dispositivo.'
        )
      );
    }
  } catch (err) {
    console.warn('[AUTH] session validation crashed:', err);
  }
}

async function waitForPendingSessionRegistration(userId: string) {
  if (!registerSessionPromise || registerSessionUserId !== userId) {
    return;
  }

  try {
    await registerSessionPromise;
  } catch (err) {
    console.warn('[AUTH] pending session registration failed:', err);
  }
}

async function registerSession(userId: string) {
  if (registerSessionPromise && registerSessionUserId === userId) {
    return registerSessionPromise;
  }

  registerSessionUserId = userId;
  setStoredSessionToken(null);
  const token = generateSessionToken();

  registerSessionPromise = (async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ session_token: token } as never)
        .eq('id', userId);

      if (error) {
        console.warn('[AUTH] failed to register session token:', error);
        return null;
      }

      setStoredSessionToken(token);
      return token;
    } finally {
      registerSessionPromise = null;
      registerSessionUserId = null;
    }
  })();

  return registerSessionPromise;
}

function handleStorageChange(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;

  setAuthState({ sessionToken: event.newValue });

  if (!event.newValue) {
    setAuthState({
      user: null,
      session: null,
      loading: false,
    });
  }
}

async function handleAuthStateChange(event: string, session: Session | null) {
  if (event === 'SIGNED_OUT') {
    setStoredSessionToken(null);
    setAuthState({
      user: null,
      session: null,
      loading: false,
    });
    return;
  }

  setAuthState({
    session,
    user: session?.user ?? null,
    loading: false,
  });

  if (event === 'SIGNED_IN' && session?.user) {
    await registerSession(session.user.id);
    return;
  }

  if (session?.user && authState.sessionToken) {
    await waitForPendingSessionRegistration(session.user.id);
    await validateSession(session.user.id, authState.sessionToken);
  }
}

async function initializeAuth() {
  if (initialized) return;
  initialized = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange);
  }

  supabase.auth.onAuthStateChange((event, session) => {
    void handleAuthStateChange(event, session);
  });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setAuthState({
      session,
      user: session?.user ?? null,
      loading: false,
      sessionToken: getStoredSessionToken(),
    });

    if (session?.user) {
      await waitForPendingSessionRegistration(session.user.id);

      const storedToken = getStoredSessionToken();
      if (storedToken) {
        await validateSession(session.user.id, storedToken);
      }
    }
  } catch (err) {
    console.error('[AUTH] failed to load initial session:', err);
    setAuthState({ loading: false });
  }
}

export function useAuth() {
  useEffect(() => {
    void initializeAuth();
  }, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    signOut: () => signOutInternal(),
  };
}
