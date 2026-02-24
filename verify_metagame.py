import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 480, 'height': 800},
            device_scale_factor=1
        )
        page = await context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        # Handle Alerts (Admin Analytics uses alert())
        async def handle_dialog(dialog):
            print(f"ALERT: {dialog.message}")
            await dialog.accept()
        page.on("dialog", handle_dialog)

        print("Navigating to game...")
        # Use http://localhost:3000 to avoid CORS issues
        await page.goto("http://localhost:3000/")

        # --- BYPASS TOS ---
        print("Pre-setting Terms Acceptance...")
        await page.evaluate("localStorage.setItem('termsAccepted', 'true')")

        print("Clicking PLAY NOW...")
        await page.click("#start-game-btn")

        print("Waiting for Phaser to initialize...")
        await page.wait_for_function("window.game && window.game.isBooted")

        # Enable Debug
        await page.evaluate("window.DEBUG_MODE = true;")

        # Robust Wait Loop
        print("Waiting for Scene transition...")
        max_retries = 20
        for i in range(max_retries):
            await asyncio.sleep(1)
            status = await page.evaluate("""() => {
                const game = window.game;
                if (!game) return "NO_GAME";

                // Debug Active Scenes
                const active = game.scene.scenes.filter(s => s.sys.settings.active).map(s => s.constructor.name);
                const keys = Object.keys(game.scene.keys);
                console.log("Active Scenes:", active);
                console.log("Available Keys:", keys);

                const menu = game.scene.getScene('MenuScene');
                if (menu && menu.sys.settings.active) return "MENU";
                const gameScene = game.scene.getScene('GameScene');
                if (gameScene && gameScene.sys.settings.active) return "GAME";
                const loading = game.scene.getScene('LoadingScene');
                if (loading && loading.sys.settings.active) return "LOADING";

                return "UNKNOWN: " + active.join(',');
            }""")

            print(f"Current Status: {status}")

            if status == "MENU":
                print("MenuScene is Active!")
                break
            elif status == "GAME":
                print("GameScene detected. Switching to Menu...")
                await page.evaluate("""() => {
                    window.game.scene.stop('GameScene');
                    window.game.scene.start('MenuScene');
                }""")
                # Loop continues, will verify MENU next iteration
            elif "TermsScene" in status:
                 print("TermsScene detected. Force Transition to Menu (Global)...")
                 await page.evaluate("""() => {
                     console.log("Forcing MenuScene via Global Scene Manager...");
                     localStorage.setItem('termsAccepted', 'true');
                     window.game.scene.stop('TermsScene');
                     window.game.scene.start('MenuScene');
                 }""")
                 continue
            elif status == "LOADING":
                continue # Keep waiting
            elif "UNKNOWN" in status:
                continue

        # Final check
        is_menu = await page.evaluate("window.game.scene.getScene('MenuScene').sys.settings.active")
        if not is_menu:
            print("FAILED to reach MenuScene.")
            # Take debug screenshot
            await page.screenshot(path="debug_fail.png")
            return

        # Allow animations to settle
        await asyncio.sleep(2)

        # --- VERIFY 1: PROFILE MODAL ---
        print("TEST 1: Profile Modal")
        # Click Avatar
        await page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');

            // Debug Hierarchy
            const debugHierarchy = (children, depth=0) => {
                for (const child of children) {
                    const type = child.type;
                    const key = child.texture ? child.texture.key : 'N/A';
                    console.log(' '.repeat(depth * 2) + `[${type}] Key: ${key}`);
                    if (child.list) {
                        debugHierarchy(child.list, depth + 1);
                    }
                }
            };
            console.log("Scene Hierarchy:");
            debugHierarchy(scene.children.list);

            // Recursive find with logging
            const findAvatar = (children) => {
                for (const child of children) {
                    if (child.type === 'Image') {
                         console.log(`Found Image: ${child.texture.key} at (${child.x}, ${child.y})`);
                         if (child.texture.key === 'icon_summoner') return child;
                         // Fallback: Check position (Top Left)
                         // Avatar is at (40, 40) inside container (0,0)
                         // Or roughly there.
                         if (Math.abs(child.x - 40) < 10 && Math.abs(child.y - 40) < 10) return child;
                    }
                    if (child.list) { // Container
                        const found = findAvatar(child.list);
                        if (found) return found;
                    }
                }
                return null;
            };

            const avatar = findAvatar(scene.children.list);

            if (avatar) {
                console.log("Avatar found (fuzzy match)! Clicking...");
                avatar.emit('pointerup');
            } else {
                console.error("Avatar not found");
            }
        }""")

        await asyncio.sleep(1)
        await page.screenshot(path="profile_modal.png")
        print("Screenshot saved: profile_modal.png")

        # Close Modal (Click outside or call close)
        await page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            if (scene.profileModal) scene.profileModal.close();
        }""")
        await asyncio.sleep(1)

        # --- VERIFY 2: FORGE LOCK (Level Gating) ---
        print("TEST 2: Forge Lock (Level < 8)")
        # Ensure level is 1 (default)
        await page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            // Find Forge Button. It's the 4th button in the bottom dock.
            // Based on createBottomDock logic, it has texture 'icon_forge' inside a Container?
            // createRetroButton returns a Container.
            // We can search for the text "FORGE" in the scene children containers.

            // Recursive Text Find
            const findTextRecursive = (children, textStr) => {
                for (const child of children) {
                    if (child.type === 'Text' && child.text === textStr) return child;
                    if (child.list) {
                        const found = findTextRecursive(child.list, textStr);
                        if (found) return found;
                    }
                }
                return null;
            };

            const forgeText = findTextRecursive(scene.children.list, 'FORGE');
            if (forgeText && forgeText.parentContainer) {
                const btn = forgeText.parentContainer;
                btn.emit('pointerup');
                btn.emit('pointerdown');
            } else {
                console.error("Forge button not found");
            }
        }""")

        # It shouldn't open a modal, just log/alert.
        # We can verify by checking if ForgeModal is visible (should be false)
        is_forge_open = await page.evaluate("""() => {
             const scene = window.game.scene.getScene('MenuScene');
             return scene.forgeModal && scene.forgeModal.visible;
        }""")

        if not is_forge_open:
            print("SUCCESS: Forge Modal did not open.")
        else:
            print("FAILURE: Forge Modal opened.")

        await page.screenshot(path="forge_locked.png")
        print("Screenshot saved: forge_locked.png")

        # --- VERIFY 3: ADMIN ANALYTICS ---
        print("TEST 3: Admin Analytics")
        # Enable Admin Mode
        await page.evaluate("""() => {
            const ps = window.game.scene.getScene('MenuScene').sys.game.registry.get('playerStateService') ||
                       window.game.scene.getScene('MenuScene').registry.get('loggedInUser'); // Access service directly if exposed?

            // We need the service instance. It is imported as singleton in MenuScene.
            // Since we can't import easily here, we rely on the scene using it.
            // MenuScene checks `playerStateService.isAdmin`.

            // Let's hack the service via the scene if possible, or reload with admin email mock?
            // Actually, PlayerStateService is a singleton module.
            // We can try to set the flag if we can reach it.

            // Easier: MenuScene checks `playerStateService.isAdmin` in `create()`.
            // We can't change the module variable easily from outside.
            // BUT, `MenuScene` calls `createAdminTools` if `isAdmin` is true.
            // Let's just force call `createAdminTools()`!

            const scene = window.game.scene.getScene('MenuScene');
            scene.createAdminTools();
        }""")

        await asyncio.sleep(1)

        # Click Gear Icon
        await page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            // Find text '⚙️'
            const gear = scene.children.list.find(c => c.type === 'Text' && c.text === '⚙️');
            if (gear) {
                gear.emit('pointerdown');
            } else {
                console.error("Gear icon not found");
            }
        }""")

        await asyncio.sleep(1)
        await page.screenshot(path="admin_panel.png")
        print("Screenshot saved: admin_panel.png")

        # Click Analytics Button
        print("Clicking VIEW ANALYTICS...")
        await page.evaluate("""() => {
            const scene = window.game.scene.getScene('MenuScene');
            if (scene.godPanel) {
                // Find button with text 'VIEW ANALYTICS'
                const btn = scene.godPanel.list.find(c =>
                    c.type === 'Container' &&
                    c.list.some(child => child.text === 'VIEW ANALYTICS')
                );

                if (btn) {
                    btn.emit('pointerup'); // createRetroButton uses pointerup usually? check code: "btn.on('pointerdown', ...)" in createAdminTools
                    // Wait, createRetroButton usually uses pointerup?
                    // Let's check MenuScene code again.
                    // "btn.on('pointerdown', () => { this.openGodPanel(); });" for the gear.
                    // Inside GodPanel: "createRetroButton(..., () => { ... })"
                    // createRetroButton usually defaults to pointerdown or pointerup?
                    // Let's try both.
                    btn.emit('pointerdown');
                    btn.emit('pointerup');
                } else {
                    console.error("Analytics button not found");
                }
            }
        }""")

        await asyncio.sleep(1)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
