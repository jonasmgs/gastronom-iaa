import { describe, it, expect } from 'vitest';
import pt from '@/i18n/locales/pt';
import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';
import de from '@/i18n/locales/de';
import itLocale from '@/i18n/locales/it';
import fr from '@/i18n/locales/fr';

describe('i18n - Portuguese (pt)', () => {
  it('should have common translations', () => {
    expect(pt.common.save).toBe('Salvar');
    expect(pt.common.cancel).toBe('Cancelar');
    expect(pt.common.delete).toBe('Excluir');
    expect(pt.common.loading).toBe('Carregando...');
    expect(pt.common.error).toBe('Erro');
  });

  it('should have auth translations', () => {
    expect(pt.auth.login).toBe('Entrar');
    expect(pt.auth.signup).toBe('Criar Conta');
    expect(pt.auth.email).toBe('Email');
    expect(pt.auth.password).toBe('Senha');
  });

  it('should have home translations', () => {
    expect(pt.home.generate).toBe('Gerar Receita');
    expect(pt.home.generate).toBeTruthy();
  });

  it('should have recipe translations', () => {
    expect(pt.recipe.ingredients).toBeTruthy();
    expect(pt.recipe.stepByStep).toBeTruthy();
  });

  it('should have subscription translations', () => {
    expect(pt.subscription.subscribe).toBe('Assinar agora');
    expect(pt.subscription.success).toBeTruthy();
  });

  it('should have terms translations', () => {
    expect(pt.terms.title).toBe('Termos de Servico');
    expect(pt.terms.acceptance).toBe('Aceitacao');
    expect(pt.terms.services).toBe('Servicos');
  });
});

describe('i18n - English (en)', () => {
  it('should have common translations', () => {
    expect(en.common.save).toBe('Save');
    expect(en.common.cancel).toBe('Cancel');
    expect(en.common.delete).toBe('Delete');
  });

  it('should have auth translations', () => {
    expect(en.auth.login).toBe('Sign In');
    expect(en.auth.signup).toBe('Sign Up');
  });

  it('should have terms translations', () => {
    expect(en.terms.title).toBe('Terms of Service');
    expect(en.terms.acceptance).toBe('Acceptance');
  });
});

describe('i18n - Spanish (es)', () => {
  it('should have common translations', () => {
    expect(es.common.save).toBe('Guardar');
    expect(es.common.cancel).toBe('Cancelar');
  });

  it('should have terms translations', () => {
    expect(es.terms.title).toBe('Términos de Servicio');
  });
});

describe('i18n - German (de)', () => {
  it('should have common translations', () => {
    expect(de.common.save).toBe('Speichern');
    expect(de.common.cancel).toBe('Abbrechen');
  });

  it('should have terms translations', () => {
    expect(de.terms.title).toBe('Nutzungsbedingungen');
  });
});

describe('i18n - Italian (it)', () => {
  it('should have common translations', () => {
    expect(itLocale.common.save).toBe('Salva');
    expect(itLocale.common.cancel).toBe('Annulla');
  });

  it('should have terms translations', () => {
    expect(itLocale.terms.title).toBe('Termini di Servizio');
  });
});

describe('i18n - French (fr)', () => {
  it('should have common translations', () => {
    expect(fr.common.save).toBe('Enregistrer');
    expect(fr.common.cancel).toBe('Annuler');
  });

  it('should have terms translations', () => {
    expect(fr.terms.title).toBe("Conditions d'Utilisation");
  });
});

describe('i18n - All locales have required keys', () => {
  const requiredKeys = [
    'common.save',
    'common.cancel',
    'common.error',
    'common.loading',
    'auth.login',
    'auth.signup',
    'home.generate',
    'terms.title',
    'subscription.subscribe',
    'terms.acceptance',
    'terms.services',
    'terms.account',
    'terms.subscription',
    'terms.usage',
    'terms.privacy',
    'terms.termination',
    'terms.changes',
    'terms.contact',
  ];

  const locales = { pt, en, es, de, it: itLocale, fr };

  requiredKeys.forEach((key) => {
    Object.entries(locales).forEach(([lang, translations]) => {
      it(`should have ${key} in ${lang}`, () => {
        const keys = key.split('.');
        let value: unknown = translations;
        for (const k of keys) {
          value = (value as Record<string, unknown>)?.[k];
        }
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });
  });
});

describe('i18n - All locales have same structure', () => {
  const locales = { pt, en, es, de, it: itLocale, fr };
  const topLevelKeys = Object.keys(pt);

  topLevelKeys.forEach((key) => {
    it(`should have ${key} in all locales`, () => {
      Object.entries(locales).forEach(([lang, translations]) => {
        expect((translations as Record<string, unknown>)[key]).toBeDefined();
      });
    });
  });
});
