-- Adiciona chave de cache para evitar geracoes duplicadas e economizar custos de IA
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS cache_key text;

-- Indice para busca rapida de cache
CREATE INDEX IF NOT EXISTS idx_recipes_cache_key ON public.recipes(cache_key) WHERE cache_key IS NOT NULL;
