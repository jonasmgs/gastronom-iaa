CREATE TABLE IF NOT EXISTS public.user_monthly_credits (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  credits_total integer NOT NULL DEFAULT 300 CHECK (credits_total >= 0),
  credits_used integer NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_monthly_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly credits"
  ON public.user_monthly_credits FOR SELECT
  USING (auth.uid() = user_id);

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
  VALUES (p_user_id, current_period, 300, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET period_start = CASE
          WHEN credits.period_start < current_period THEN current_period
          ELSE credits.period_start
        END,
        credits_total = CASE
          WHEN credits.period_start < current_period THEN 300
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

  PERFORM 1 FROM public.get_user_monthly_credits(p_user_id);

  UPDATE public.user_monthly_credits credits
  SET credits_used = credits.credits_used + 1,
      updated_at = now()
  WHERE credits.user_id = p_user_id
    AND credits.period_start = current_period
    AND credits.credits_used < credits.credits_total
  RETURNING credits.* INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Limite mensal de 300 creditos atingido';
  END IF;

  RETURN QUERY
  SELECT
    updated_row.credits_total,
    updated_row.credits_used,
    GREATEST(updated_row.credits_total - updated_row.credits_used, 0) AS credits_remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_user_credit(p_user_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;

  UPDATE public.user_monthly_credits
  SET credits_used = GREATEST(credits_used - 1, 0),
      updated_at = now()
  WHERE user_id = p_user_id
    AND period_start = date_trunc('month', now())::date;
END;
$$;
