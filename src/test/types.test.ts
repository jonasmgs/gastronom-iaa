import { describe, it, expect } from 'vitest';
import type { RecipeGeneratorResponse, Ingredient, Step } from '@/types/recipe';

describe('Recipe Types', () => {
  describe('Ingredient', () => {
    it('should have correct structure', () => {
      const ingredient: Ingredient = {
        name: 'Tomate',
        quantity: '2 unidades',
        calories: 44,
      };
      expect(ingredient.name).toBe('Tomate');
      expect(ingredient.quantity).toBe('2 unidades');
      expect(ingredient.calories).toBe(44);
    });

    it('should allow optional tip', () => {
      const ingredient: Ingredient = {
        name: 'Alho',
        quantity: '3 dentes',
        calories: 4,
        tip: 'Prefira fresco',
      };
      expect(ingredient.tip).toBe('Prefira fresco');
    });
  });

  describe('Step', () => {
    it('should have correct structure', () => {
      const step: Step = {
        step_number: 1,
        title: 'Preparar ingredientes',
        description: 'Lave e corte os vegetais',
      };
      expect(step.step_number).toBe(1);
      expect(step.title).toBe('Preparar ingredientes');
      expect(step.description).toBe('Lave e corte os vegetais');
    });

    it('should allow optional duration', () => {
      const step: Step = {
        step_number: 1,
        title: 'Cozinhar',
        description: 'Deixe ferver por 10 minutos',
        duration: '10 min',
      };
      expect(step.duration).toBe('10 min');
    });

    it('should allow optional tip', () => {
      const step: Step = {
        step_number: 1,
        title: 'Misturar',
        description: 'Mexa bem',
        tip: 'Use fuet de madeira',
      };
      expect(step.tip).toBe('Use fuet de madeira');
    });
  });

  describe('RecipeGeneratorResponse', () => {
    it('should have required fields', () => {
      const response: RecipeGeneratorResponse = {
        recipe_name: 'Salada Caesar',
      };
      expect(response.recipe_name).toBe('Salada Caesar');
    });

    it('should have all optional fields', () => {
      const response: RecipeGeneratorResponse = {
        recipe_name: 'Frango Grelhado',
        difficulty: 'easy',
        prep_time: '15 min',
        cook_time: '25 min',
        servings: 4,
        dietary_tags: ['gluten-free'],
        ingredients: [
          { name: 'Peito de frango', quantity: '200g', calories: 165 },
        ],
        steps: [
          { step_number: 1, title: 'Temperar', description: 'Tempere com sal e pimenta' },
        ],
        calories_total: 350,
        nutrition_info: 'Rico em proteina',
        chef_tips: 'Use frango fresco',
        substitutions_made: 'Troque arroz por quinoa',
        preparation: 'Modo de preparo completo',
      };

      expect(response.recipe_name).toBe('Frango Grelhado');
      expect(response.difficulty).toBe('easy');
      expect(response.prep_time).toBe('15 min');
      expect(response.cook_time).toBe('25 min');
      expect(response.servings).toBe(4);
      expect(response.dietary_tags).toContain('gluten-free');
      expect(response.ingredients).toHaveLength(1);
      expect(response.steps).toHaveLength(1);
      expect(response.calories_total).toBe(350);
      expect(response.nutrition_info).toBe('Rico em proteina');
      expect(response.chef_tips).toBe('Use frango fresco');
      expect(response.substitutions_made).toBe('Troque arroz por quinoa');
      expect(response.preparation).toBe('Modo de preparo completo');
    });

    it('should calculate total calories from ingredients', () => {
      const ingredients: Ingredient[] = [
        { name: 'Arroz', quantity: '100g', calories: 130 },
        { name: 'Feijao', quantity: '50g', calories: 80 },
        { name: 'Carne', quantity: '100g', calories: 250 },
      ];
      const totalCalories = ingredients.reduce((sum, ing) => sum + ing.calories, 0);
      expect(totalCalories).toBe(460);
    });
  });
});

describe('Recipe Steps', () => {
  it('should format step as text', () => {
    const step: Step = {
      step_number: 1,
      title: 'Preparar',
      description: 'Misture os ingredientes',
      duration: '5 min',
    };
    const formatted = `${step.step_number}. ${step.title}: ${step.description}`;
    expect(formatted).toBe('1. Preparar: Misture os ingredientes');
  });

  it('should join multiple steps', () => {
    const steps: Step[] = [
      { step_number: 1, title: 'Passo 1', description: 'Faca algo' },
      { step_number: 2, title: 'Passo 2', description: 'Faca outra coisa' },
    ];
    const formatted = steps
      .map(s => `${s.step_number}. ${s.title}: ${s.description}`)
      .join('\n\n');
    expect(formatted).toContain('1. Passo 1');
    expect(formatted).toContain('2. Passo 2');
  });
});
