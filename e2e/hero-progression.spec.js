// @ts-check
const { test, expect } = require('@playwright/test');

// --- Test Data ---
const MOCK_HERO_ID = 1;
const MOCK_HERO_NAME = 'Ninja';
const MOCK_INITIAL_LEVEL = 3;
const MOCK_XP_FOR_LEVEL_4 = 400; // From rpg.js formula for level 4

const MOCK_HERO_BEFORE_LEVEL_UP = {
  id: MOCK_HERO_ID,
  name: MOCK_HERO_NAME,
  level: MOCK_INITIAL_LEVEL,
  xp: MOCK_XP_FOR_LEVEL_4 + 50, // Has enough XP to level up
  maxHp: 120,
  sprite_name: 'ninja',
  hero_type: 'mock',
};

const MOCK_HERO_AFTER_LEVEL_UP = {
  ...MOCK_HERO_BEFORE_LEVEL_UP,
  level: MOCK_INITIAL_LEVEL + 1,
  maxHp: 130, // +10 HP bonus
  hp: 130,
};

test.describe('Hero Progression End-to-End Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the initial hero data to set up the scene
    await page.route('**/api/heroes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          heroes: [MOCK_HERO_BEFORE_LEVEL_UP],
        }),
      });
    });
  });

  test('should allow a user to level up a hero and see the UI update', async ({
    page,
  }) => {
    // Add a listener to log browser console messages to the terminal
    page.on('console', (msg) => {
      console.log(`BROWSER LOG: [${msg.type()}] ${msg.text()}`);
    });

    // --- 1. Navigate and Log In ---
    await page.goto('/');

    // Use a simple localStorage entry to simulate being logged in
    await page.evaluate(() => {
      localStorage.setItem('jwtToken', 'dummy-test-token');
    });

    // Navigate to the scene after logging in
    await page.evaluate(() => {
      const game = window.game;
      if (game) {
        game.scene.start('CharacterSelectionScene');
      }
    });

    // --- 2. Mock the API Client ---
    // Override the specific API client method that handles the complex Web3 interaction.
    // This is far more stable than trying to mock the ethers library itself.
    await page.evaluate((updatedHero) => {
      window.api.levelUpHero = async (heroId) => {
        console.log(
          `E2E MOCK: window.api.levelUpHero called with heroId: ${heroId}`
        );
        // Simulate the successful API call by returning the expected hero data.
        return Promise.resolve({
          success: true,
          hero: updatedHero,
        });
      };
    }, MOCK_HERO_AFTER_LEVEL_UP);

    // --- 3. Interact with the UI and Assert ---

    // Wait for the hero card to be rendered by looking for the hero's name
    const heroCard = page
      .locator('.phaser-game')
      .getByText(MOCK_HERO_NAME)
      .locator('..');
    await expect(heroCard).toBeVisible();

    // Find the "LEVEL UP" button within the specific hero's card
    const levelUpButton = heroCard.getByText('LEVEL UP');
    await expect(levelUpButton).toBeVisible();
    await expect(levelUpButton).toBeEnabled();

    // Click the level-up button
    await levelUpButton.click();

    // Assert that the button shows "PROCESSING..." briefly
    await expect(heroCard.getByText('PROCESSING...')).toBeVisible();

    // Assert that the success popup appears with the correct text
    await expect(
      page.locator('.phaser-game').getByText('Success!')
    ).toBeVisible();
    await expect(
      page
        .locator('.phaser-game')
        .getByText(
          `${MOCK_HERO_NAME} is now Level ${MOCK_HERO_AFTER_LEVEL_UP.level}!`
        )
    ).toBeVisible();

    // Close the popup to continue assertions
    // Use a more robust locator for the OK button
    const okButton = page.locator('.phaser-game').getByText('OK');
    await okButton.click();

    // Assert that the card now shows the new level
    await expect(
      heroCard.getByText(`Lvl: ${MOCK_HERO_AFTER_LEVEL_UP.level}`)
    ).toBeVisible();

    // Assert that the "LEVEL UP" button is now disabled because the XP is no longer sufficient for the *new* next level
    const newLevelUpButton = heroCard.getByText('LEVEL UP');
    await expect(newLevelUpButton).not.toBeEnabled();
  });
});
