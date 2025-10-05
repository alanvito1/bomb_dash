from playwright.sync_api import sync_playwright, expect
import json

# --- Mock Data ---
MOCK_USER_DATA = {
    "success": True,
    "user": {
        "id": 1,
        "address": "0x1234567890123456789012345678901234567890",
        "heroes": [
            { "id": 101, "user_id": 1, "level": 5, "xp": 1000, "sprite_name": "Ninja" },
            { "id": 102, "user_id": 1, "level": 3, "xp": 60, "sprite_name": "Witch" },
            { "id": 103, "user_id": 1, "level": 1, "xp": 10, "sprite_name": "Knight" }
        ]
    }
}
MOCK_WAGER_TIERS = {
    "success": True,
    "tiers": [
        { "id": 1, "name": 'Bronze', "bcoin_cost": 10, "xp_cost": 20 },
        { "id": 2, "name": 'Silver', "bcoin_cost": 50, "xp_cost": 50 },
        { "id": 3, "name": 'Gold', "bcoin_cost": 200, "xp_cost": 500 }
    ]
}

def run_verification(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    # Set up API mocks
    page.route('/api/auth/me', lambda route: route.fulfill(json=MOCK_USER_DATA))
    page.route('/api/pvp/wager/tiers', lambda route: route.fulfill(json=MOCK_WAGER_TIERS))

    # Navigate and wait for game to boot
    page.goto("http://localhost:5173", timeout=60000)
    page.wait_for_function("window.game && window.game.isBooted")

    # **FIX:** Force the game's authentication flow to run by setting the
    # token in localStorage and then reloading the page.
    page.evaluate("localStorage.setItem('jwtToken', 'fake-token-for-testing')")
    page.reload()

    # Wait for the game to process the login and land on the MenuScene
    page.wait_for_function("window.game.scene.isActive('MenuScene')", timeout=10000)
    # Also wait for the user data to be populated by the LoadingScene's API call
    page.wait_for_function("window.api.user && window.api.user.heroes")

    # Programmatically navigate to the PvP Scene to avoid flaky UI clicks
    page.evaluate("""
        window.game.scene.getScene('MenuScene').scene.start('PvpScene', {
            userData: window.api.user,
            web3: {}
        })
    """)
    page.wait_for_function("window.game.scene.isActive('PvpScene')")

    # Now that we are reliably in the PvpScene, the rest of the test can run
    page.locator('text=Arena de Aposta').click()
    expect(page.locator('text=Arena de Alto Risco')).to_be_visible()
    page.screenshot(path="jules-scratch/verification/wager_tiers_view.png")

    page.locator('text=Silver').click()
    expect(page.locator('text=Selecione um Herói (Risco: 50 XP)')).to_be_visible()

    expect(page.locator('text=Witch (Lvl: 3)')).to_have_css('color', 'rgb(255, 255, 255)')
    expect(page.locator('text=Knight (Lvl: 1)')).to_have_css('color', 'rgb(136, 136, 136)')

    page.screenshot(path="jules-scratch/verification/wager_hero_selection_view.png")

    browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)