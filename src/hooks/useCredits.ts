import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { CREDIT_REFRESH_EVENT } from '@/lib/credit-events';

export interface CreditState {
  total: number;
  used: number;
  remaining: number;
  loading: boolean;
}

type CreditRow = {
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
};

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: CreditRow[] | null; error: Error | null }>;
};

const DEFAULT_CREDITS = 5;

export function useCredits() {
  const { user } = useAuth();
  const [state, setState] = useState<CreditState>({
    total: DEFAULT_CREDITS,
    used: 0,
    remaining: DEFAULT_CREDITS,
    loading: true,
  });

  const refreshCredits = useCallback(async () => {
    if (!user) {
      setState({ total: DEFAULT_CREDITS, used: 0, remaining: DEFAULT_CREDITS, loading: false });
      return;
    }

    setState((current) => ({ ...current, loading: true }));
    const { data, error } = await (supabase as unknown as RpcClient).rpc('get_user_monthly_credits', {
      p_user_id: user.id,
    });

    if (error || !data?.[0]) {
      console.warn('[Credits] failed to load credits:', error);
      setState((current) => ({ ...current, loading: false }));
      return;
    }

    const row = data[0];
    setState({
      total: row.credits_total,
      used: row.credits_used,
      remaining: row.credits_remaining,
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  useEffect(() => {
    window.addEventListener(CREDIT_REFRESH_EVENT, refreshCredits);
    window.addEventListener('focus', refreshCredits);

    return () => {
      window.removeEventListener(CREDIT_REFRESH_EVENT, refreshCredits);
      window.removeEventListener('focus', refreshCredits);
    };
  }, [refreshCredits]);

  return { ...state, refreshCredits };
}
