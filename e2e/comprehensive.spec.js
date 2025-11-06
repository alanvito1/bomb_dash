const { test, expect } = require('@playwright/test');
const { setupWallet, login: performLogin, waitForScene, triggerGameObjectEvent } = require('./test-utils');

// A known private key for a test wallet on the local Hardhat node
const TEST_USER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function login(page) {
    // The game starts on the LoadingScene, then moves to TermsScene.
    await waitForScene(page, 'TermsScene');
    // Accept the terms to proceed to the login choice.
    await triggerGameObjectEvent(page, 'TermsScene', 'acceptButton', 'pointerdown');
    await waitForScene(page, 'AuthChoiceScene');
    await performLogin(page, TEST_USER_PRIVATE_KEY);
    await waitForScene(page, 'MenuScene');
}

test.describe('Comprehensive Bomb Dash E2E Tests', () => {

    test.beforeEach(async ({ page }) => {
        // --- Mock API Endpoints ---
        // Mock the contract addresses endpoint, which is crucial for the game to start.
        await page.route('**/api/contracts', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                contracts: {
                    bcoin: { address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' },
                    heroStaking: { address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' },
                    perpetualRewardPool: { address: '0x0165878A594ca255338adfa4d48449f69242Eb8F' },
                    tournamentController: { address: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853' },
                    wagerArena: { address: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6' },
                }
            })
        }));

        // Mock the initial user session check to simulate a logged-out state.
        await page.route('**/api/auth/me', route => route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'No token provided' })
        }));

        // --- Setup Wallet ---
        // Inject a mock wallet into the browser context for the game to use.
        await setupWallet(page, TEST_USER_PRIVATE_KEY);

        // --- Navigate to the Game ---
        await page.goto('/');
    });

    /**
     *  SECTION 1: Core Component Validation
     */

    test('1.1 - Web3 Authentication (SIWE)', async ({ page }) => {
        await login(page);
        const onMenuScene = await page.evaluate(() => window.game.scene.isActive('MenuScene'));
        expect(onMenuScene).toBe(true);
    });

    test('1.2 - Hero System (Mock Heroes for New Players)', async ({ page }) => {
        await login(page);

        // Mock the heroes API to return an empty list initially (simulating a new player).
        // The backend logic should then create and return mock heroes.
        await page.route('**/api/heroes', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                heroes: [
                    { id: 1, hero_type: 'Ninja', level: 1, xp: 0, status: 'in_wallet', sprite_name: 'ninja' },
                    { id: 2, hero_type: 'Witch', level: 1, xp: 0, status: 'in_wallet', sprite_name: 'witch' }
                ]
            })
        }));

        // Navigate to the Hero Selection scene.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'heroButton', 'pointerdown');
        await waitForScene(page, 'HeroSelectionScene');

        // Verify that the mock heroes are displayed.
        const heroCards = await page.evaluate(() => {
            const scene = window.game.scene.getScene('HeroSelectionScene');
            return scene.heroCards.map(card => card.heroData.hero_type);
        });
        expect(heroCards).toContain('Ninja');
        expect(heroCards).toContain('Witch');
    });

    test('1.3 - Progression and Upgrades (XP Gain and Level Up)', async ({ page }) => {
        await login(page);

        const heroId = 1;
        const initialHero = { id: heroId, hero_type: 'Ninja', level: 1, xp: 90, status: 'in_wallet', sprite_name: 'ninja' };
        const leveledUpHero = { id: heroId, hero_type: 'Ninja', level: 2, xp: 0, status: 'in_wallet', sprite_name: 'ninja' };

        // Mock the initial hero state (close to leveling up).
        await page.route(`**/api/heroes`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [initialHero] })
        }), { times: 1 });

        // Mock the successful response after reporting a match and gaining XP.
        // This gain should push the hero over the level-up threshold.
        await page.route('**/api/solo/report', route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, xp_gain: 20, message: "XP Added" })
        }));

        // Mock the level-up API call.
        await page.route(`**/api/heroes/${heroId}/level-up`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, hero: leveledUpHero })
        }));

        // Navigate to Hero Selection and select the hero.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'heroButton', 'pointerdown');
        await waitForScene(page, 'HeroSelectionScene');

        // In a real test, we would play a game here. We'll simulate the API calls instead.
        // After the "game", we simulate the user going back to the hero screen to level up.

        // Mock the hero data again, this time at the XP cap, ready to level up.
         await page.route(`**/api/heroes`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [{...initialHero, xp: 100 }] }) // XP is now at cap
        }));

        // The UI should now show a "Level Up" button. We trigger its event.
        // Note: The UI logic to show/hide this button is assumed.
        await page.evaluate(async (id) => {
            const scene = window.game.scene.getScene('HeroSelectionScene');
            const heroCard = scene.heroCards.find(c => c.heroData.id === id);
            // This is a hypothetical event emitter on the card for leveling up.
            heroCard.emit('levelUpRequest');
        }, heroId);

        // Finally, mock the heroes API one last time to show the leveled-up state.
        await page.route(`**/api/heroes`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [leveledUpHero] })
        }));

        // Refresh the scene or re-enter to see the updated hero.
        await triggerGameObjectEvent(page, 'HeroSelectionScene', 'backButton', 'pointerdown');
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'heroButton', 'pointerdown');
        await waitForScene(page, 'HeroSelectionScene');

        // Verify the hero is now level 2.
        const finalHeroLevel = await page.evaluate((id) => {
             const scene = window.game.scene.getScene('HeroSelectionScene');
             const heroCard = scene.heroCards.find(c => c.heroData.id === id);
             return heroCard.heroData.level;
        }, heroId);

        expect(finalHeroLevel).toBe(2);
    });

    /**
     * SECTION 2: Implemented Features Validation (Scope Creep)
     */

    test('2.1 - Solo Reward System (Claim Flow)', async ({ page }) => {
        await login(page);

        // Mock the API endpoint for claiming solo rewards.
        await page.route('**/api/solo/claim-reward', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Rewards claimed!', amount: 100 })
        }));

        // Navigate to a hypothetical "Rewards" scene or trigger the claim from the menu.
        // For this test, we'll assume a "claimRewardButton" exists in the MenuScene.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'claimRewardButton', 'pointerdown');

        // The game should launch the global NotificationScene to provide feedback.
        await waitForScene(page, 'NotificationScene');

        // Verify the success message is displayed in the notification.
        const notificationText = await page.evaluate(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            // This assumes the text object is named 'notificationText'.
            return scene.children.list.find(c => c.name === 'notificationText').text;
        });
        expect(notificationText).toContain('Rewards claimed!');
    });

    test('2.2 - PvP 1v1 (Ranked Fee Flow)', async ({ page }) => {
        await login(page);

        // Mock the API for entering the ranked queue.
        await page.route('**/api/pvp/ranked/enter', route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, message: 'Entered queue' })
        }));

        // Navigate to the PvP scene and enter the ranked queue.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'pvpButton', 'pointerdown');
        await waitForScene(page, 'PvpSelectionScene');
        await triggerGameObjectEvent(page, 'PvpSelectionScene', 'rankedButton', 'pointerdown');

        // Verify that the game shows a "Waiting for match..." or similar state.
        // This is a UI state validation.
        await expect(page.getByText('Finding Opponent...')).toBeVisible();
    });

    test('2.3 - Hero Staking (Deposit and Withdraw)', async ({ page }) => {
        await login(page);

        const heroId = 1;
        const heroInWallet = { id: heroId, hero_type: 'Ninja', level: 5, xp: 50, status: 'in_wallet', sprite_name: 'ninja' };
        const heroStaked = { ...heroInWallet, status: 'staked' };

        // Mock the initial hero state.
        await page.route(`**/api/heroes`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [heroInWallet] })
        }), { times: 1 });

        // Mock the staking API call.
        await page.route(`**/api/heroes/${heroId}/stake`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, hero: heroStaked })
        }));

        // Mock the withdrawal API call.
        await page.route(`**/api/heroes/${heroId}/initiate-withdrawal`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, hero: heroInWallet })
        }));

        // Navigate to Hero Selection.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'heroButton', 'pointerdown');
        await waitForScene(page, 'HeroSelectionScene');

        // --- Test Staking ---
        // Mock the hero data to reflect the staked state after the action.
        await page.route(`**/api/heroes`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [heroStaked] })
        }));

        // Trigger the stake button on the hero card.
        await page.evaluate(id => window.game.scene.getScene('HeroSelectionScene').heroCards.find(c => c.heroData.id === id).emit('stakeRequest'), heroId);

        // Verify the UI updates to show the hero is staked.
        let heroStatus = await page.evaluate(id => window.game.scene.getScene('HeroSelectionScene').heroCards.find(c => c.heroData.id === id).heroData.status, heroId);
        expect(heroStatus).toBe('staked');

        // --- Test Withdrawal ---
         await page.route(`**/api/heroes`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [heroInWallet] })
        }));

        // Trigger the withdraw button.
        await page.evaluate(id => window.game.scene.getScene('HeroSelectionScene').heroCards.find(c => c.heroData.id === id).emit('withdrawRequest'), heroId);

        // Verify the UI updates to show the hero is back in the wallet.
        heroStatus = await page.evaluate(id => window.game.scene.getScene('HeroSelectionScene').heroCards.find(c => c.heroData.id === id).heroData.status, heroId);
        expect(heroStatus).toBe('in_wallet');
    });

    test('2.4 - Altar of Global Buffs (Donation Flow)', async ({ page }) => {
        await login(page);

        // Mock the altar status API.
        await page.route('**/api/altar/status', route => route.fulfill({
            status: 200,
            body: JSON.stringify({
                success: true,
                status: { current_donations: 5000, goal: 10000, active_buff: null }
            })
        }));

        // Mock the donation API.
        await page.route('**/api/altar/donate', route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, message: 'Donation successful!' })
        }));

        // Navigate to the Altar scene.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'altarButton', 'pointerdown');
        await waitForScene(page, 'AltarScene');

        // Trigger a donation.
        await triggerGameObjectEvent(page, 'AltarScene', 'donateButton', 'pointerdown');

        // Verify a success notification is shown.
        await waitForScene(page, 'NotificationScene');
        const notificationText = await page.evaluate(() => window.game.scene.getScene('NotificationScene').children.list.find(c => c.name === 'notificationText').text);
        expect(notificationText).toContain('Donation successful!');
    });

    test('2.5 - Player Ranking System (View Rankings)', async ({ page }) => {
        await login(page);

        // Mock the ranking API to return a list of top players.
        await page.route('**/api/ranking', route => route.fulfill({
            status: 200,
            body: JSON.stringify({
                success: true,
                ranking: [
                    { rank: 1, wallet_address: '0xPlayerOne...', highest_wave_reached: 50 },
                    { rank: 2, wallet_address: '0xPlayerTwo...', highest_wave_reached: 45 },
                ]
            })
        }));

        // Navigate to the Ranking scene.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'rankingButton', 'pointerdown');
        await waitForScene(page, 'RankingScene');

        // Verify the ranking data is displayed correctly.
        const rankingText = await page.evaluate(() => {
            const scene = window.game.scene.getScene('RankingScene');
            // This assumes a text object or container holds the formatted ranking list.
            return scene.children.list.find(c => c.name === 'rankingDisplayText').text;
        });

        expect(rankingText).toContain('1. 0xPlayerOne...');
        expect(rankingText).toContain('Wave: 50');
        expect(rankingText).toContain('2. 0xPlayerTwo...');
        expect(rankingText).toContain('Wave: 45');
    });

    test('2.6 - PvP XP Wager System (De-level Scenario)', async ({ page }) => {
        await login(page);

        const heroId = 2;
        // Hero starts at Level 3 with just enough XP to de-level if they lose.
        const initialHero = { id: heroId, hero_type: 'Witch', level: 3, xp: 210, status: 'in_wallet', sprite_name: 'witch' };
        // After losing the wager, the hero de-levels to 2 and XP is capped at the max for the new level.
        const deleveledHero = { id: heroId, hero_type: 'Witch', level: 2, xp: 199, status: 'in_wallet', sprite_name: 'witch' };

        await page.route(`**/api/heroes`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [initialHero] })
        }), { times: 1 });

        // Mock the API for reporting a wager match where the player loses.
        // The backend would handle the de-level logic.
        await page.route('**/api/pvp/wager/report', route => route.fulfill({
            status: 200,
            body: JSON.stringify({
                success: true,
                outcome: 'loss',
                xp_change: -50, // A significant loss
                hero_update: deleveledHero
            })
        }));

        // --- Simulate entering and losing a wager match ---
        // (Navigation to wager scene, etc.)
        // For this test, we'll just mock the final hero state call.

        await page.route(`**/api/heroes`, route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [deleveledHero] })
        }));

        // Re-enter the hero selection scene to check the result.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'heroButton', 'pointerdown');
        await waitForScene(page, 'HeroSelectionScene');

        // Verify the hero has de-leveled to 2.
        const finalHeroLevel = await page.evaluate(id => {
            return window.game.scene.getScene('HeroSelectionScene').heroCards.find(c => c.heroData.id === id).heroData.level;
        }, heroId);

        const finalHeroXp = await page.evaluate(id => {
            return window.game.scene.getScene('HeroSelectionScene').heroCards.find(c => c.heroData.id === id).heroData.xp;
        }, heroId);

        expect(finalHeroLevel).toBe(2);
        expect(finalHeroXp).toBe(199); // XP is reset to the cap of the new, lower level.
    });

    /**
     * SECTION 3: Critical Failure Validation
     */

    test('3.1 - Multi-Player Tournament (Graceful Failure)', async ({ page }) => {
        await login(page);

        // Mock the backend endpoint for tournaments to return a "Not Implemented" error.
        await page.route('**/api/tournaments/join', route => route.fulfill({
            status: 501, // 501 Not Implemented
            contentType: 'application/json',
            body: JSON.stringify({ success: false, message: 'This feature is not yet available.' })
        }));

        // Navigate to the PvP selection screen.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'pvpButton', 'pointerdown');
        await waitForScene(page, 'PvpSelectionScene');

        // Attempt to join a 4-player tournament (assuming a button 'tournament4pButton' exists).
        await triggerGameObjectEvent(page, 'PvpSelectionScene', 'tournament4pButton', 'pointerdown');

        // Verify that the NotificationScene appears with the correct error message.
        await waitForScene(page, 'NotificationScene');
        const notificationText = await page.evaluate(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            return scene.children.list.find(c => c.name === 'notificationText').text;
        });

        expect(notificationText).toContain('feature is not yet available');

        // Ensure the game returns gracefully to the previous scene.
        // We can check if the PvpSelectionScene is still active after the notification.
        await page.evaluate(() => window.game.scene.getScene('NotificationScene').dismiss());
        const isPvpSceneStillActive = await page.evaluate(() => window.game.scene.isActive('PvpSelectionScene'));
        expect(isPvpSceneStillActive).toBe(true);
    });

    /**
     * SECTION 4: "Long Run" Integrative Validation
     */
    test('4.1 - Full User Lifecycle Simulation', async ({ page }) => {
        // --- 1. Onboarding ---
        await login(page);

        // Mock heroes API to provide a starting mock hero.
        const hero = { id: 1, hero_type: 'Ninja', level: 1, xp: 0, status: 'in_wallet', sprite_name: 'ninja' };
        await page.route('**/api/heroes', route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, heroes: [hero] })
        }));

        // Mock solo match report for XP gain.
        await page.route('**/api/solo/report', route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, xp_gain: 20 })
        }));

        // Simulate playing a solo match.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'soloButton', 'pointerdown');
        // (Game simulation would happen here)
        // For the test, we assume the game ends and a report is sent.
        // We can verify the user is returned to the menu.
        await waitForScene(page, 'MenuScene'); // Assuming game returns to menu.

        // --- 2. Economic Cycle ---
        // Mock all necessary endpoints for the economic cycle tests.
        await page.route('**/api/solo/claim-reward', route => route.fulfill({ status: 200, body: '{"success":true}' }));
        await page.route('**/api/pvp/ranked/enter', route => route.fulfill({ status: 200, body: '{"success":true}' }));
        await page.route('**/api/heroes/1/stake', route => route.fulfill({ status: 200, body: '{"success":true}' }));
        await page.route('**/api/altar/donate', route => route.fulfill({ status: 200, body: '{"success":true}' }));
        await page.route('**/api/ranking', route => route.fulfill({ status: 200, body: '{"success":true, "ranking":[]}' }));

        // a) Claim solo reward
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'claimRewardButton', 'pointerdown');
        await waitForScene(page, 'NotificationScene');
        await page.evaluate(() => window.game.scene.getScene('NotificationScene').dismiss());

        // b) Enter PvP
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'pvpButton', 'pointerdown');
        await waitForScene(page, 'PvpSelectionScene');
        await triggerGameObjectEvent(page, 'PvpSelectionScene', 'rankedButton', 'pointerdown');
        // Go back to menu
        await triggerGameObjectEvent(page, 'PvpSelectionScene', 'backButton', 'pointerdown');
        await waitForScene(page, 'MenuScene');

        // c) Stake Hero
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'heroButton', 'pointerdown');
        await waitForScene(page, 'HeroSelectionScene');
        await page.evaluate(() => window.game.scene.getScene('HeroSelectionScene').heroCards[0].emit('stakeRequest'));
        await triggerGameObjectEvent(page, 'HeroSelectionScene', 'backButton', 'pointerdown');
        await waitForScene(page, 'MenuScene');

        // d) Donate to Altar
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'altarButton', 'pointerdown');
        await waitForScene(page, 'AltarScene');
        await triggerGameObjectEvent(page, 'AltarScene', 'donateButton', 'pointerdown');
        await waitForScene(page, 'NotificationScene');
        await page.evaluate(() => window.game.scene.getScene('NotificationScene').dismiss());
        await triggerGameObjectEvent(page, 'AltarScene', 'backButton', 'pointerdown');
        await waitForScene(page, 'MenuScene');

        // e) Check Ranking
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'rankingButton', 'pointerdown');
        await waitForScene(page, 'RankingScene');
        await triggerGameObjectEvent(page, 'RankingScene', 'backButton', 'pointerdown');
        await waitForScene(page, 'MenuScene');

        // --- 3. Secure Logout ---
        // Mock the logout API.
        await page.route('**/api/auth/logout', route => route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, message: 'Logged out' })
        }));

        // Trigger the logout button.
        await waitForScene(page, 'MenuScene');
        await triggerGameObjectEvent(page, 'MenuScene', 'logoutButton', 'pointerdown');

        // Verify the game returns to the AuthChoiceScene.
        await waitForScene(page, 'AuthChoiceScene');
        const onAuthScene = await page.evaluate(() => window.game.scene.isActive('AuthChoiceScene'));
        expect(onAuthScene).toBe(true);

        // Verify the JWT is cleared from localStorage.
        const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
        expect(token).toBeNull();
    });
});
