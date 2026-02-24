from playwright.sync_api import sync_playwright
import time

def test_juice(page):
    print("Navigating to game...")
    page.goto("http://localhost:5173")

    print("Hiding Landing Page & Showing Game...")
    page.evaluate("""
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
    """)

    print("Launching Game directly...")
    page.evaluate("window.launchGame()")

    # Wait for game instance
    print("Waiting for window.game...")
    page.wait_for_function("window.game", timeout=10000)

    # Force start GameScene
    print("Forcing start of GameScene...")
    time.sleep(2)

    print("Setting Mock Registry Data...")
    page.evaluate("""
        const hero = {
            id: 'hero_1',
            sprite_name: 'hero_default',
            stats: { bomb_num: 1 },
            xp: 0,
            spells: ['multishot']
        };
        window.game.registry.set('selectedHero', hero);
    """)

    print("Starting GameScene...")
    page.evaluate("""
        window.game.scene.stop('HomeScene');
        window.game.scene.stop('LoadingScene');
        window.game.scene.start('GameScene', { gameMode: 'solo' });
    """)

    # Wait for GameScene
    print("Waiting for GameScene init...")
    page.wait_for_function("""
        () => {
            const scene = window.game.scene.getScene('GameScene');
            return scene && scene.scene.settings.active && scene.isInitialized;
        }
    """, timeout=30000)

    print("Injecting Juice Effects...")
    page.evaluate("""
        const scene = window.game.scene.getScene('GameScene');
        // Trigger Invulnerability (Red Strobe)
        // Note: tween might be invisible in static screenshot if caught at alpha 1
        // But tint red should be visible?
        // Let's set tint manually to be sure it's working logic
        scene.triggerInvulnerability(5000);

        // Trigger Floating Text
        // Spaced out so they don't overlap too much
        scene.damageTextManager.show(240, 200, '+100 GOLD', 'GOLD');
        scene.damageTextManager.show(240, 250, '+50 HP', 'HEAL');
        scene.damageTextManager.show(240, 300, '-999', 'CRIT');
        scene.damageTextManager.show(240, 350, 'LEVEL UP!', 'XP');

        // Trigger Shake
        scene.shakeCamera(500, 0.05);
    """)

    # Wait for shake offset
    time.sleep(0.1)

    print("Taking Screenshot...")
    page.screenshot(path="/home/jules/verification/juice_verification.png")
    print("Done!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_juice(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
