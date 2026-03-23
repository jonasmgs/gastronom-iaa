ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS test_access boolean NOT NULL DEFAULT false;
