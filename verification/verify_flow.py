import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 720}
        )
        page = await context.new_page()
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        try:
            print("Navigating to http://localhost:5173/")
            await page.goto("http://localhost:5173/")

            # Step 1: Landing Page -> Play Now
            play_btn = page.locator("#start-game-btn")
            await play_btn.wait_for(state="visible", timeout=10000)
            await play_btn.click()
            print("Clicked PLAY NOW")

            # Step 2: Handle HTML ToS
            tos_modal = page.locator("#tos-modal")
            try:
                await tos_modal.wait_for(state="visible", timeout=3000)
                if await tos_modal.is_visible():
                    print("HTML ToS found. Accepting...")
                    await page.locator("#tos-checkbox").check()
                    await page.locator("#tos-btn").click()
                    await tos_modal.wait_for(state="hidden", timeout=5000)
            except Exception:
                print("HTML ToS skipped.")

            # Step 3: Auth -> Guest
            guest_btn = page.locator("#btn-login-guest")
            await guest_btn.wait_for(state="visible", timeout=5000)
            await guest_btn.click()
            print("Clicked PLAY AS GUEST")

            # Step 4: Wait for Phaser
            print("Waiting for Phaser Canvas...")
            await page.locator("canvas").wait_for(state="visible", timeout=10000)

            # Step 5: Handle Phaser ToS (Scroll & Accept)
            await asyncio.sleep(5)

            print("Attempting to scroll and accept Phaser ToS...")
            accepted = await page.evaluate("""() => {
                const scenes = window.game.scene.scenes;
                for (const s of scenes) {
                    // Check if scene has the ToS text object and logic
                    if (s.sys.settings.active && s.textObject && s.checkScrollAndActivate) {
                        console.log(`Found ToS Scene: ${s.scene.key}`);

                        // Force Scroll
                        s.textObject.y = -s.maxScroll;
                        s.checkScrollAndActivate();

                        // Click Button
                        if (s.acceptButton) {
                            s.acceptButton.emit('pointerdown');
                            return true;
                        }
                    }
                }
                return false;
            }""")

            if accepted:
                print("Successfully scrolled and accepted Phaser ToS!")
                await asyncio.sleep(5) # Wait for transition to Game/Menu

            # Final verification
            final_scenes = await page.evaluate("""() => {
                if (!window.game) return [];
                return window.game.scene.scenes
                    .filter(s => s.sys.settings.active && s.sys.settings.visible)
                    .map(s => s.scene.key);
            }""")
            print(f"Final Active Scenes: {final_scenes}")

            await page.screenshot(path="verification/flow_final.png")
            print("Screenshot saved: verification/flow_final.png")

        except Exception as e:
            print(f"Failed: {e}")
            await page.screenshot(path="verification/debug_fail_4.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
