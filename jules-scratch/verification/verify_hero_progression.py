from playwright.sync_api import sync_playwright, expect
import json

# --- Test Data ---
MOCK_HERO_ID = 1
MOCK_HERO_NAME = 'Ninja'
MOCK_INITIAL_LEVEL = 3
MOCK_XP_FOR_LEVEL_4 = 400

MOCK_USER = {
    "id": 1,
    "address": "0xMockAddress",
    "account_level": 5,
    "account_xp": 1500,
    "coins": 100,
}

MOCK_HERO_BEFORE_LEVEL_UP = {
    "id": MOCK_HERO_ID,
    "name": MOCK_HERO_NAME,
    "level": MOCK_INITIAL_LEVEL,
    "xp": MOCK_XP_FOR_LEVEL_4 + 50,
    "maxHp": 120,
    "sprite_name": 'ninja',
    "hero_type": 'mock',
}

MOCK_HERO_AFTER_LEVEL_UP = {
    "id": MOCK_HERO_ID,
    "name": MOCK_HERO_NAME,
    "level": MOCK_INITIAL_LEVEL + 1,
    "xp": MOCK_XP_FOR_LEVEL_4 + 50,
    "maxHp": 130,
    "hp": 130,
    "sprite_name": 'ninja',
    "hero_type": 'mock',
}

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # --- Mock API Endpoints ---
        # Mock the session check to simulate a logged-in user
        page.route('**/api/auth/me', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps({"success": True, "user": MOCK_USER})
        ))

        # Mock the hero list to provide the test hero
        page.route('**/api/heroes', lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps({"success": True, "heroes": [MOCK_HERO_BEFORE_LEVEL_UP]})
        ))

        # --- 1. Navigate and wait for app to be ready ---
        page.goto("http://localhost:5173", timeout=60000)
        # The app will now auto-navigate to MenuScene because of the mocked session
        page.wait_for_function('window.game && window.game.scene.getScene("MenuScene").scene.isActive()', timeout=15000)

        # --- 2. Navigate to Character Selection ---
        page.evaluate("""
            const menuScene = window.game.scene.getScene('MenuScene');
            const pvpButton = menuScene.children.list.find(c => c.text === 'PvP Mode');
            if (pvpButton) {
                pvpButton.emit('pointerdown');
            } else {
                throw new Error('PvP button not found in MenuScene');
            }
        """)
        page.wait_for_function('window.game && window.game.scene.getScene("CharacterSelectionScene").scene.isActive()', timeout=15000)
        page.wait_for_timeout(1000) # Wait for cards to render

        # --- 3. Mock the level-up API call ---
        page.evaluate(f"""
            window.api.levelUpHero = async (heroId) => {{
                return Promise.resolve({{
                    success: true,
                    hero: {json.dumps(MOCK_HERO_AFTER_LEVEL_UP)}
                }});
            }};
        """)

        # --- 4. Perform the level-up ---
        level_up_result = page.evaluate(f"""
            const scene = window.game.scene.getScene('CharacterSelectionScene');
            const heroCardData = scene.heroCards.find(c => c.hero.id === {MOCK_HERO_ID});
            if (!heroCardData) return {{ success: false, error: 'Hero card not found' }};
            const levelUpButton = heroCardData.card.getData('levelUpButton');
            if (!levelUpButton || !levelUpButton.input.enabled) return {{ success: false, error: 'Level up button not found or not enabled' }};
            levelUpButton.emit('pointerdown', new Phaser.Input.Pointer());
            return {{ success: true }};
        """)
        if not level_up_result.get('success'):
            raise Exception(f"Failed to trigger level up: {level_up_result.get('error')}")

        # --- 5. Verify UI update and take screenshots ---
        expect(page.get_by_text('Success!')).to_be_visible(timeout=10000)
        page.screenshot(path="jules-scratch/verification/hero_level_up_success.png")
        page.get_by_text('OK').click()
        page.wait_for_timeout(500)
        page.screenshot(path="jules-scratch/verification/hero_card_updated.png")

        # --- 6. Verify HUD ---
        page.evaluate("""
            const scene = window.game.scene.getScene('CharacterSelectionScene');
            scene.startGameWithSelectedHero();
        """)
        page.wait_for_function("window.game.scene.getScene('HUDScene').scene.isActive()", timeout=10000)
        page.wait_for_timeout(1000)
        page.screenshot(path="jules-scratch/verification/hud_verification.png")

        browser.close()
        print("All verification screenshots saved successfully.")

if __name__ == "__main__":
    run_verification()