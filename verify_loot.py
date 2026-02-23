from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Navigate
    print("Navigating...")
    page.goto("http://localhost:5173")

    # 2. Inject LocalStorage to bypass ToS
    print("Injecting localStorage...")
    page.evaluate("localStorage.setItem('termsAccepted', 'true')")

    # 3. Click Play
    print("Clicking Play...")
    page.click("#start-game-btn")

    # 4. Wait for Canvas (Game Loaded)
    print("Waiting for Canvas...")
    try:
        page.wait_for_selector("canvas", timeout=20000)
    except:
        print("Timeout waiting for canvas. Taking debug screenshot.")
        page.screenshot(path="debug_timeout.png")
        raise

    print("Game Started. Waiting for Scene...")
    time.sleep(5) # Wait for Phaser boot and scene start

    # 5. Inject Loot
    print("Injecting Loot...")
    page.evaluate("""
        const game = window.game;
        if (!game) {
            console.error("Game not found!");
        } else {
            const scene = game.scene.getScene('GameScene');
            if (scene) {
                if (!scene.player) {
                     // Maybe scene isn't fully ready or we are in MenuScene
                     console.log("Player not found in GameScene. Current Scene:", scene.sys.settings.key);
                     // If we are in MenuScene (default start), we need to start GameScene?
                     // launchGame starts HomeScene -> LoadingScene -> ...
                } else {
                    // Spawn BCOIN
                    scene.spawnLootItem(scene.player.x + 40, scene.player.y, 'item_bcoin', 'BCOIN', null, false).lootType = 'bcoin';

                    // Spawn Fragment
                    const frag = scene.spawnLootItem(scene.player.x - 40, scene.player.y, 'item_fragment', 'Fragment', 0x9932cc, true);
                    frag.lootType = 'fragment';
                    frag.rarity = 'Common';

                    console.log("Forced Loot Spawn");
                }
            } else {
                console.log("GameScene not found active.");
            }
        }
    """)

    # Wait for visual update
    time.sleep(1)

    # 6. Screenshot
    print("Taking Screenshot...")
    page.screenshot(path="verification_loot.png")
    print("Done.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
