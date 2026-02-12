const { expect } = require('@playwright/test');
const { SiweMessage } = require('siwe');
const { Wallet } = require('ethers');

// --- Contract Addresses ---
// These should match the addresses in your Hardhat deployment or .env file
const BCOIN_CONTRACT = '0xb8B71994A25F816d5b3232f24Ce5ea0135cf3106';
const TOURNAMENT_CONTROLLER_CONTRACT =
  '0x6ff88C9b5ac4A1551e7d095c546B4f090d0DFB8F';

/**
 * Injects a mock wallet into the page based on a private key.
 * This runs before the page loads to ensure window.ethereum is available.
 * @param {import('@playwright/test').Page} page - The Playwright page object.
 * @param {string} privateKey - The private key for the mock wallet.
 */
async function setupWallet(page, privateKey) {
  const wallet = new Wallet(privateKey);
  const address = await wallet.getAddress();

  await page.addInitScript(
    (injected) => {
      let isConnected = false;
      const events = new Map();

      window.ethereum = {
        isMetaMask: true,
        isConnected: () => isConnected,
        request: async (request) => {
          if (
            request.method === 'eth_requestAccounts' ||
            request.method === 'eth_accounts'
          ) {
            isConnected = true;
            return [injected.address];
          }
          if (request.method === 'personal_sign') {
            const message = request.params[0];
            const signature = await injected.wallet.signMessage(message);
            return signature;
          }
          if (request.method === 'eth_chainId') {
            return '0x7a69'; // Hardhat chain ID
          }
          throw new Error(
            `Mock wallet does not support method: ${request.method}`
          );
        },
        on: (event, listener) => {
          if (!events.has(event)) events.set(event, []);
          events.get(event).push(listener);
        },
        removeListener: (event, listener) => {
          if (events.has(event)) {
            const listeners = events.get(event);
            const index = listeners.indexOf(listener);
            if (index !== -1) listeners.splice(index, 1);
          }
        },
      };
    },
    { wallet, address }
  );
}

/**
 * Executes the full SIWE login flow.
 * @param {import('@playwright/test').Page} page - The Playwright page object.
 * @param {string} privateKey - The private key for the user logging in.
 */
async function login(page, privateKey) {
  const wallet = new Wallet(privateKey);
  const address = await wallet.getAddress();

  // Mock the API calls for nonce and verification
  await page.route('**/api/auth/nonce', (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({ success: true, nonce: 'a_mock_nonce_12345' }),
    })
  );
  await page.route('**/api/auth/verify', (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({ success: true, token: 'mock-jwt-token' }),
    })
  );

  // Start the login process
  await page.getByRole('button', { name: 'Login com Web3' }).click();

  // The page will now interact with our mocked window.ethereum
  // Wait for the main menu scene to be visible as a sign of successful login
  await expect(page.getByRole('button', { name: 'PvP Ranqueado' })).toBeVisible(
    { timeout: 10000 }
  );
  console.log(`Successfully logged in as ${address}`);
}

/**
 * Helper to get the Phaser game instance from the window.
 * @param {import('@playwright/test').Page} page - The Playwright page object.
 * @returns {Promise<any>} The Phaser game instance.
 */
async function getGame(page) {
  return await page.evaluate(() => window.game);
}

/**
 * Waits for a specific Phaser scene to become active.
 * @param {import('@playwright/test').Page} page - The Playwright page object.
 * @param {string} sceneKey - The key of the scene to wait for.
 * @param {number} [timeout=10000] - The maximum time to wait in milliseconds.
 */
async function waitForScene(page, sceneKey, timeout = 10000) {
  await page.waitForFunction(
    (key) => window.game?.scene.getScene(key)?.scene.isActive(),
    sceneKey,
    { timeout }
  );
}

/**
 * Finds a game object by its 'name' property within a specific scene and emits an event on it.
 * @param {import('@playwright/test').Page} page - The Playwright page object.
 * @param {string} sceneKey - The key of the scene containing the game object.
 * @param {string} gameObjectName - The name of the game object to find.
 * @param {string} eventName - The name of the event to emit (e.g., 'pointerdown').
 */
async function triggerGameObjectEvent(
  page,
  sceneKey,
  gameObjectName,
  eventName
) {
  await page.evaluate(
    ({ sceneKey, gameObjectName, eventName }) => {
      const scene = window.game.scene.getScene(sceneKey);
      if (!scene) throw new Error(`Scene with key "${sceneKey}" not found.`);

      // Search recursively in containers
      const findInChildren = (children) => {
        for (const child of children) {
          if (child.name === gameObjectName) {
            return child;
          }
          if (child.list) {
            const found = findInChildren(child.list);
            if (found) return found;
          }
        }
        return null;
      };

      const gameObject = findInChildren(scene.children.list);
      if (!gameObject)
        throw new Error(
          `Game object with name "${gameObjectName}" not found in scene "${sceneKey}".`
        );

      gameObject.emit(eventName);
    },
    { sceneKey, gameObjectName, eventName }
  );
}

module.exports = {
  setupWallet,
  login,
  getGame,
  waitForScene,
  triggerGameObjectEvent,
  BCOIN_CONTRACT,
  TOURNAMENT_CONTROLLER_CONTRACT,
};
