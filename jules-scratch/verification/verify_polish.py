import time
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    """
    This script verifies the visual polish of the Altar and Profile scenes.
    """
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the game
        page.goto("http://localhost:5174/", timeout=30000)

        # Wait for the game to signal it's ready AND i18n has loaded.
        # We give it a generous wait time for assets to load.
        page.wait_for_function("() => window.game && window.i18nReady", timeout=30000)
        print("Game instance and i18n are ready.")

        # It usually lands on AuthChoiceScene, let's navigate to MenuScene to start
        # This needs to be evaluated *after* i18n is ready, otherwise the menu text will be keys.
        page.evaluate("() => window.game.scene.getScene('AuthChoiceScene').scene.start('MenuScene')")
        print("Navigated to MenuScene.")

        # Give the scene a moment to transition and render
        time.sleep(1)

        # --- Verify Altar Scene ---
        print("Navigating to AltarScene...")
        # Directly trigger the scene change, which is more robust for testing.
        page.evaluate("() => window.game.scene.getScene('MenuScene').scene.start('AltarScene')")
        page.wait_for_function("() => window.game.scene.isActive('AltarScene')")
        print("Successfully navigated to AltarScene.")
        page.screenshot(path="jules-scratch/verification/altar_scene_polish.png")
        print("Screenshot of AltarScene taken.")

        # --- Go Back and Verify Profile Scene ---
        print("Navigating back to MenuScene, then to ProfileScene...")
        page.evaluate("() => window.game.scene.getScene('AltarScene').scene.start('MenuScene')")
        page.wait_for_function("() => window.game.scene.isActive('MenuScene')")
        print("Navigated back to MenuScene.")

        page.evaluate("() => window.game.scene.getScene('MenuScene').scene.start('ProfileScene')")
        page.wait_for_function("() => window.game.scene.isActive('ProfileScene')")
        print("Successfully navigated to ProfileScene.")
        page.screenshot(path="jules-scratch/verification/profile_scene_polish.png")
        print("Screenshot of ProfileScene taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Save a screenshot for debugging if something went wrong
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        # Clean up
        context.close()
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run_verification(playwright)