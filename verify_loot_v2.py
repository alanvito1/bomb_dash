from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating...")
    page.goto("http://localhost:5173")

    print("Clicking Play...")
    page.click("#start-game-btn")

    # Wait for Phaser Game to exist
    print("Waiting for Phaser...")
    page.wait_for_function("window.game !== undefined")

    # Wait for Scene Flow
    print("Waiting for Scene Flow...")
    time.sleep(5)

    # Check current scene and handle Terms if needed
    page.evaluate("""
        const game = window.game;
        const terms = game.scene.getScene('TermsScene');
        const loading = game.scene.getScene('LoadingScene');
        const gameScene = game.scene.getScene('GameScene');

        console.log("Scene States:", {
            terms: game.scene.isActive('TermsScene'),
            loading: game.scene.isActive('LoadingScene'),
            game: game.scene.isActive('GameScene')
        });

        if (game.scene.isActive('TermsScene')) {
            console.log("Accepting Terms...");
            terms.activateButton();
            terms.acceptButton.emit('pointerdown');
        }
    """)

    # Wait for GameScene
    print("Waiting for GameScene...")
    # Poll for GameScene active
    for i in range(20):
        is_active = page.evaluate("window.game.scene.isActive('GameScene')")
        if is_active:
            print("GameScene is Active!")
            break
        print(f"Waiting... ({i})")
        time.sleep(1)

    # Inject Loot
    print("Injecting Loot...")
    page.evaluate("""
        const scene = window.game.scene.getScene('GameScene');
        if (scene && scene.player) {
            // Spawn BCOIN (Right)
            const bcoin = scene.spawnLootItem(scene.player.x + 30, scene.player.y, 'item_bcoin', 'BCOIN', null, false);
            bcoin.lootType = 'bcoin';

            // Spawn Fragment (Left)
            const frag = scene.spawnLootItem(scene.player.x - 30, scene.player.y, 'item_fragment', 'Fragment', 0x9932cc, true);
            frag.lootType = 'fragment';
            frag.rarity = 'Common';

            // Show HUD Text to prove pickup logic exists (Visual Fake)
            scene.showFloatingText(scene.player.x + 30, scene.player.y - 40, '+1 BCOIN', '#ffd700');
            scene.showFloatingText(scene.player.x - 30, scene.player.y - 40, '+1 Common', '#cccccc');

            console.log("Loot Injected");
        } else {
            console.error("GameScene or Player not ready");
        }
    """)

    time.sleep(1)
    page.screenshot(path="verification_loot_v2.png")
    print("Done.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
