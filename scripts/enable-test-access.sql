-- Script para ativar acesso de teste
-- Execute este SQL no Supabase Dashboard > SQL Editor

UPDATE profiles 
SET test_access = true 
WHERE id = '0cdf3b21-c1aa-4495-95b2-853e45690d19';

-- Se a linha nao existir, cria:
INSERT INTO profiles (id, test_access) 
VALUES ('0cdf3b21-c1aa-4495-95b2-853e45690d19', true)
ON CONFLICT (id) DO UPDATE SET test_access = true;
