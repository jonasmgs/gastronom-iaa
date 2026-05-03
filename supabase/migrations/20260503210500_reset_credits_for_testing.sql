-- Reset de créditos para fase de teste
-- Garante que todos comecem com 0 usados e 10 totais
UPDATE public.user_monthly_credits 
SET credits_used = 0, 
    credits_total = 10,
    updated_at = now();
