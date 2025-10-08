import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        try:
            print("Waiting for server to start...")
            await asyncio.sleep(8)

            print("Navigating to the application...")
            await page.goto("http://localhost:5173", wait_until="load", timeout=60000)

            await page.wait_for_function("!!window.game && window.i18nReady === true", timeout=20000)
            print("Game and i18n are ready.")

            # --- Verify TermsScene and Scroll ---
            print("Waiting for TermsScene to finish creating UI...")
            await page.wait_for_function("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                return scene && scene.textObject;
            }""", timeout=15000)
            print("TermsScene UI is ready.")

            # Programmatically scroll to the bottom to activate the button
            await page.evaluate("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                if (!scene.textObject) throw new Error('Terms text object not found.');

                scene.textObject.y = -scene.maxScroll;

                if (typeof scene.checkScrollAndActivate === 'function') {
                    scene.checkScrollAndActivate();
                } else {
                    throw new Error('checkScrollAndActivate function not found.');
                }
            }""")
            print("Scrolled to the bottom of the terms.")
            await asyncio.sleep(1) # Wait for button activation

            # Final verification screenshot
            await page.screenshot(path="jules-scratch/verification/terms_scroll_verification.png")
            print("Verification screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
            raise
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())