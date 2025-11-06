// e2e/tournament-flow.spec.js
const { test, expect } = require('@playwright/test');
const { login, setupTestPlayer, mockContracts, mockApi } = require('./test-utils');

test.describe('Multi-Player Tournament Flow', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        await mockContracts(page);
        await page.goto('/');
    });

    test('should allow a player to navigate to the tournament lobby', async ({ page }) => {
        await login(page, 'test_wallet_tournaments');

        // Wait for the MenuScene to be active
        await page.waitForFunction(() => window.game.scene.isActive('MenuScene'));

        // Click the "Tournaments" button
        await page.evaluate(() => {
            const menuScene = window.game.scene.getScene('MenuScene');
            const tournamentsButton = menuScene.children.list.find(c => c.name === 'tournament_button');
            tournamentsButton.emit('pointerdown');
        });

        // Wait for the TournamentLobbyScene to be active
        await page.waitForFunction(() => window.game.scene.isActive('TournamentLobbyScene'));

        const isLobbyActive = await page.evaluate(() => window.game.scene.getScene('TournamentLobbyScene').scene.isActive());
        expect(isLobbyActive).toBe(true);
    });

    // TODO: Add tests for creating a tournament
    // TODO: Add tests for joining a tournament
    // TODO: Add tests for viewing the tournament bracket
});
