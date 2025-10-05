from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the game
        page.goto("http://localhost:5173", wait_until="domcontentloaded")

        # Wait for the game to be ready by looking for the canvas
        canvas = page.locator("canvas")
        expect(canvas).to_be_visible(timeout=30000)

        # 1. Mock the login and initial state
        page.evaluate("""() => {
            // Mock a successful login
            window.api.web3Login = async () => ({ success: true, token: 'fake-jwt-token', user: { id: 1, wallet_address: '0x123', account_level: 1, account_xp: 0 } });
            window.api.getHeroes = async () => ({ success: true, heroes: [{ id: 1, xp: 0, level: 1, sprite_name: 'ninja' }] });

            // Set registry to simulate logged-in state
            window.game.registry.set('user', { id: 1, wallet_address: '0x123' });
            window.game.registry.set('selectedHero', { id: 1, xp: 0, level: 1 });
            window.game.registry.set('isLoggedIn', true);

            // Mock the service's update function to emit the event the HUD listens to
            window.bcoinService.updateBalance = async () => {
                window.GameEventEmitter.emit('bcoin-balance-update', { balance: '100.00', error: null });
            };
        }""")

        # Start the menu scene, which will eventually create the HUD and trigger the initial balance update
        page.evaluate("() => window.game.scene.start('MenuScene')")

        # Wait for HUD to appear and display the initial balance
        page.wait_for_function("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            return hud && hud.bcoinText && hud.bcoinText.text.includes('100.00');
        }""", timeout=10000)

        print("Initial balance verified.")

        # 2. Re-mock the updateBalance function for the next update
        page.evaluate("""() => {
            window.bcoinService.updateBalance = async () => {
                window.GameEventEmitter.emit('bcoin-balance-update', { balance: '99.00', error: null });
            };
        }""")

        # 3. Simulate a transaction by emitting the 'changed' event, which triggers the 'updateBalance' mock
        print("Simulating transaction by emitting event...")
        page.evaluate("() => window.GameEventEmitter.emit('bcoin-balance-changed')")

        # 4. Verify the HUD has updated to the new balance
        page.wait_for_function("""() => {
            const hud = window.game.scene.getScene('HUDScene');
            return hud && hud.bcoinText && hud.bcoinText.text.includes('99.00');
        }""", timeout=10000)

        print("Updated balance verified.")

        # Take a screenshot for visual confirmation
        page.screenshot(path="jules-scratch/verification/bcoin_balance_verification.png")
        print("Screenshot captured.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Save screenshot on error for debugging
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)