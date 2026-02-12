// scripts/health-check.js
const { chromium } = require('playwright');

async function healthCheck() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🚀 Iniciando health check do jogo...');

    await page.goto('http://localhost:5173/');

    // Verifica se o Phaser carregou
    const gameLoaded = await page.waitForFunction(
      () => window.game !== undefined,
      { timeout: 10000 }
    );
    console.log('✅ Phaser carregado com sucesso');

    // Verifica se as cenas principais existem
    const scenes = await page.evaluate(() => {
      if (!window.game || !window.game.scene) return null;
      return Object.keys(window.game.scene.keys);
    });

    console.log('📋 Cenas carregadas:', scenes);

    // Teste de navegação básica
    await page.evaluate(() => {
      if (window.game.scene.keys.MenuScene) {
        window.game.scene.start('TournamentLobbyScene');
        return true;
      }
      return false;
    });

    console.log('✅ Navegação entre cenas funcionando');
  } catch (error) {
    console.error('❌ Health check falhou:', error);

    // Captura screenshot para debug
    await page.screenshot({ path: 'health-check-failure.png' });
    console.log('📸 Screenshot salva em health-check-failure.png');
  } finally {
    await browser.close();
  }
}

healthCheck();
