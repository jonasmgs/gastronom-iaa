import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/edge-functions';

describe('App Integration Test', () => {
  let session: any = null;

  it('1. Login should work with provided credentials', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'gastroon@gmail.com',
      password: '041986',
    });

    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    session = data.session;
    console.log('✅ Login successful');
  });

  it('2. Should check subscription status (Play only)', async () => {
    expect(session).toBeDefined();
    const { data: profile } = await supabase
      .from('profiles')
      .select('test_access')
      .eq('id', session.user.id)
      .single();
    console.log('👤 User profile test_access:', profile?.test_access);
  });

  it('3. Should generate a recipe', async () => {
    expect(session).toBeDefined();

    const ingredients = ['frango', 'batata', 'cebola'];
    console.log('🍳 Generating recipe with:', ingredients.join(', '));

    const { data, error } = await invokeEdgeFunction<any>('recipe-generator', {
      body: { 
        ingredients, 
        category: 'salgado', 
        complexity: 'simples', 
        servings: 2 
      },
      token: session.access_token,
    });

    if (error) {
        console.error('❌ Recipe generation failed:', error.message);
    }
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.recipe_name).toBeDefined();
    console.log('✨ Recipe generated:', data.recipe_name);
    
    // Salvar a receita para testar persistência
    const { data: saved, error: saveErr } = await supabase.from('recipes').insert({
        user_id: session.user.id,
        recipe_name: data.recipe_name,
        ingredients: JSON.stringify(data.ingredients),
        preparation: data.preparation || 'Teste de preparo',
        calories_total: data.calories_total || 0,
    }).select().single();

    expect(saveErr).toBeNull();
    console.log('💾 Recipe saved with ID:', saved.id);

    // Limpar receita de teste
    await supabase.from('recipes').delete().eq('id', saved.id);
    console.log('🗑️ Test recipe cleaned up');
  }, 30000);

  it('4. Should fetch saved recipes', async () => {
    expect(session).toBeDefined();
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    console.log('📚 Successfully fetched recipes list (count:', data?.length, ')');
  });
});

