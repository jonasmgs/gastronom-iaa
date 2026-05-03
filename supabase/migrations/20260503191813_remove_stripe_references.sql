-- Remocao total de referencias ao Stripe no banco de dados
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- Remove o indice de performance relacionado ao Stripe
DROP INDEX IF EXISTS idx_profiles_stripe_customer;
