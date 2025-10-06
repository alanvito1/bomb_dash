import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    """
    This script verifies the main menu by mocking all external dependencies
    (session, i18n, and assets) to ensure the application can reliably
    navigate to the MenuScene for a screenshot.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        # Mock the session check endpoint
        await page.route("**/api/auth/me", lambda route: route.fulfill(
            status=200,
            json={
                "success": True,
                "user": {
                    "id": 1,
                    "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                    "account_level": 1, "account_xp": 0, "coins": 1234.56,
                    "highest_wave_reached": 5, "heroes": []
                }
            }
        ))

        # Mock language files to prevent network hangs
        await page.route("**/src/locales/*.json", lambda route: route.fulfill(
            status=200,
            json={"game_title": "Bomb Dash", "loading_initializing": "Initializing..."}
        ))

        # Mock the asset manifest to prevent the loader from hanging on network requests
        await page.route("**/src/config/asset-manifest.json", lambda route: route.fulfill(
            status=200,
            # Providing a minimal, valid manifest is enough to get past the loading screen
            json={"assets": {"ui": {}, "backgrounds": {}}, "sounds": {}}
        ))

        # 1. Go to the page first
        print("Navigating to the application...")
        await page.goto("http://localhost:5173", wait_until="domcontentloaded")

        # 2. Inject the JWT into localStorage
        print("Injecting dummy JWT into localStorage...")
        await page.evaluate("localStorage.setItem('jwt', 'dummy-test-jwt')")

        # 3. Reload the page to trigger the app's auto-login logic
        print("Reloading the page...")
        await page.reload(wait_until="networkidle")

        # 4. Wait for a unique element in the MenuScene to appear
        print("Waiting for the Menu Scene to load...")
        settings_button_locator = page.get_by_role("button", name="Settings")
        await expect(settings_button_locator).to_be_visible(timeout=20000)

        print("Menu scene loaded successfully. Taking screenshot...")
        screenshot_path = "jules-scratch/verification/main-menu.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())