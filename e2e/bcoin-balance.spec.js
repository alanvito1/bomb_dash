const { test, expect } = require('@playwright/test');

const TEST_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const MOCKED_BALANCE_STRING = '1000 BCOIN';
// This is the hex representation of 1000 * 10^18
const MOCKED_BALANCE_HEX = '0x0de0b6b3a7640000';

test.describe('E2E: BCOIN Balance Display with Network Mocking', () => {

    test('should display mocked BCOIN balance by intercepting RPC calls', async ({ page }) => {
        // Mock blockchain RPC calls before navigation
        await page.route('**/*', async route => {
            const request = route.request();
            const postData = request.postDataJSON();

            // Guard against requests with no post data
            if (!postData) {
                return route.continue();
            }

            // 1. Mock Wallet Connection (eth_requestAccounts)
            if (postData.method === 'eth_requestAccounts') {
                return route.fulfill({
                    json: {
                        id: postData.id,
                        jsonrpc: '2.0',
                        result: [TEST_ADDRESS],
                    },
                });
            }

            // 2. Mock Balance Call (eth_call for balanceOf)
            // The data for a `balanceOf(address)` call starts with the function selector `0x70a08231`.
            if (postData.method === 'eth_call' && postData.params[0]?.data?.startsWith('0x70a08231')) {
                return route.fulfill({
                    json: {
                        id: postData.id,
                        jsonrpc: '2.0',
                        result: MOCKED_BALANCE_HEX,
                    },
                });
            }

            // Allow other requests to pass through
            return route.continue();
        });

        // Mock the session endpoint to simulate an already authenticated user.
        // This bypasses the need to manually click through the login flow.
        await page.route('/api/auth/me', route => route.fulfill({
            json: {
                success: true,
                user: { id: 1, address: TEST_ADDRESS }
            }
        }));

        // --- Test Execution ---

        // 1. Go to the application's root page.
        await page.goto('/');

        // 2. Wait for the Phaser game instance to be booted and ready.
        await page.waitForFunction(() => window.game?.isBooted, null, { timeout: 15000 });

        // 3. The game's loading sequence, with a mocked session, should automatically
        //    transition to the main menu. We wait for this scene to be active.
        await page.waitForFunction(() => window.game.scene.isActive('MenuScene'), null, { timeout: 10000 });

        // 4. Assert that the UI correctly displays the balance.
        //    The game's UI should process the raw hex value from the mocked RPC call
        //    and format it into a user-friendly string.
        const balanceElement = page.locator(`text=${MOCKED_BALANCE_STRING}`);

        // We expect this element to become visible once the balance is fetched and rendered.
        await expect(balanceElement).toBeVisible({ timeout: 10000 });
    });
});