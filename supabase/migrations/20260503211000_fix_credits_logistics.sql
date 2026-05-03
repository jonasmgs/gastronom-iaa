-- Simplifica a logística de créditos para evitar erros de data
CREATE OR REPLACE FUNCTION public.consume_user_credit(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  credits_total integer,
  credits_used integer,
  credits_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_period date := date_trunc('month', now())::date;
  updated_row public.user_monthly_credits%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;

  -- Garante que o usuário tem um registro para o período atual
  PERFORM 1 FROM public.get_user_monthly_credits(p_user_id);

  -- Atualiza ignorando o period_start rígido no WHERE, 
  -- pois o get_user_monthly_credits já garantiu a sincronização acima
  UPDATE public.user_monthly_credits credits
  SET credits_used = credits.credits_used + 1,
      updated_at = now()
  WHERE credits.user_id = p_user_id
    AND credits.credits_used < credits.credits_total
  RETURNING credits.* INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Limite de teste atingido (10 receitas). Entre em contato para mais acesso.';
  END IF;

  RETURN QUERY
  SELECT
    updated_row.credits_total,
    updated_row.credits_used,
    GREATEST(updated_row.credits_total - updated_row.credits_used, 0) AS credits_remaining;
END;
$$;
