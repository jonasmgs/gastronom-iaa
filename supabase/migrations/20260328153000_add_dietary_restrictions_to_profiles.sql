-- Add dietary_restrictions array to profiles to store saved user filters
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dietary_restrictions text[] DEFAULT ARRAY[]::text[];
