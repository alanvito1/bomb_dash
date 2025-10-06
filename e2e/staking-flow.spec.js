const { test, expect } = require('@playwright/test');
const { login, setupWallet } = require('./test-utils');
const { Wallet } = require('ethers');

// --- Test User ---
const USER_WITH_NFT = {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat account 1
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
};

// --- Contract Addresses (should match your deployment) ---
// Note: These would typically be loaded from a shared config or .env file
const HERO_STAKING_ADDRESS = process.env.HERO_STAKING_ADDRESS || '0x9A9f2CCa3556499352751C54e1955120d6594A49';
const MOCK_HERO_NFT_ADDRESS = process.env.MOCK_HERO_NFT_ADDRESS || '0x09635F643e140090A9A8D5F77053692B45011B18';


test.describe('NFT Hero Staking Flow', () => {

    test('should allow a user to approve and deposit an NFT hero to play', async ({ page }) => {
        // --- 1. Setup and Mocking ---
        await page.goto('/');
        await setupWallet(page, USER_WITH_NFT.privateKey);

        // Add a listener for debugging
        page.on('console', msg => console.log(`BROWSER LOG: [${msg.type()}] ${msg.text()}`));

        // --- Mock API Responses ---
        let heroStaked = false;
        await page.route('**/api/heroes', route => {
            const hero = {
                id: 101,
                user_id: 2,
                hero_type: 'nft',
                nft_id: 77,
                level: 5,
                xp: 1200,
                hp: 150,
                maxHp: 150,
                damage: 8,
                speed: 220,
                sprite_name: 'ninja_hero',
                name: 'NFT Ninja',
                // The status is the key part of this mock
                status: heroStaked ? 'staked' : 'in_wallet'
            };
            console.log(`MOCK API: /api/heroes called. Responding with hero status: ${hero.status}`);
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, heroes: [hero] })
            });
        });

        // --- 2. Login and Navigate ---
        await login(page, USER_WITH_NFT.privateKey);
        await expect(page.getByRole('button', { name: 'Modo Aventura' })).toBeVisible();
        await page.getByRole('button', { name: 'Modo Aventura' }).click();
        await page.waitForURL('**/#CharacterSelectionScene');
        await expect(page.getByText('Escolha seu Herói')).toBeVisible();

        // --- 3. Interact with Unstaked Hero ---
        const heroCard = page.locator('.container', { hasText: 'NFT Ninja' });
        await expect(heroCard.getByText('Status: In Wallet')).toBeVisible();

        const depositButton = heroCard.getByRole('button', { name: 'Deposit to Play' });
        await expect(depositButton).toBeVisible();

        // --- 4. Mock Contract Calls and Execute Deposit ---
        await page.evaluate(async (addresses) => {
            // This is a simplified mock of the ethers.js Contract class
            // It intercepts the `send` method to simulate transaction success
            const mockContract = {
                setApprovalForAll: () => ({
                    send: async () => {
                        console.log('MOCK Contract: setApprovalForAll called and resolved.');
                        return { transactionHash: '0x' + 'b'.repeat(64), wait: async () => console.log('Approval TX waited') };
                    },
                    estimateGas: async () => 100000n,
                }),
                depositHero: () => ({
                     send: async () => {
                        console.log('MOCK Contract: depositHero called and resolved.');
                        return { transactionHash: '0x' + 'c'.repeat(64), wait: async () => console.log('Deposit TX waited') };
                    },
                    estimateGas: async () => 100000n,
                }),
                 isApprovedForAll: async () => {
                    console.log('MOCK Contract: isApprovedForAll returning false');
                    return false;
                }
            };

            // We can't easily mock the real ethers, so we mock the service that uses it
            window.stakingService.approve = async () => {
                console.log('MOCK STAKING SERVICE: approve()');
                const tx = { wait: async () => { console.log("Mock approve tx mined"); return { status: 1 }; } };
                return Promise.resolve(tx);
            };
            window.stakingService.depositHero = async (tokenId) => {
                 console.log(`MOCK STAKING SERVICE: depositHero(${tokenId})`);
                 const tx = { wait: async () => { console.log("Mock deposit tx mined"); return { status: 1 }; } };
                 return Promise.resolve(tx);
            };
             window.stakingService.isApproved = async () => {
                console.log('MOCK STAKING SERVICE: isApproved() -> false');
                return Promise.resolve(false);
            };

        }, { HERO_STAKING_ADDRESS, MOCK_HERO_NFT_ADDRESS });


        await depositButton.click();

        // --- 5. Verify UI Changes and Success Popup ---
        await expect(heroCard.getByText('APPROVING...')).toBeVisible({ timeout: 5000 });
        await expect(heroCard.getByText('DEPOSITING...')).toBeVisible({ timeout: 10000 });

        await expect(page.getByText('Success!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/has been staked and is ready/)).toBeVisible();

        // --- 6. Close Popup, Let Scene Reload, and Verify Final State ---
        heroStaked = true; // Set the flag for the next API mock response

        await page.getByRole('button', { name: 'OK' }).click();

        // After the scene reloads, the API will be called again, this time returning 'staked'
        await expect(heroCard.getByText('Status: Staked')).toBeVisible({ timeout: 10000 });

        // The "Level Up" button should now be visible instead of the deposit button
        await expect(heroCard.getByRole('button', { name: 'LEVEL UP' })).toBeVisible();
        await expect(depositButton).not.toBeVisible();

        // The main "Start Game" button should be enabled
        const playButton = page.getByRole('button', { name: 'Start Game' });
        await expect(playButton).toBeEnabled();

        // --- 7. Start Game with Staked Hero ---
        await playButton.click();
        await page.waitForURL('**/#GameScene');
        await expect(page.locator('canvas')).toBeVisible(); // Basic check for game scene
        console.log('Successfully started game with staked hero.');
    });
});