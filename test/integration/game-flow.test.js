// test/integration/game-flow.test.js
import { test, expect } from '@playwright/test';
import { Web3Mock } from '../mocks/web3-mock.js';

async function setupAPIMocks(page) {
    await page.route('**/api/**', async (route) => {
        const url = route.request().url();
        if (url.includes('/api/auth/me')) {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: true, address: '0xMockAddress123' }) });
        }
        if (url.includes('/api/contracts')) {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tournamentController: '0xMockContract', perpetualRewardPool: '0xMockContract' }) });
        }
        return route.fulfill({ status: 200, body: '{}' });
    });
}

test.describe('Game Flow Integration', () => {
  test.beforeEach(async ({ page }) => {
    await Web3Mock.setupPageMocks(page);
    await setupAPIMocks(page);
  });

  test('should navigate from menu to tournament lobby', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Aguarda o Phaser inicializar
    await page.waitForFunction(() => window.game?.scene?.keys?.MenuScene !== undefined, { timeout: 15000 });

    // Clique mais robusto no botão de torneio
    await page.evaluate(() => {
      const scene = window.game.scene.keys.MenuScene;
      const button = scene.children.getByName('tournament_button');
      if (button) {
        button.emit('pointerdown'); // pointerdown is more reliable for phaser buttons
        return true;
      }
      return false;
    });

    // Verifica se a cena de lobby foi carregada
    await expect.poll(async () => {
      return await page.evaluate(() => {
        return window.game.scene.isActive('TournamentLobbyScene');
      });
    }, { timeout: 10000 }).toBeTruthy();
  });
});
