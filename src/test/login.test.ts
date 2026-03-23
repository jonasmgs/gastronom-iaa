import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Login Test', () => {
  it('should attempt to login with provided credentials', async () => {
    const email = 'gastroon@gmail.com';
    const password = 'password_placeholder'; // Senha real não será exposta aqui por segurança, mas o teste falhará se não for a correta no Supabase

    // Tentar o login real com o Supabase (requer conexão com a internet e credenciais válidas no .env)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: '041986',
    });

    if (error) {
      console.error('Login failed:', error.message);
    } else {
      console.log('Login successful for user:', data.user?.email);
    }

    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user?.email).toBe(email);
  });
});
