const { test, expect } = require('@playwright/test');
const { login, setupWallet, BCOIN_CONTRACT, TOURNAMENT_CONTROLLER_CONTRACT } = require('./test-utils');

const USER_A = {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat account 0
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
};

test.describe('1v1 Ranked PvP Flow', () => {

    test('should complete a full 1v1 ranked match flow with Sunday bonus', async ({ page }) => {
        // --- 1. Setup and Mocking ---
        await page.goto('/');
        await setupWallet(page, USER_A.privateKey);

        // Add a listener to log browser console messages to the terminal for debugging
        page.on('console', msg => console.log(`BROWSER LOG: [${msg.type()}] ${msg.text()}`));

        // Mock Date to be a Sunday (getDay() === 0) to test the bonus
        await page.evaluate(() => {
            const sunday = new Date('2025-10-05T12:00:00Z'); // This is a Sunday
            Date.prototype.getDay = () => sunday.getDay();
            console.log('Mocked Date.getDay() to return 0 (Sunday)');
        });

        // Mock the API client on the window object for robust control
        await page.evaluate(() => {
            let matchFound = false;

            // Mock the generic 'get' method
            window.api.get = async (url) => {
                if (url.includes('/matchmaking/status')) {
                    if (!matchFound) {
                        matchFound = true;
                        console.log('MOCK API GET: /matchmaking/status -> searching');
                        return Promise.resolve({ success: true, status: 'searching' });
                    }
                    console.log('MOCK API GET: /matchmaking/status -> found');
                    return Promise.resolve({
                        success: true,
                        status: 'found',
                        match: {
                            matchId: 'pvp_match_123',
                            opponent: { userId: 999, hero: { id: 999, sprite_name: 'Witch', level: 5 } }
                        }
                    });
                }
                return Promise.resolve({ success: false, message: 'Unhandled GET mock' });
            };

            // Mock the generic 'post' method
            window.api.post = async (url, data) => {
                if (url.includes('/pvp/ranked/enter')) {
                    console.log('MOCK API POST: /pvp/ranked/enter', data);
                    return Promise.resolve({ success: true, message: "Você está na fila!" });
                }
                if (url.includes('/pvp/ranked/report')) {
                    console.log('MOCK API POST: /pvp/ranked/report', data);
                    return Promise.resolve({
                        success: true,
                        message: "Partida finalizada! Você ganhou 55 XP para o herói e 22 XP para a conta. (Bônus de Domingo de +10% aplicado!)",
                        rewards: { heroXp: 55, accountXp: 22, bonusApplied: true }
                    });
                }
                return Promise.resolve({ success: false, message: 'Unhandled POST mock' });
            };
        });

        // --- 2. Login and Navigate ---
        await login(page, USER_A.privateKey);
        await expect(page.getByRole('button', { name: 'PvP Ranqueado' })).toBeVisible();
        await page.getByRole('button', { name: 'PvP Ranqueado' }).click();
        await page.waitForURL('**/#PvpScene');
        await expect(page.getByText('PvP 1v1 Ranqueado')).toBeVisible();

        // --- 3. Select Hero and Enter Queue ---
        await page.getByText('Ninja (Lvl: 1)').click();
        await expect(page.getByRole('button', { name: 'Entrar na Fila (Taxa: 10 BCOIN)' })).toBeVisible();

        // Mock the on-chain calls
        await page.evaluate(() => {
            window.web3.eth.Contract = class MockContract {
                constructor(abi, address) {
                    this.methods = {};
                    const funcs = abi.filter(item => item.type === 'function');
                    funcs.forEach(func => {
                        this.methods[func.name] = (...args) => ({
                            send: async ({ from }) => {
                                console.log(`Mocked contract call: ${func.name} from ${from} with args`, args);
                                if (func.name === 'enterRankedMatch') {
                                    return { transactionHash: '0x' + 'a'.repeat(64) };
                                }
                                return { status: 1 };
                            }
                        });
                    });
                }
            };
        });

        await page.getByRole('button', { name: 'Entrar na Fila (Taxa: 10 BCOIN)' }).click();

        // --- 4. Verify Matchmaking Flow ---
        await expect(page.getByText('Você está na fila! Procurando oponente...')).toBeVisible({ timeout: 10000 });

        // Wait for the matchmaking status to find an opponent and transition to game scene
        await page.waitForURL('**/#GameScene', { timeout: 20000 });
        await expect(page.getByText("VS")).toBeVisible();
        console.log("Successfully entered GameScene for PvP match.");

        // --- 5. Simulate Win and Verify Outcome ---
        // In a real test, we would interact with the game to win.
        // Here, we'll directly call the function that the game calls on match end.
        // This function will in turn use our mocked window.api.post
        await page.evaluate(async () => {
            const game = window.game.scene.getScene('GameScene');
            game.endMatch({ winner: 'player' });
        });

        // Final verification: Check for the reward message popup from the Game Over scene
        await page.waitForURL('**/#GameOverScene');
        await expect(page.getByText(/Você ganhou 55 XP para o herói/)).toBeVisible();
        await expect(page.getByText(/\(Bônus de Domingo de \+10% aplicado!\)/)).toBeVisible();

        console.log("Test completed successfully: Full PvP flow with Sunday bonus validated.");
    });
});