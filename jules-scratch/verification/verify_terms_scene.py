import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # 1. Navigate to the app
            await page.goto("http://localhost:5173", timeout=60000)

            # 2. Wait for the game and scene to be ready
            await page.wait_for_function("window.game && window.i18nReady", timeout=15000)
            await page.wait_for_function("window.game.scene.isActive('TermsScene')", timeout=5000)

            print("TermsScene is active. Verifying initial state...")

            # 3. Verify the button is initially disabled
            initial_alpha = await page.evaluate("window.game.scene.getScene('TermsScene').acceptButton.alpha")
            assert initial_alpha < 1, f"Button should be disabled initially, but alpha was {initial_alpha}"
            print("Initial state verified: Button is disabled.")

            # 4. Simulate scrolling to the bottom
            print("Simulating scroll to the bottom...")
            await page.evaluate("""
                const scene = window.game.scene.getScene('TermsScene');
                const textObject = scene.termsTextObject;
                const scrollableAreaHeight = scene.scrollableAreaHeight;
                const maxScroll = Math.max(0, textObject.height - (scrollableAreaHeight - 20));
                textObject.y = -maxScroll;
                scene.input.emit('wheel', null, null, 0, 1);
            """)

            # 5. Wait for the button to be enabled (alpha becomes 1)
            await page.wait_for_function("window.game.scene.getScene('TermsScene').acceptButton.alpha === 1", timeout=5000)
            print("Button is now enabled.")

            # 6. Take a screenshot of the final state (button enabled)
            screenshot_path = "jules-scratch/verification/verification.png"
            await page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())