const { test, expect } = require('@playwright/test');
const { login, mockWallet, getLoggedInUser } = require('./test-utils');

const MOCKED_HEROES = [
    {
        id: 1,
        name: 'Mock Hero 1',
        level: 1,
        xp: 150, // Enough to level up (next level at 100)
        hp: 100,
        damage: 10,
        speed: 200,
        hero_type: 'mock',
        status: 'active',
        sprite_name: 'ninja_frame_0'
    },
    {
        id: 2,
        name: 'NFT Hero In Wallet',
        level: 5,
        xp: 500,
        hp: 150,
        damage: 15,
        speed: 210,
        hero_type: 'nft',
        status: 'in_wallet',
        nft_id: 101,
        sprite_name: 'punk_frame_0'
    },
    {
        id: 3,
        name: 'NFT Hero Staked',
        level: 8,
        xp: 1200,
        hp: 200,
        damage: 25,
        speed: 220,
        hero_type: 'nft',
        status: 'staked',
        nft_id: 102,
        sprite_name: 'cyborg_frame_0'
    },
    {
        id: 4,
        name: 'Mock Hero 2',
        level: 2,
        xp: 110, // Not enough to level up (next level at 300)
        hp: 110,
        damage: 12,
        speed: 205,
        hero_type: 'mock',
        status: 'active',
        sprite_name: 'ninja_frame_0'
    }
];


test.describe('Inventory Panel', () => {
    test.beforeEach(async ({ page }) => {
        await mockWallet(page);
        await page.route('**/api/auth/me', route => route.fulfill({
            status: 200,
            json: { success: true, user: getLoggedInUser() }
        }));
        await page.route('**/api/heroes', route => route.fulfill({
            status: 200,
            json: { success: true, heroes: MOCKED_HEROES }
        }));
        await login(page);
    });

    test('should display all heroes with their correct stats and button states', async ({ page }) => {
        // Navigate to the Profile/Inventory scene from the main menu
        await page.click('text=PROFILE');
        await page.waitForSelector('canvas');

        // Verify all hero cards are rendered
        for (const hero of MOCKED_HEROES) {
            await expect(page.locator(`text=${hero.name}`)).toBeVisible();
            await expect(page.locator(`text=Lvl: ${hero.level}`)).toBeVisible();
            await expect(page.locator(`text=HP: ${hero.hp}`)).toBeVisible();
            await expect(page.locator(`text=DMG: ${hero.damage}`)).toBeVisible();
        }

        // --- Verify Button States ---

        // 1. Mock Hero 1 (Can Level Up)
        const levelUpButtonEnabled = page.locator('text=/LEVEL UP/i').first();
        await expect(levelUpButtonEnabled).toBeVisible();
        // In Phaser, interactive buttons don't have a 'disabled' attribute. We check style.
        await expect(levelUpButtonEnabled).toHaveCSS('color', 'rgb(144, 238, 144)'); // #90EE90

        // 2. NFT Hero In Wallet
        const depositButton = page.locator('text=/Deposit to Play/i');
        await expect(depositButton).toBeVisible();
        await expect(depositButton).toHaveCSS('color', 'rgb(0, 255, 255)'); // #00ffff

        // 3. NFT Hero Staked
        const withdrawButton = page.locator('text=/Withdraw/i');
        await expect(withdrawButton).toBeVisible();
        await expect(withdrawButton).toHaveCSS('color', 'rgb(255, 99, 71)'); // #FF6347

        // 4. Mock Hero 2 (Cannot Level Up)
        const levelUpButtonDisabled = page.locator('text=/LEVEL UP/i').last();
        await expect(levelUpButtonDisabled).toBeVisible();
        await expect(levelUpButtonDisabled).toHaveCSS('color', 'rgb(170, 170, 170)'); // #AAAAAA
    });
});