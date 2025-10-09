import re
from playwright.sync_api import sync_playwright, Page, expect

# --- Test Data ---
MOCK_PRIVATE_KEY = "0x0123456789012345678901234567890123456789012345678901234567890123"
MOCK_WALLET_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" # Derived from the private key

def run(playwright):
    """
    Main verification function.
    Launches the app, logs in, starts a game, and takes a screenshot.
    """
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # --- Step 1: Inject Mock Wallet (before navigation) ---
    # This script runs in the browser context before any page scripts.
    # It creates a mock `window.ethereum` object that simulates a wallet like MetaMask.
    page.add_init_script(f"""
        class MockProvider {{
            constructor() {{
                this.isMetaMask = true;
                this.selectedAddress = "{MOCK_WALLET_ADDRESS}";
                this.events = {{}};
            }}
            async request({{ method, params }}) {{
                if (method === 'eth_requestAccounts' || method === 'eth_accounts') {{
                    return [this.selectedAddress];
                }}
                if (method === 'personal_sign') {{
                    // This is a mock signature. The backend mock won't verify it,
                    // but it's required for the SIWE library on the frontend.
                    return "0xmock_signature";
                }}
                console.warn(`Unhandled mock provider method: ${{method}}`);
                return null;
            }}
            on(event, listener) {{}}
            removeListener(event, listener) {{}}
        }}
        window.ethereum = new MockProvider();
    """)

    # --- Step 2: Mock API Endpoints ---
    # Intercept network requests and provide mock responses to isolate the frontend.
    page.route("**/api/auth/nonce", lambda route: route.fulfill(
        status=200, json={"success": True, "nonce": "a-mock-nonce-for-testing"}
    ))
    page.route("**/api/auth/verify", lambda route: route.fulfill(
        status=200, json={"success": True, "token": "mock-jwt-token"}
    ))
    page.route("**/api/auth/me", lambda route: route.fulfill(
        status=200, json={{
            "success": True,
            "user": {{
                "id": 1, "address": MOCK_WALLET_ADDRESS, "account_level": 5, "account_xp": 500,
                "coins": 1234, "highest_wave_reached": 10,
                "heroes": [
                    {{ "id": 1, "name": "Ninja", "level": 1, "xp": 0, "hero_type": "mock", "sprite_name": "ninja" }}
                ]
            }}
        }}
    ))
    page.route("**/api/contracts", lambda route: route.fulfill(
        status=200, json={"success": True}
    ))
    page.route("**/api/game/settings", lambda route: route.fulfill(
        status=200, json={"success": True, "settings": {"monsterScaleFactor": 7}}
    ))

    # --- Step 3: Run the User Journey ---
    print("Navigating to application...")
    page.goto("http://localhost:5173")

    print("Accepting terms and logging in...")
    # Wait for the scene to be ready by looking for the button's container
    expect(page.locator('canvas')).to_be_visible(timeout=10000)
    page.wait_for_function("() => window.game?.scene.getScene('TermsScene')?.acceptButton")

    # Directly activate the button by calling the scene's internal method
    page.evaluate("() => window.game.scene.getScene('TermsScene').activateButton()")

    # Click the now-active button using its stable name
    page.evaluate("() => window.game.scene.getScene('TermsScene').acceptButton.emit('pointerdown')")

    page.get_by_role("button", name="Web3 Login").click()
    expect(page.get_by_role("heading", name="MENU PRINCIPAL")).to_be_visible(timeout=15000)

    print("Selecting hero...")
    page.get_by_role("button", name="Heróis").click()
    page.get_by_text("Ninja").click()
    page.get_by_role("button", name="Selecionar Herói").click()
    page.get_by_role("button", name="Voltar").click()

    print("Starting solo game...")
    page.get_by_role("button", name="Modo Solo").click()

    # --- Step 4: Verify the Game Scene and Take Screenshot ---
    print("Waiting for game scene to load and enemy to appear...")
    # Wait for an enemy to be present in the game state. This confirms the scene is running.
    page.wait_for_function(
        "() => window.game?.scene.getScene('GameScene')?.enemies?.getChildren().length > 0",
        timeout=15000
    )
    print("Game scene is active. Taking screenshot...")
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot saved to jules-scratch/verification/verification.png")

    # --- Cleanup ---
    context.close()
    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)