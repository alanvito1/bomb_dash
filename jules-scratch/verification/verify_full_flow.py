import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        try:
            print("Waiting for servers to start...")
            await asyncio.sleep(10)

            print("Navigating to the application...")
            await page.goto("http://localhost:5173", wait_until="load", timeout=60000)

            await page.wait_for_function("!!window.game && window.i18nReady === true", timeout=20000)
            print("Game and i18n are ready.")

            # --- Step 1: Verify TermsScene and Scroll ---
            print("Waiting for TermsScene to finish creating UI...")
            # Wait for the textObject to be defined on the scene, which happens late in createUI()
            await page.wait_for_function("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                return scene && scene.textObject;
            }""", timeout=15000)
            print("TermsScene UI is ready.")

            # Programmatically scroll to the bottom to activate the button
            await page.evaluate("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                if (!scene.textObject) throw new Error('Terms text object not found.');

                // Use the properties now attached to the scene instance
                scene.textObject.y = -scene.maxScroll;

                if (typeof scene.checkScrollAndActivate === 'function') {
                    scene.checkScrollAndActivate();
                } else {
                    throw new Error('checkScrollAndActivate function not found.');
                }
            }""")
            print("Scrolled to the bottom of the terms.")
            await asyncio.sleep(1) # Wait for button activation
            await page.screenshot(path="jules-scratch/verification/01_terms_scrolled_button_active.png")

            # --- Step 2: Accept Terms and Transition to AuthChoiceScene ---
            print("Clicking the activated accept button...")
            await page.evaluate("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                if (!scene.acceptButton.input.enabled) throw new Error('Accept button is not interactive.');
                scene.acceptButton.emit('pointerdown');
            }""")

            await page.wait_for_function("window.game.scene.isActive('AuthChoiceScene')", timeout=15000)
            print("Successfully transitioned to AuthChoiceScene.")
            await page.screenshot(path="jules-scratch/verification/02_auth_choice_scene.png")

            # --- Step 3: Trigger and Verify Web3Modal ---
            print("Waiting for Connect Wallet button...")
            await page.wait_for_function("""() => {
                const scene = window.game.scene.getScene('AuthChoiceScene');
                const button = scene.children.getByName('web3LoginButton');
                return button && button.active;
            }""", timeout=15000)

            print("Clicking Connect Wallet button...")
            await page.evaluate("""() => {
                const scene = window.game.scene.getScene('AuthChoiceScene');
                scene.children.getByName('web3LoginButton').emit('pointerdown');
            }""")

            print("Waiting for Web3Modal UI...")
            modal = page.locator("w3m-modal")
            await expect(modal).to_be_visible(timeout=15000)

            print("Web3Modal is visible!")
            await asyncio.sleep(2) # Allow modal animation to complete

            await page.screenshot(path="jules-scratch/verification/03_web3modal_visible.png")
            print("Final verification screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
            raise
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())