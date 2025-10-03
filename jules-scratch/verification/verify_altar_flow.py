import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Step 1: Navigate to the app
        page.goto("http://localhost:5173/")

        # Step 2: Wait for the game to load past the initial asset loading screen.
        # We'll wait for the "Web3 Login" button on the AuthChoiceScene, which I've fixed.
        # This confirms that the Phaser game instance is ready.
        expect(page.get_by_role("button", name="Web3 Login")).to_be_visible(timeout=20000)

        # Step 3: Now that the game is loaded, we can directly transition to the MenuScene
        # to test the new Altar button.
        page.evaluate("window.game.scene.start('MenuScene')")

        # Step 4: Find and click the "ALTAR" button on the menu.
        altar_button = page.get_by_role("button", name="ALTAR")
        expect(altar_button).to_be_visible(timeout=10000)
        altar_button.click()

        # Step 5: Verify we are in the AltarScene by checking its title.
        altar_title = page.get_by_text("Altar of Global Buffs", exact=True)
        expect(altar_title).to_be_visible(timeout=10000)

        # Also verify the donation progress text is visible
        expect(page.get_by_text("Community Goal:")).to_be_visible()

        # Step 6: Take a screenshot for visual verification.
        page.screenshot(path="jules-scratch/verification/altar_scene_verification.png")
        print("Screenshot saved to jules-scratch/verification/altar_scene_verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        print("Error screenshot saved to jules-scratch/verification/error_screenshot.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)