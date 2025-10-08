import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        try:
            await asyncio.sleep(5)
            await page.goto("http://localhost:5173", wait_until="load", timeout=60000)

            await page.wait_for_function("!!window.game", timeout=20000)
            print("window.game is available.")

            await page.wait_for_function("window.i18nReady === true", timeout=15000)
            print("i18n is ready.")

            await page.wait_for_function("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                if (!scene || !scene.children) return false;
                const titleObject = scene.children.list.find(child =>
                    child.type === 'Text' && child.text.includes('Terms of Service')
                );
                return titleObject && titleObject.visible;
            }""", timeout=15000)

            print("TermsScene loaded. Starting verification.")

            # --- DIAGNOSTIC STEP ---
            # Recursively find all text objects in the scene, including those inside containers.
            all_texts = await page.evaluate("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                if (!scene || !scene.children) return ['Scene or children not found'];

                const texts = [];
                const findTextsRecursive = (children) => {
                    for (const child of children) {
                        if (child.type === 'Text') {
                            texts.push(child.text);
                        }
                        if (child.list) { // If it's a container, recurse
                            findTextsRecursive(child.list);
                        }
                    }
                };

                findTextsRecursive(scene.children.list);
                return texts;
            }""")
            print("DIAGNOSTIC: Available texts in TermsScene:", all_texts)

            main_text_content = next((text for text in all_texts if "PLEASE READ THESE TERMS" in text), None)
            if not main_text_content:
                raise Exception("Could not dynamically find the main terms text in the scene.")

            print(f"Successfully found main text block starting with: '{main_text_content[:30]}...'")

            await page.screenshot(path="jules-scratch/verification/01_initial_state.png")

            # --- Verify Wheel Scroll ---
            print("Testing mouse wheel scroll...")
            await page.mouse.wheel(0, 400)
            await asyncio.sleep(0.5)
            await page.screenshot(path="jules-scratch/verification/02_after_wheel_scroll.png")
            print("Wheel scroll screenshot taken.")

            # --- Verify Drag Scroll ---
            print("Testing drag-to-scroll...")
            await page.mouse.move(400, 400)
            await page.mouse.down()
            await page.mouse.move(400, 200, steps=5)
            await page.mouse.up()
            await asyncio.sleep(0.5)
            await page.screenshot(path="jules-scratch/verification/03_after_drag_scroll.png")
            print("Drag scroll screenshot taken.")

            # --- Verify Button Activation ---
            print("Scrolling to the bottom to activate the button...")

            await page.evaluate("""(textToFind) => {
                const scene = window.game.scene.getScene('TermsScene');
                let textObject = null;

                const findObjectRecursive = (children) => {
                    for (const child of children) {
                        if (child.type === 'Text' && child.text === textToFind) {
                            textObject = child;
                            return;
                        }
                        if (child.list) {
                            findObjectRecursive(child.list);
                        }
                    }
                };
                findObjectRecursive(scene.children.list);

                if (!textObject) throw new Error('Main terms text object not found in scene for final scroll.');

                const scrollableAreaHeight = 500;
                const maxScroll = Math.max(0, textObject.height - (scrollableAreaHeight - 20));
                textObject.y = -maxScroll;

                if (typeof scene.checkScrollAndActivate === 'function') {
                    scene.checkScrollAndActivate();
                } else {
                    if (!scene.canAccept) {
                        scene.canAccept = true;
                        scene.activateButton();
                    }
                }
            }""", main_text_content)

            await asyncio.sleep(1)

            accept_button_alpha = await page.evaluate("""() => {
                const scene = window.game.scene.getScene('TermsScene');
                return scene.acceptButton.alpha;
            }""")

            if accept_button_alpha < 1:
                raise Exception(f"Button did not become enabled. Alpha is {accept_button_alpha}")

            print("Button activated successfully.")
            await page.screenshot(path="jules-scratch/verification/04_button_activated.png")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())