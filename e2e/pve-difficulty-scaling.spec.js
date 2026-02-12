// @ts-check
const { test, expect } = require('@playwright/test');

// --- Test Constants ---
const MOCK_HERO = {
  id: 1,
  name: 'Ninja',
  level: 1,
  xp: 0,
  sprite_name: 'ninja',
};

// Baseline stats for an enemy in the first wave (level 1)
// From EnemySpawner.js:
// baseEnemyHp = 1
// baseSpeed = (100 + 1 * 2) * 0.7 * 0.8 (initial wave reduction) = 81.6 * 0.8 = 65.28
const BASE_HP = 1;
const BASE_SPEED = 81.6; // Speed before the 20% reduction for the first wave
const FIRST_WAVE_SPEED = BASE_SPEED * 0.8;

/**
 * Helper function to set up mocks and start the solo game.
 * @param {import('@playwright/test').Page} page
 * @param {number} accountLevel The account level to simulate.
 */
async function setupAndStartSoloGame(page, accountLevel) {
  // Mock the user authentication and data
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: {
          id: 1,
          wallet_address: '0xTestUser',
          account_level: accountLevel,
          account_xp: 0,
          max_score: 0,
          coins: 0,
        },
      }),
    });
  });

  // Mock the hero selection data
  await page.route('**/api/heroes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, heroes: [MOCK_HERO] }),
    });
  });

  // Add a listener to log browser console messages to the terminal
  page.on('console', (msg) => {
    // Log messages from our spawner to see the calculated values
    if (msg.text().includes('[EnemySpawner]')) {
      console.log(`BROWSER LOG: ${msg.text()}`);
    }
  });

  // --- Navigation ---
  // Go to a blank page to set up the environment before the app loads
  await page.goto('about:blank');
  // Simulate being logged in by setting the token *before* the app runs
  await page.evaluate(() =>
    localStorage.setItem('jwtToken', 'dummy-test-token')
  );

  // Now, navigate to the app. It will find the token on its initial load.
  await page.goto('/');

  // Wait for i18n to be ready to avoid race conditions
  await page.waitForFunction(() => window.i18nReady === true, {
    timeout: 15000,
  });

  // Start the game by clicking the "SOLO" button
  const soloButton = page.locator('text=SOLO');
  await soloButton.click();

  // Select the character
  const characterCard = page.locator(`text=${MOCK_HERO.name}`);
  await characterCard.click();

  // Wait for the GameScene to become active
  await page.waitForFunction(() => window.game.scene.isActive('GameScene'), {
    timeout: 10000,
  });
}

test.describe('PvE Dynamic Difficulty Scaling', () => {
  test('should spawn enemies with baseline stats for a Level 1 account', async ({
    page,
  }) => {
    await setupAndStartSoloGame(page, 1);

    // Wait a moment for the first enemy to be spawned
    await page.waitForTimeout(1000);

    // Get the stats of the first enemy
    const enemyStats = await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('GameScene');
      const firstEnemy = gameScene.enemies.getChildren()[0];
      if (!firstEnemy) return null;
      return {
        hp: firstEnemy.hp,
        velocity: firstEnemy.body.velocity.y,
      };
    });

    expect(enemyStats).not.toBeNull();
    expect(enemyStats.hp).toBe(BASE_HP); // No multiplier
    expect(enemyStats.velocity).toBeCloseTo(FIRST_WAVE_SPEED); // No multiplier, with 1st wave reduction
  });

  test('should spawn enemies with scaled stats for a Level 10 account', async ({
    page,
  }) => {
    const accountLevel = 10;
    await setupAndStartSoloGame(page, accountLevel);

    // Wait a moment for the first enemy to be spawned
    await page.waitForTimeout(1000);

    // --- Calculate Expected Stats ---
    // Formula from EnemySpawner.js: 1 + (accountLevel - 1) * 0.07
    const difficultyMultiplier = 1 + (accountLevel - 1) * 0.07; // 1 + 9 * 0.07 = 1.63
    const expectedHp = Math.ceil(BASE_HP * difficultyMultiplier);
    const expectedSpeed = BASE_SPEED * difficultyMultiplier * 0.8; // Apply 1st wave reduction

    // Get the stats of the first enemy from the running game
    const enemyStats = await page.evaluate(() => {
      const gameScene = window.game.scene.getScene('GameScene');
      const firstEnemy = gameScene.enemies.getChildren()[0];
      if (!firstEnemy) return null;
      return {
        hp: firstEnemy.hp,
        velocity: firstEnemy.body.velocity.y,
      };
    });

    expect(enemyStats).not.toBeNull();
    expect(enemyStats.hp).toBe(expectedHp);
    expect(enemyStats.velocity).toBeCloseTo(expectedSpeed);
  });
});
