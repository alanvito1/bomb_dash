import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Capture console logs for debugging
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

    try:
        # --- Mocks and Setup ---
        # Mock the backend session check to simulate a logged-in user
        def handle_route(route):
            if "/api/auth/me" in route.request.url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"success": true, "user": {"id": 1, "address": "0x123abc", "account_level": 5, "account_xp": 120, "coins": 500, "highest_wave_reached": 10, "heroes": [{"id":1,"hero_type":"mock","level":1,"xp":50,"hp":2100,"maxHp":2100,"damage":1,"speed":200,"extraLives":1,"fireRate":600,"bombSize":1,"multiShot":0,"status":"in_wallet","sprite_name":"ninja"}]}}'
                )
            elif "/api/ranking" in route.request.url:
                 route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"success": true, "ranking": [{"rank": 1, "address": "0x123...cdef", "wave": 15}, {"rank": 2, "address": "0x456...ghij", "wave": 12}]}'
                )
            else:
                route.continue_()

        page.route(re.compile(r"http://localhost:3000/api/.*"), handle_route)

        # Use add_init_script to inject mocks BEFORE the page's scripts run.
        page.add_init_script("""
            localStorage.setItem('jwtToken', 'dummy_token');
        """)

        # --- Test Execution ---

        # 1. Go to the app and wait for the MenuScene
        page.goto("http://localhost:5173")
        expect(page.locator('text="RANKING"')).to_be_visible(timeout=15000)
        print("✅ MenuScene loaded with new Ranking button.")
        page.screenshot(path="jules-scratch/verification/01_menu_scene.png")

        # 2. Verify Ranking Scene
        page.get_by_text("RANKING").click()
        expect(page.locator('text="Wave"')).to_be_visible(timeout=5000)
        print("✅ RankingScene loaded.")
        page.screenshot(path="jules-scratch/verification/02_ranking_scene.png")
        page.get_by_text("Back to Menu").click()

        # 3. Verify Game Scene HUD
        expect(page.locator('text="SOLO"')).to_be_visible(timeout=5000)
        page.get_by_text("SOLO").click()
        expect(page.locator('text="Select Your Hero"')).to_be_visible(timeout=5000)
        page.locator('canvas').click(position={'x': 240, 'y': 380}) # Click the first hero card
        page.get_by_text("Start Game").click()
        expect(page.locator('text=/World 1/')).to_be_visible(timeout=10000)
        print("✅ GameScene loaded with new HUD.")
        page.screenshot(path="jules-scratch/verification/03_game_scene_hud.png")

        # 4. Verify Pause Scene
        page.keyboard.press("Escape")
        expect(page.locator('text="PAUSED"')).to_be_visible(timeout=5000)
        print("✅ PauseScene loaded.")
        page.screenshot(path="jules-scratch/verification/04_pause_scene.png")
        page.get_by_text("Continue").click()
        expect(page.locator('text="PAUSED"')).not_to_be_visible(timeout=5000)
        print("✅ Game resumed from pause.")

        # 5. Verify Game Over Scene
        print("Triggering Game Over...")
        page.evaluate("window.game.scene.getScene('GameScene').handleGameOver()")
        expect(page.locator('text="GAME OVER"')).to_be_visible(timeout=5000)
        print("✅ GameOverScene loaded.")
        page.screenshot(path="jules-scratch/verification/05_game_over_scene.png")

    except Exception as e:
        print(f"❌ An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)