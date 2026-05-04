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
    setState({
      total: 999,
      used: 0,
      remaining: 999,
      loading: false,
    });
  }, []);

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
