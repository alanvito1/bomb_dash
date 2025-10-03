import time
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    """
    This script verifies the visual polish of the MenuScene as a
    representative example of the overall UI overhaul.
    """
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the game
        print("Navigating to the application...")
        page.goto("http://localhost:5174/", timeout=30000)

        # Wait for the game to load and for the i18n manager to be ready
        print("Waiting for game and i18n to initialize...")
        page.wait_for_function("() => window.game && window.i18nReady", timeout=30000)
        print("Game instance and i18n are ready.")

        # Navigate from the initial Auth scene to the Menu scene
        print("Navigating to MenuScene...")
        page.evaluate("() => window.game.scene.getScene('AuthChoiceScene').scene.start('MenuScene')")

        # Wait for the MenuScene to be the active scene
        page.wait_for_function("() => window.game.scene.isActive('MenuScene')")
        print("MenuScene is active.")

        # Give a brief moment for any final render updates
        time.sleep(1)

        # Take the screenshot
        screenshot_path = "jules-scratch/verification/final_polish_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        # Clean up
        context.close()
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run_verification(playwright)