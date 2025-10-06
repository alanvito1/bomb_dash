import re
from playwright.sync_api import sync_playwright, Page, expect

# --- Test User with a known private key for wallet mocking ---
USER_WITH_NFT = {
    'address': '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', # Hardhat account 1
    'private_key': '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
}

def setup_wallet_and_login_mocks(page: Page):
    """Injects a mock wallet and sets up API routes for a clean login."""

    # 1. Inject a mock window.ethereum provider using an init script.
    page.add_init_script("""
        window.ethereum = {
            isMetaMask: true,
            request: async (request) => {
                if (request.method === 'eth_requestAccounts' || request.method === 'eth_accounts') {
                    return ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8'];
                }
                if (request.method === 'personal_sign') {
                    return '0xmocksignature';
                }
                if (request.method === 'eth_chainId') {
                    return '0x7a69';
                }
                throw new Error(`Mock wallet does not support method: ${request.method}`);
            },
            on: (event, listener) => {},
            removeListener: (event, listener) => {},
        };
    """)

    # 2. Mock the API responses needed for the login flow.
    page.route("**/api/auth/nonce", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "nonce": "a_mock_nonce_12345"}'
    ))
    page.route("**/api/auth/verify", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='{"success": true, "token": "mock-jwt-token"}'
    ))

def verify_staking_ui(page: Page):
    """
    This script verifies the UI for an unstaked NFT hero.
    It logs in, navigates to the character selection, and captures a screenshot.
    """
    print("--- Setting up wallet and API mocks ---")
    setup_wallet_and_login_mocks(page)

    # Mock the /api/heroes endpoint to return a single, unstaked NFT hero.
    page.route("**/api/heroes", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='''{
            "success": true,
            "heroes": [
                {
                    "id": 101,
                    "user_id": 2,
                    "hero_type": "nft",
                    "nft_id": 77,
                    "level": 5,
                    "xp": 1200,
                    "hp": 150,
                    "maxHp": 150,
                    "damage": 8,
                    "speed": 220,
                    "sprite_name": "ninja_hero",
                    "name": "NFT Ninja",
                    "status": "in_wallet"
                }
            ]
        }'''
    ))

    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

    print("--- Navigating to the application ---")
    page.goto("http://localhost:5173")

    # --- Robust Wait ---
    # Wait for the LanguageManager to signal it's ready. This prevents race conditions.
    print("--- Waiting for application to be ready (i18nReady) ---")
    page.wait_for_function("window.i18nReady === true", timeout=15000)
    print("--- Application is ready ---")

    # --- Login Flow ---
    print("--- Starting login process ---")
    login_button = page.get_by_role("button", name="Login com Web3")
    expect(login_button).to_be_visible()
    login_button.click()

    adventure_button = page.get_by_role("button", name="Modo Aventura")
    expect(adventure_button).to_be_visible()
    print("--- Login successful, navigating to Character Selection ---")

    # --- Navigation and Verification ---
    adventure_button.click()

    expect(page.get_by_text("Escolha seu Herói")).to_be_visible()
    print("--- Character Selection scene loaded ---")

    hero_card = page.locator(".container", has_text="NFT Ninja")

    expect(hero_card.get_by_text("Status: In Wallet")).to_be_visible()
    expect(hero_card.get_by_role("button", name="Deposit to Play")).to_be_visible()
    print("--- UI elements for unstaked hero are visible ---")

    # --- Screenshot ---
    screenshot_path = "jules-scratch/verification/staking-ui-verification.png"
    page.screenshot(path=screenshot_path)
    print(f"--- Screenshot captured: {screenshot_path} ---")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_staking_ui(page)
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()