from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto("http://localhost:5173")
    page.click("#start-game-btn")

    print("Waiting 10s...")
    time.sleep(10)

    # Check if game exists
    has_game = page.evaluate("typeof window.game !== 'undefined'")
    print(f"Has Game: {has_game}")

    if not has_game:
        print("Game not found. Taking debug screenshot.")
        page.screenshot(path="debug_no_game.png")
        # Check if ToS HTML is visible
        tos_visible = page.is_visible("#tos-modal")
        print(f"ToS Modal Visible: {tos_visible}")

        if tos_visible:
            # Handle HTML ToS
            print("Handling HTML ToS...")
            page.click("#tos-checkbox")
            page.click("#tos-btn")
            time.sleep(5)

    # Try Phaser approach
    page.evaluate("""
        if (window.game) {
            const game = window.game;
            console.log("Scenes:", game.scene.scenes.map(s => s.sys.settings.key));

            if (game.scene.isActive('TermsScene')) {
                const terms = game.scene.getScene('TermsScene');
                terms.activateButton();
                terms.acceptButton.emit('pointerdown');
            }
        }
    """)

    time.sleep(5)

    # Inject Loot
    print("Injecting Loot...")
    page.evaluate("""
        const scene = window.game?.scene?.getScene('GameScene');
        if (scene && scene.player) {
            scene.spawnLootItem(scene.player.x + 30, scene.player.y, 'item_bcoin', 'BCOIN', null, false).lootType = 'bcoin';
            scene.spawnLootItem(scene.player.x - 30, scene.player.y, 'item_fragment', 'Fragment', 0x9932cc, true).lootType = 'fragment';

            // Floating Text
            scene.showFloatingText(scene.player.x + 30, scene.player.y - 40, '+1 BCOIN', '#ffd700');
            scene.showFloatingText(scene.player.x - 30, scene.player.y - 40, '+1 Common', '#cccccc');
        } else {
            console.log("Scene not ready for loot");
        }
    """)

    time.sleep(1)
    page.screenshot(path="verification_loot_final.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
