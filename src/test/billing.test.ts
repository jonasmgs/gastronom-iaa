import { describe, it, expect } from 'vitest';
import {
  isGooglePlayBillingConfigured,
  getAndroidBillingUnavailableMessage,
} from '@/lib/billing-platform';

describe('Billing Platform Utilities', () => {
  describe('isGooglePlayBillingConfigured', () => {
    it('should return a boolean value', () => {
      const result = isGooglePlayBillingConfigured();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getAndroidBillingUnavailableMessage', () => {
    it('should return a string message', () => {
      const message = getAndroidBillingUnavailableMessage();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should mention Google Play in the message', () => {
      const message = getAndroidBillingUnavailableMessage();
      expect(message.toLowerCase()).toContain('google');
    });

    it('should return consistent message', () => {
      const message1 = getAndroidBillingUnavailableMessage();
      const message2 = getAndroidBillingUnavailableMessage();
      expect(message1).toBe(message2);
    });
  });
});
