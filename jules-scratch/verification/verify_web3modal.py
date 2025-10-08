import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture and print browser console logs for better debugging
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        try:
            # Add a delay to ensure the dev servers are fully ready
            print("Waiting for servers to start...")
            await asyncio.sleep(8)

            # Use 'load' to wait for all resources, and increase the overall timeout
            print("Navigating to the application...")
            await page.goto("http://localhost:5173", wait_until="load", timeout=60000)

            # Wait for the game object and i18n to be available
            await page.wait_for_function("!!window.game && window.i18nReady === true", timeout=20000)
            print("Game and i18n are ready.")

            # --- Navigate through the initial scenes ---
            # 1. Wait for TermsScene to be fully constructed before interacting with it.
            # We do this by waiting for the last element created in its UI: the scroll prompt text.
            print("Waiting for TermsScene to finish creating UI...")
            await page.wait_for_function("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                if (!scene) return false;

                // Recursively search for the scroll prompt text
                const findText = (children) => {
                    for (const child of children) {
                        if (child.type === 'Text' && child.text.includes('Scroll to the end')) {
                            return true;
                        }
                        if (child.list && findText(child.list)) {
                            return true;
                        }
                    }
                    return false;
                };
                return findText(scene.children.list);
            }""", timeout=15000)
            print("TermsScene UI is ready. Activating and clicking accept button...")

            # Now that we know the UI is built, we can safely activate and click the button.
            await page.evaluate("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                scene.activateButton();
                scene.acceptButton.emit('pointerdown');
            }""")

            # 2. Wait for AuthChoiceScene to become active
            await page.wait_for_function("window.game.scene.isActive('AuthChoiceScene')", timeout=15000)
            print("AuthChoiceScene is active.")

            # --- Trigger Web3Modal ---
            # Find the "Connect Wallet" button by its stable name and click it
            await page.wait_for_function("""() => {
                const scene = window.game.scene.getScene('AuthChoiceScene');
                const button = scene.children.getByName('web3LoginButton');
                return button && button.active;
            }""", timeout=15000)
            print("Connect button is ready. Clicking it...")

            await page.evaluate("""() => {
                const scene = window.game.scene.getScene('AuthChoiceScene');
                const button = scene.children.getByName('web3LoginButton');
                button.emit('pointerdown');
            }""")

            # --- Verify Web3Modal ---
            print("Waiting for Web3Modal to appear...")
            modal = page.locator("w3m-modal")
            await expect(modal).to_be_visible(timeout=15000)

            print("Web3Modal is visible!")
            await asyncio.sleep(2) # Allow modal animation to complete

            await page.screenshot(path="jules-scratch/verification/web3modal_verification.png")
            print("Screenshot of Web3Modal taken successfully.")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())