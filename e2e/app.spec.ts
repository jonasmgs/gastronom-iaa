import { test, expect } from '@playwright/test';

test.describe('Gastronom.IA E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the auth page when not logged in', async ({ page }) => {
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('heading', { name: /entrar|sign in|acceder/i })).toBeVisible();
  });

  test('should have language selector on auth page', async ({ page }) => {
    await expect(page.locator('[aria-label*="language" i], [aria-label*="idioma" i]').first()).toBeVisible();
  });

  test('should show privacy policy link', async ({ page }) => {
    const privacyLink = page.getByText(/política de privacidade|privacy policy/i);
    await expect(privacyLink).toBeVisible();
  });

  test('should navigate to privacy policy page', async ({ page }) => {
    const privacyLink = page.getByText(/política de privacidade|privacy policy/i);
    await privacyLink.click();
    await expect(page).toHaveURL(/\/privacy/);
  });

  test('should have terms of service link on privacy page', async ({ page }) => {
    await page.goto('/privacy');
    const termsLink = page.getByText(/termos de serviço|terms of service/i);
    await expect(termsLink).toBeVisible();
  });

  test('should navigate to terms of service page', async ({ page }) => {
    await page.goto('/privacy');
    const termsLink = page.getByText(/termos de serviço|terms of service/i);
    await termsLink.click();
    await expect(page).toHaveURL(/\/terms/);
  });

  test('should display terms page with content', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: /termos de serviço|terms of service/i })).toBeVisible();
    await expect(page.getByText(/aceitação|acceptance/i)).toBeVisible();
  });

  test('should have no console errors on pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/auth');
    await page.waitForTimeout(1000);

    await page.goto('/privacy');
    await page.waitForTimeout(1000);

    await page.goto('/terms');
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('Failed to load resource')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
