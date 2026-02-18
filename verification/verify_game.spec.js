
import { test, expect } from '@playwright/test';

test('Verify Altar Widget and Risk Zone', async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
  page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

  // 1. Mock API responses
  await page.route('**/api/auth/me', async route => route.fulfill({
      json: { success: true, user: { id: 1, wallet_address: '0xTest', coins: 500, isGuest: false } }
  }));
  await page.route('**/api/heroes', async route => route.fulfill({
      json: { success: true, heroes: [{ id: 1, sprite_name: 'ninja_hero', level: 10, rarity: 'Common', status: 'in_wallet' }] }
  }));
  await page.route('**/api/game/settings', async route => route.fulfill({ json: { success: true, settings: { monsterScaleFactor: 1 } } }));
  await page.route('**/api/news', async route => route.fulfill({ json: { success: true, news: [] } }));
  await page.route('**/api/ranking', async route => route.fulfill({ json: { success: true, ranking: [] } }));

  // 2. Go to game
  await page.goto('http://localhost:5173');

  // 3. Force Launch Game and Hide Overlays
  await page.evaluate(() => {
      const landing = document.getElementById('landing-page');
      if (landing) landing.style.display = 'none';
      const overlay = document.getElementById('ui-layer');
      if (overlay) overlay.style.display = 'none';

      if (window.launchGame) window.launchGame();
  });

  // 4. Wait for Phaser Game Instance
  await page.waitForFunction(() => window.game && window.game.isBooted, { timeout: 10000 });

  // 5. Force MenuScene with data
  await page.evaluate(() => {
      const game = window.game;
      game.registry.set('loggedInUser', { id: 1, wallet_address: '0xTest', coins: 500, isGuest: false });
      game.registry.set('selectedHero', { id: 1, sprite_name: 'ninja_hero', level: 10 });

      const scenes = game.scene.getScenes(true);
      if (scenes.length > 0) scenes.forEach(s => s.scene.stop());

      game.scene.start('MenuScene');
  });

  await page.waitForTimeout(5000); // Wait for MenuScene to render
  await page.screenshot({ path: 'verification/menu_scene.png' });

  // 6. Force GameScene
  await page.evaluate(() => {
      const game = window.game;
      game.registry.set('selectedHero', { id: 1, sprite_name: 'ninja_hero', level: 10, hp: 100, maxHp: 100 });
      game.scene.stop('MenuScene');
      game.scene.start('GameScene', { gameMode: 'solo' });
  });

  await page.waitForTimeout(5000); // Wait for Risk Text
  await page.screenshot({ path: 'verification/game_scene.png' });
});
