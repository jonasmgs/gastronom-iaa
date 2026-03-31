-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON public.recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_user_created ON public.recipes(user_id, created_at DESC);

-- Add index for profiles session_token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_session_token ON public.profiles(session_token) WHERE session_token IS NOT NULL;

-- Add index for profiles stripe_customer_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
