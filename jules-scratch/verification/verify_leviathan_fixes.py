import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    # --- Setup ---
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console logs for debugging
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

    # --- Test Logic ---
    try:
        # Mock the backend session check to simulate a logged-in user
        def handle_route(route):
            print(f"Intercepted request: {route.request.url}")
            if "/api/auth/me" in route.request.url:
                print("--> Mocking /api/auth/me")
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"success": true, "user": {"id": 1, "address": "0x123", "account_level": 5, "account_xp": 100, "coins": 500, "highest_wave_reached": 10, "heroes": [{"id":1,"hero_type":"mock","level":1,"xp":0,"hp":2100,"maxHp":2100,"damage":1,"speed":200,"extraLives":1,"fireRate":600,"bombSize":1,"multiShot":0,"status":"in_wallet","sprite_name":"ninja"}]}}'
                )
            elif "/api/contracts" in route.request.url:
                 # Let the contracts request go through to the real backend
                 print("--> Letting /api/contracts pass through")
                 route.continue_()
            else:
                route.continue_()

        page.route(re.compile(r"http://localhost:3000/api/.*"), handle_route)

        # Go to the base URL to establish a security context
        page.goto("http://localhost:5173")

        # Now that we are on a valid domain, set the token in localStorage
        page.evaluate("localStorage.setItem('jwtToken', 'dummy_token')")

        # Reload the page to ensure the loading scene uses the token
        page.reload()

        # 1. Wait for the MenuScene to load by finding the "SOLO" button
        # This implicitly verifies that the LoadingScene completed successfully (LP-01 fix)
        solo_button = page.locator('text="SOLO"')
        expect(solo_button).to_be_visible(timeout=15000)
        print("✅ MenuScene loaded successfully.")

        # 2. Click the "SOLO" button to start the game
        solo_button.click()

        # 3. Wait for the GameScene to be ready by checking for the player
        # The player sprite is an image, we can find it by its texture key in the canvas
        # A simpler way is to wait for the HUD to be visible
        expect(page.locator('text=/HP:/')).to_be_visible(timeout=10000)
        print("✅ GameScene loaded successfully.")

        # 4. Press the Escape key to pause the game
        page.keyboard.press("Escape")
        print("⌨️ Pressed Escape to pause.")

        # 5. Verify the PauseScene is visible
        continue_button = page.locator('text="CONTINUAR"')
        expect(continue_button).to_be_visible(timeout=5000)
        print("✅ PauseScene is visible.")

        # 6. Take a screenshot of the pause menu
        page.screenshot(path="jules-scratch/verification/leviathan_fix_verification_1_paused.png")
        print("📸 Screenshot 1: Pause menu captured.")

        # 7. Click the "CONTINUAR" button to resume
        continue_button.click()
        print("🖱️ Clicked 'CONTINUAR'.")

        # 8. Verify the game has resumed (the pause menu is gone)
        expect(continue_button).not_to_be_visible(timeout=5000)
        print("✅ PauseScene is hidden. Game resumed.")

        # 9. Take a final screenshot to show the game running again
        page.screenshot(path="jules-scratch/verification/leviathan_fix_verification_2_resumed.png")
        print("📸 Screenshot 2: Game resumed captured.")

    except Exception as e:
        print(f"❌ An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        # --- Teardown ---
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)