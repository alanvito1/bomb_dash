from playwright.sync_api import sync_playwright, expect, Page
import time

def run(page: Page):
    # Capture and print all browser console messages
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

    # --- Mock API Endpoints ---
    # 1. Mock the contracts endpoint
    page.route("**/api/contracts", lambda route: route.fulfill(
        status=200,
        json={
            "success": True,
            "wagerArenaAddress": "0x0000000000000000000000000000000000000001",
            "heroStakingAddress": "0x0000000000000000000000000000000000000002",
            "mockHeroNFTAddress": "0x0000000000000000000000000000000000000003",
            "bcoinTokenAddress": "0x0000000000000000000000000000000000000004",
            "tournamentControllerAddress": "0x0000000000000000000000000000000000000005",
            "perpetualRewardPoolAddress": "0x0000000000000000000000000000000000000006",
        }
    ))

    # 2. Mock the session check endpoint
    page.route("**/api/auth/me", lambda route: route.fulfill(
        status=200,
        json={
            "success": True,
            "user": { "id": 1, "address": "0x123...abc", "account_level": 5, "account_xp": 100, "coins": 500 }
        }
    ))

    # 3. Mock the hero list endpoint for CharacterSelectionScene
    page.route("**/api/heroes", lambda route: route.fulfill(
        status=200,
        json={
            "success": True,
            "heroes": [
                {"id": 1, "name": "Ninja", "sprite_name": "ninja", "level": 1, "xp": 0, "hero_type": "mock", "status": "in_wallet"},
                {"id": 2, "name": "Witch", "sprite_name": "witch", "level": 2, "xp": 50, "hero_type": "mock", "status": "in_wallet"},
            ]
        }
    ))

    # --- Helper function to click Phaser objects ---
    def click_phaser_object(scene_key, object_name, event_type='pointerup'):
        js_code = f"""
        (async () => {{
            const scene = window.game.scene.getScene('{scene_key}');
            if (!scene) return false;
            // Search recursively in the display list
            let objectToClick = null;
            function findObject(container) {{
                for (const child of container.list) {{
                    if (child.name === '{object_name}') {{
                        objectToClick = child;
                        return;
                    }}
                    if (child.list) {{ // It's a container
                        findObject(child);
                        if (objectToClick) return;
                    }}
                }}
            }}
            findObject(scene.children);

            if (objectToClick && objectToClick.input && objectToClick.input.enabled) {{
                objectToClick.emit('{event_type}');
                return true;
            }}
            return false;
        }})()
        """
        result = page.evaluate(js_code)
        if not result:
            raise Exception(f"Could not find or click object '{object_name}' in scene '{scene_key}'")


    # --- Test Execution ---
    page.goto("http://localhost:5173/")
    page.evaluate("localStorage.setItem('termsAccepted', 'true')")
    page.evaluate("localStorage.setItem('jwtToken', 'fake_token')")
    page.reload()

    page.wait_for_function("window.game && window.game.scene.getScene('MenuScene').scene.isActive()", timeout=15000)
    print("MenuScene is active.")

    click_phaser_object('MenuScene', 'solo_button')
    print("Clicked 'Solo' button.")

    page.wait_for_function("window.game.scene.getScene('CharacterSelectionScene').scene.isActive()")
    print("CharacterSelectionScene is active.")

    page.wait_for_function("window.game.scene.getScene('CharacterSelectionScene').heroCards.length > 0")

    page.evaluate("""() => {
        const scene = window.game.scene.getScene('CharacterSelectionScene');
        const firstCard = scene.heroCards[0].card;
        firstCard.emit('pointerdown');
    }""")
    print("Selected the first hero.")

    click_phaser_object('CharacterSelectionScene', 'confirm_button', 'pointerdown')
    print("Clicked 'Start Game' button.")

    # --- Verification ---
    page.wait_for_function("window.game.scene.getScene('GameScene').isInitialized")
    print("GameScene is initialized, confirming the crash is fixed.")

    time.sleep(2)

    page.keyboard.press('Escape')
    print("Pressed 'Escape' to pause the game.")

    page.wait_for_function("window.game.scene.getScene('PauseScene').scene.isActive()")
    print("PauseScene is active, confirming the pause manager works.")

    screenshot_path = "jules-scratch/verification/verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run(page)
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()