from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.add_init_script("""
            localStorage.setItem('termsAccepted', 'true');
            localStorage.setItem('jwtToken', 'mock-token');
        """)
        try:
            page.goto("http://localhost:5173")
            time.sleep(3)
            try:
                page.click("#start-game-btn", timeout=2000)
            except:
                try:
                    page.locator("button:has-text('PLAY NOW')").click()
                except:
                    page.get_by_text("PLAY NOW").last.click()
            time.sleep(3)
            page.evaluate("""() => {
                // Mock registry data
                window.game.registry.set('selectedHero', { id: 'hero_1', sprite_name: 'ninja_hero', stats: { speed: 5, power: 5, bomb_num: 1, range: 2 } });
                window.game.scene.start('GameScene');
                window.game.scene.stop('TermsScene');
                window.game.scene.stop('StartScene');
            }""")
            for i in range(20):
                is_active = page.evaluate("() => window.game.scene.getScene('GameScene') && window.game.scene.getScene('GameScene').scene.settings.active")
                if is_active: break
                time.sleep(1)
            time.sleep(2)
            page.evaluate("window.game.scene.getScene('GameScene').pauseManager.pause()")
            time.sleep(1)
            page.screenshot(path="verification_pause.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
