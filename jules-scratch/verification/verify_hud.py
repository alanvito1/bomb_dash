import re
from playwright.sync_api import sync_playwright, Page, expect
import time

def click_phaser_button(page: Page, button_name: str):
    """Helper function to click a button in a Phaser scene using page.evaluate()."""
    print(f"Attempting to click Phaser button: {button_name}")
    page.evaluate(
        """(buttonName) => {
            const scenes = window.game.scene.getScenes(true);
            for (const scene of scenes) {
                const button = scene.children.list.find(
                    (child) => child.text === buttonName && typeof child.emit === 'function'
                );
                if (button) {
                    console.log(`Found button "${buttonName}" in scene:`, scene.scene.key);
                    // The scene listens for 'pointerdown', not 'pointerup'. This was the bug.
                    button.emit('pointerdown');
                    return;
                }
            }
            throw new Error(`Phaser button "${buttonName}" not found in any active scene.`);
        }""",
        button_name,
    )
    print(f"Successfully clicked Phaser button: {button_name}")

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture and print console messages from the browser to aid in debugging
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

    # Increase timeout for the entire test
    page.set_default_timeout(30000)

    try:
        # Navigate to the game
        page.goto("http://localhost:5173", wait_until="load")

        # Wait for the game instance to be available on the window object
        page.wait_for_function("window.game && window.game.isBooted", timeout=20000)
        print("Phaser game has booted.")

        # Wait for the AuthChoiceScene to become active before trying to interact with it
        page.wait_for_function("window.game.scene.isActive('AuthChoiceScene')", timeout=15000)
        print("AuthChoiceScene is active.")

        # --- Definitive Mocking Strategy ---
        # 1. Mock the client-side JS function that checks for the wallet, preventing the "MetaMask not detected" error.
        page.evaluate("""
            window.api.web3Login = async () => {
                console.log('Mocked window.api.web3Login called.');
                localStorage.setItem('jwt_token', 'dummy-test-token-for-jules');
                // This simulates a successful login without any actual web3 interaction.
                return { success: true };
            };
        """)
        print("JavaScript function window.api.web3Login has been mocked.")

        # 2. Mock the backend API calls that the application will make after the initial login.
        page.route("**/api/auth/me", lambda route, request: route.fulfill(
            status=200,
            json={
                "success": True,
                "user": {
                    "id": 1, "address": "0xMockAddress", "account_level": 5, "account_xp": 1550,
                    "coins": 500, "highest_wave_reached": 10, "heroes": []
                }
            }
        ))
        page.route("**/api/heroes", lambda route, request: route.fulfill(
            status=200,
            json={
                "success": True,
                "heroes": [
                    {"id": 1, "name": "Ninja", "sprite_name": "ninja", "hp": 100, "damage": 1, "speed": 200, "hero_type": "mock", "xp": 0, "level": 1},
                    {"id": 2, "name": "Witch", "sprite_name": "witch", "hp": 80, "damage": 2, "speed": 180, "hero_type": "mock", "xp": 0, "level": 1}
                ]
            }
        ))
        print("Backend API endpoints /api/auth/me and /api/heroes have been mocked.")

        # Click the login button using the Phaser-specific helper
        click_phaser_button(page, "Web3 Login")

        # Wait for the MenuScene to become active
        page.wait_for_function("window.game.scene.isActive('MenuScene')", timeout=15000)
        print("MenuScene is active.")
        time.sleep(1) # Small delay to ensure scene is fully interactive

        # Navigate through the menus, using the correct button text with the icon
        click_phaser_button(page, "👤 SOLO")
        page.wait_for_function("window.game.scene.isActive('CharacterSelectionScene')", timeout=10000)
        print("CharacterSelectionScene is active.")
        time.sleep(1)

        # In CharacterSelectionScene, select the first hero
        page.evaluate("""
            const scene = window.game.scene.getScene('CharacterSelectionScene');
            if (scene && scene.heroCards && scene.heroCards.length > 0) {
                scene.selectHero(scene.heroCards[0].hero);
            } else {
                throw new Error('Hero cards not found in CharacterSelectionScene.');
            }
        """)
        print("First hero selected.")
        time.sleep(0.5)

        # The button text is "Start Game", not "SELECT".
        click_phaser_button(page, "Start Game")

        # Wait for the GameScene and HUDScene to be active
        page.wait_for_function("window.game.scene.isActive('GameScene') && window.game.scene.isActive('HUDScene')", timeout=10000)
        print("GameScene and HUDScene are active.")

        # Wait a moment for the HUD to be fully rendered with data from the API call in GameScene
        time.sleep(2)

        # Take the final screenshot
        page.screenshot(path="jules-scratch/verification/hud_verification.png")
        print("Screenshot saved to jules-scratch/verification/hud_verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        print("Error screenshot saved to jules-scratch/verification/error_screenshot.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)