from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto("http://localhost:5173")
    page.click("#start-game-btn")

    time.sleep(2)

    # Check if ToS HTML is visible
    if page.is_visible("#tos-modal"):
        print("Handling HTML ToS...")
        # Need to verify checkbox id. index.html says "tos-checkbox".
        page.click("input#tos-checkbox") # Use specific selector
        page.click("button#tos-btn")
        print("ToS Accepted.")
        time.sleep(5) # Wait for game boot

    # Wait for Game
    print("Waiting for Game...")
    for i in range(20):
        has_game = page.evaluate("typeof window.game !== 'undefined'")
        if has_game:
            print("Game Found!")
            break
        time.sleep(1)

    time.sleep(5) # Wait for scenes

    # Inject Loot
    print("Injecting Loot...")
    page.evaluate("""
        if (window.game) {
            const scene = window.game.scene.getScene('GameScene');
            if (scene && scene.player) {
                // Spawn BCOIN (Right)
                const bcoin = scene.spawnLootItem(scene.player.x + 30, scene.player.y, 'item_bcoin', 'BCOIN', null, false);
                bcoin.lootType = 'bcoin';

                // Spawn Fragment (Left)
                const frag = scene.spawnLootItem(scene.player.x - 30, scene.player.y, 'item_fragment', 'Fragment', 0x9932cc, true);
                frag.lootType = 'fragment';
                frag.rarity = 'Common';

                // Floating Text
                scene.showFloatingText(scene.player.x + 30, scene.player.y - 40, '+1 BCOIN', '#ffd700');
                scene.showFloatingText(scene.player.x - 30, scene.player.y - 40, '+1 Common', '#cccccc');

                console.log("Loot Injected");
            } else {
                console.log("Scene not ready. Current Scenes:", window.game.scene.scenes.map(s => s.sys.settings.key + ':' + s.sys.settings.active));
            }
        }
    """)

    time.sleep(1)
    page.screenshot(path="verification_loot_final.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
