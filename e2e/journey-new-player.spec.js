const { test, expect } = require('@playwright/test');
const { setupWallet, login, getGame } = require('./test-utils.js');
const { Wallet } = require('ethers');

test.describe.skip('E2E: New Player Journey', () => {
    let page;
    const newPlayerWallet = Wallet.createRandom();

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await setupWallet(page, newPlayerWallet.privateKey);
        await page.goto('/');
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('should allow a new user to accept terms, login, play a game, and see updated XP', async () => {
        // Step 1: Onboarding - Accept Terms
        await page.evaluate(() => {
            const termsContainer = document.querySelector('.terms-container');
            termsContainer.scrollTop = termsContainer.scrollHeight;
        });
        await page.getByRole('button', { name: 'Aceito os termos' }).click();

        // Step 2: Authentication (Mocked)
        await login(page, newPlayerWallet.privateKey);
        await expect(page.getByText('MENU PRINCIPAL')).toBeVisible();

        // Step 3: Navigate to Inventory and select Mock Hero
        await page.getByRole('button', { name: 'Heróis' }).click();
        await expect(page.getByText('INVENTÁRIO E PROGRESSÃO')).toBeVisible();

        // Verify mock hero is present
        await expect(page.getByText('Ninja')).toBeVisible();

        // Select the hero
        await page.getByText('Ninja').click();
        await page.getByRole('button', { name: 'Selecionar Herói' }).click();
        await expect(page.getByText('Herói selecionado!')).toBeVisible();
        await page.getByRole('button', { name: 'Voltar' }).click();

        // Step 4: Play a Solo Game
        await expect(page.getByText('MENU PRINCIPAL')).toBeVisible();
        await page.getByRole('button', { name: 'Modo Solo' }).click();

        // Wait for game scene to load
        await expect(page.getByText('SOBREVIVA!')).toBeVisible({ timeout: 15000 });

        // Simulate gameplay by directly setting the score, then end the game.
        // This is more reliable than trying to simulate actual enemy kills.
        console.log('Simulating gameplay and setting score...');
        await page.evaluate(async () => {
            const game = window.game;
            const gameScene = game.scene.getScene('GameScene');
            gameScene.score = 150; // Directly set a score to ensure XP is awarded.
            gameScene.handleGameOver();
        });

        // Wait for GameOver scene and get XP
        await expect(page.getByText('FIM DE JOGO')).toBeVisible({ timeout: 10000 });
        const xpEarnedText = await page.locator('text=/XP Ganho:/').textContent();
        const xpEarned = parseInt(xpEarnedText.split(':')[1].trim(), 10);
        expect(xpEarned).toBeGreaterThan(0);

        await page.getByRole('button', { name: 'Menu Principal' }).click();

        // Step 5: Verify Progress
        await expect(page.getByText('MENU PRINCIPAL')).toBeVisible();
        await page.getByRole('button', { name: 'Heróis' }).click();
        await expect(page.getByText('INVENTÁRIO E PROGRESSÃO')).toBeVisible();

        // Check Account XP update
        const accountXpText = await page.locator('text=/XP da Conta:/').textContent();
        const accountXp = parseInt(accountXpText.split(':')[1].trim().split('/')[0], 10);
        expect(accountXp).toBe(xpEarned);

        // Check Hero XP update
        const heroXpText = await page.locator('text=/XP do Herói:/').textContent();
        const heroXp = parseInt(heroXpText.split(':')[1].trim().split('/')[0], 10);
        expect(heroXp).toBe(xpEarned);

        console.log('XP verification successful!');
    });
});