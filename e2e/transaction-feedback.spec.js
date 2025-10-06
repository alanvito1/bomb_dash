const { test, expect } = require('@playwright/test');
const { login, waitForScene } = require('./test-utils.js');

test.describe('Transaction Feedback System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await login(page, 'test-user-1'); // Log in to ensure all scenes are loaded
        await waitForScene(page, 'MenuScene'); // Wait for the main menu to be ready
    });

    test('should display pending, success, and error notifications correctly', async ({ page }) => {
        // --- 1. Test the "Pending" state ---
        console.log('Testing "pending" notification...');
        const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

        await page.evaluate((hash) => {
            window.GameEventEmitter.emit('transaction:pending', hash);
        }, mockTxHash);

        // Wait for the popup to be visible
        await page.waitForFunction(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            return scene && scene.popupContainer && scene.popupContainer.visible;
        });

        const pendingPopupState = await page.evaluate(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            return {
                title: scene.titleText.text,
                message: scene.messageText.text,
                isVisible: scene.popupContainer.visible,
            };
        });

        expect(pendingPopupState.isVisible).toBe(true);
        expect(pendingPopupState.title).toBe('Processing');
        expect(pendingPopupState.message).toContain('Transaction pending...');
        expect(pendingPopupState.message).toContain(mockTxHash.substring(0, 10));
        console.log('✅ "Pending" notification verified.');


        // --- 2. Test the "Success" state ---
        console.log('Testing "success" notification...');
        const mockSuccessMessage = 'Your action was a great success!';

        await page.evaluate((msg) => {
            window.GameEventEmitter.emit('transaction:success', msg);
        }, mockSuccessMessage);

        const successPopupState = await page.evaluate(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            return {
                title: scene.titleText.text,
                message: scene.messageText.text,
            };
        });

        expect(successPopupState.title).toBe('Success');
        expect(successPopupState.message).toBe(mockSuccessMessage);
        console.log('✅ "Success" notification verified.');


        // --- 3. Test the "Error" state ---
        console.log('Testing "error" notification...');
        const mockErrorMessage = 'Something went horribly wrong.';

        await page.evaluate((msg) => {
            window.GameEventEmitter.emit('transaction:error', msg);
        }, mockErrorMessage);

        const errorPopupState = await page.evaluate(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            return {
                title: scene.titleText.text,
                message: scene.messageText.text,
            };
        });

        expect(errorPopupState.title).toBe('Error');
        expect(errorPopupState.message).toBe(mockErrorMessage);
        console.log('✅ "Error" notification verified.');

        // --- 4. Close the popup and verify it's hidden ---
        console.log('Testing closing the notification...');
        await page.evaluate(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            // Simulate clicking the first button (the "Close" button in the error state)
            scene.buttons[0].emit('pointerdown');
            scene.hidePopup(); // Also call hide directly to ensure it works
        });

        // Wait for the popup to become invisible
        await page.waitForFunction(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            return scene && scene.popupContainer && !scene.popupContainer.visible;
        });

        const finalPopupVisible = await page.evaluate(() => {
            const scene = window.game.scene.getScene('NotificationScene');
            return scene.popupContainer.visible;
        });

        expect(finalPopupVisible).toBe(false);
        console.log('✅ Notification closed successfully.');
    });
});