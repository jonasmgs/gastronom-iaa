-- Reduz o limite de créditos para 5 receitas
ALTER TABLE public.user_monthly_credits 
ALTER COLUMN credits_total SET DEFAULT 5;

UPDATE public.user_monthly_credits SET credits_total = 5;

-- Atualiza a função get_user_monthly_credits para usar 5 como padrão
CREATE OR REPLACE FUNCTION public.get_user_monthly_credits(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  user_id uuid,
  period_start date,
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
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;

  INSERT INTO public.user_monthly_credits AS credits (user_id, period_start, credits_total, credits_used)
  VALUES (p_user_id, current_period, 5, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET period_start = CASE
          WHEN credits.period_start < current_period THEN current_period
          ELSE credits.period_start
        END,
        credits_total = CASE
          WHEN credits.period_start < current_period THEN 5
          ELSE credits.credits_total
        END,
        credits_used = CASE
          WHEN credits.period_start < current_period THEN 0
          ELSE credits.credits_used
        END,
        updated_at = now();

  RETURN QUERY
  SELECT
    credits.user_id,
    credits.period_start,
    credits.credits_total,
    credits.credits_used,
    GREATEST(credits.credits_total - credits.credits_used, 0) AS credits_remaining
  FROM public.user_monthly_credits credits
  WHERE credits.user_id = p_user_id;
END;
$$;
