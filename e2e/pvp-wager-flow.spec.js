const { test, expect } = require('@playwright/test');
const { getExperienceForLevel } = require('../backend/rpg');

// --- Mock Data & Config ---
const LOSER_ADDRESS = '0x2222222222222222222222222222222222222222';
const WAGER_TIER = { id: 2, name: 'Silver', bcoin_cost: 50, xp_cost: 50 };

// XP for Lvl 2 is 100. This hero starts at Lvl 2 with 120 XP.
const initialLoserHero = {
    id: 201,
    user_id: 2,
    hero_type: 'mock',
    level: 2,
    xp: 120, // After losing 50, XP will be 70.
    sprite_name: 'Ninja',
};

// This object holds the mock state and will be updated during the test.
let loserData = {
    success: true,
    user: {
        id: 2,
        address: LOSER_ADDRESS,
        heroes: [initialLoserHero]
    }
};

test.describe('E2E: PvP Wager De-Leveling Flow', () => {

    test.beforeEach(async ({ page }) => {
        // Reset the mock data to its initial state before each test run.
        loserData.user.heroes[0] = { ...initialLoserHero };

        // Mock the essential API routes.
        await page.route('/api/auth/me', route => route.fulfill({ json: loserData }));

        // Mock the backend API call that the oracle would make.
        // This is where we simulate the backend processing the loss.
        await page.route('/api/pvp/wager/report', async route => {
            const loserHero = loserData.user.heroes[0];

            // 1. Deduct XP
            loserHero.xp -= WAGER_TIER.xp_cost; // XP becomes 70

            // 2. Recalculate level using the actual RPG logic
            loserHero.level = getLevelFromExperience(loserHero.xp); // getLevelFromExperience(70) returns 1

            route.fulfill({ json: { success: true } });
        });
    });

    test('a player should lose XP, de-level, and see the correct UI state', async ({ page }) => {
        // 1. Go to the game and set the initial state by simulating a login.
        await page.goto('/');
        await page.waitForFunction(() => window.game && window.game.isBooted, null, { timeout: 10000 });
        await page.evaluate(data => {
            window.api.user = data.user;
            window.api.token = 'fake-token-for-testing';
        }, loserData);

        // 2. SIMULATE THE LOSS: Directly call the mocked oracle report endpoint.
        await page.evaluate(() => window.api.post('/api/pvp/wager/report', {}));

        // 3. SYNC FRONTEND STATE: Manually update the user object in the browser
        // to match the state of our backend mock *after* the loss.
        await page.evaluate(data => {
            window.api.user = data.user;
        }, loserData);

        // 4. VERIFY: Navigate directly to the Profile Scene to check the result.
        await page.evaluate(user => {
            window.game.scene.getScene('MenuScene').scene.start('ProfileScene', { userData: user });
        }, loserData.user);

        await page.waitForFunction(() => window.game.scene.isActive('ProfileScene'));

        // 5. ASSERTIONS:
        // XP for Lvl 2 is 100. Our hero now has 70 XP.
        const heroLevelText = page.locator('text=Lvl: 1');
        const heroXpText = page.locator('text=/XP: 70 \\/ 100/'); // XP is 70, XP for next level (2) is 100.
        const levelUpButton = page.locator('text=Subir de Nível');

        // Check that the hero has been de-leveled to 1.
        await expect(heroLevelText).toBeVisible();

        // Check that the XP is correctly displayed.
        await expect(heroXpText).toBeVisible();

        // CRITICAL: Since the hero's XP (70) is less than the required for Lvl 2 (100),
        // the level-up button should NOT be visible. This correctly tests the implemented logic.
        await expect(levelUpButton).not.toBeVisible();
    });
});