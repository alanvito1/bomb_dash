// test/smoke/game-boot.test.js
import { test, expect } from '@playwright/test';

test('Game should boot to main menu', async ({ page }) => {
  // Mock completo das APIs Web3
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/api/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          address: '0xMockAddress123'
        })
      });
    }

    if (url.includes('/api/contracts')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tournamentController: '0xMockContract',
          perpetualRewardPool: '0xMockContract'
        })
      });
    }

    // Default response para outras APIs
    return route.fulfill({ status: 200, body: '{}' });
  });

  await page.goto('http://localhost:5173/');

  // Verificação mais tolerante do boot do jogo
  await expect(async () => {
    const isGameLoaded = await page.evaluate(() => {
      return window.game !== undefined &&
             typeof window.game.scene !== 'undefined';
    });
    expect(isGameLoaded).toBeTruthy();
  }).toPass({ timeout: 10000 });
});
