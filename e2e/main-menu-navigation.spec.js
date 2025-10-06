// e2e/main-menu-navigation.spec.js
const { test, expect } = require('@playwright/test');
const { login, getActiveScene } = require('./test-utils');

test.describe('Main Menu Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Before each test, log in to the application.
    await login(page);

    // Wait for the MenuScene to be the active scene.
    await page.waitForFunction(() => window.game.scene.isActive('MenuScene'), null, { timeout: 10000 });
    const activeScene = await getActiveScene(page);
    expect(activeScene).toBe('MenuScene');
  });

  const navigationTests = [
    { buttonName: 'solo_button', expectedScene: 'CharacterSelectionScene' },
    { buttonName: 'pvp_button', expectedScene: 'PvpScene' },
    { buttonName: 'shop_button', expectedScene: 'ShopScene' },
    { buttonName: 'profile_button', expectedScene: 'ProfileScene' },
    { buttonName: 'config_button', expectedScene: 'ConfigScene' },
  ];

  for (const { buttonName, expectedScene } of navigationTests) {
    test(`should navigate to ${expectedScene} when clicking the ${buttonName}`, async ({ page }) => {
      // Find the button in the MenuScene by its stable name and click it.
      await page.evaluate(async (buttonName) => {
        const menuScene = window.game.scene.getScene('MenuScene');
        const button = menuScene.children.list.find(child => child.name === buttonName);
        if (button) {
          button.emit('pointerdown');
        } else {
          throw new Error(`Button with name "${buttonName}" not found in MenuScene.`);
        }
      }, buttonName);

      // Wait for the new scene to become active.
      await page.waitForFunction((expectedScene) => window.game.scene.isActive(expectedScene), expectedScene, { timeout: 5000 });

      // Verify that the correct scene is now active.
      const activeScene = await getActiveScene(page);
      expect(activeScene).toBe(expectedScene);
    });
  }
});