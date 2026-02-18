const { test, expect } = require('@playwright/test');

test('Arcade UI Overlay Flow', async ({ page }) => {
  // Mock API responses for Auth/Login
  await page.route('**/api/auth/**', async (route) => {
    // Mock Nonce
    if (route.request().url().includes('nonce')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ nonce: '12345678' }),
      });
    }
    // Mock Verify
    if (route.request().url().includes('verify')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-jwt-token', success: true }),
      });
    }
    // Mock Me
    if (route.request().url().includes('me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { address: '0xMockGuest', heroes: [] },
        }),
      });
    }
    return route.continue();
  });

  // Mock Contracts/News to prevent other errors
  await page.route('**/api/contracts', (route) =>
    route.fulfill({ status: 200, body: '{}' })
  );
  await page.route('**/api/news', (route) =>
    route.fulfill({ status: 200, body: '{"success":true,"news":[]}' })
  );

  // Go to localhost
  await page.goto('http://localhost:5173/');

  // Click Play Now
  await page.click('#start-game-btn');

  // Expect UI Layer visible
  await expect(page.locator('#ui-layer')).toBeVisible();

  // Expect ToS Modal visible
  const tosModal = page.locator('#tos-modal');
  await expect(tosModal).toBeVisible();

  // Check content is typing/loaded
  await expect(page.locator('#tos-content')).toContainText('TERMS OF SERVICE');

  // Wait for typing (simple sleep or check button disabled)
  // Checkbox
  await page.check('#tos-checkbox');

  // Click Initialize
  await page.click('#tos-btn');

  // Expect Auth Menu visible
  const authMenu = page.locator('#auth-menu');
  await expect(authMenu).toBeVisible();

  // Click Play as Guest
  await page.click('#btn-login-guest');

  // Expect Status "GENERATING GUEST ID..." or "ACCESS GRANTED"
  await expect(page.locator('#auth-status')).toContainText(/GENERATING|ACCESS/);

  // Wait for Game Canvas
  // The Overlay should hide
  await expect(page.locator('#ui-layer')).toBeHidden({ timeout: 10000 });

  // Game Container should show
  await expect(page.locator('#game-container')).toBeVisible();

  // Canvas should exist
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });

  // Take Screenshot
  await page.screenshot({ path: 'arcade_ui_flow.png' });
});
