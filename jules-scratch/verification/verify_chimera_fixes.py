import pytest
from playwright.sync_api import Page, expect
import time

def test_chimera_directive_verification_with_mocking(page: Page):
    """
    This script verifies the fixes for directive BDW3-CHIMERA-ROOT-CAUSE-1.
    It uses a robust method of interacting with the Phaser game by evaluating JS,
    and it MOCKS the asynchronous web3Login function to ensure a fast and reliable test.
    """
    # 1. Arrange: Go to the local development server.
    try:
        page.goto("http://localhost:5173", timeout=60000)
    except Exception as e:
        print(f"Failed to connect to dev server. Is `npm run dev` running? Error: {e}")
        pytest.fail("Could not connect to the dev server.")

    # Wait for the game object and necessary services to be ready on the window.
    page.wait_for_function("window.game && window.i18nReady && window.api", timeout=30000)
    print("Game, i18n, and API service are ready.")

    # MOCK THE LOGIN FUNCTION! This is the key to a stable test.
    page.evaluate("""
        () => {
            window.api.web3Login = async () => {
                console.log('--- MOCKED web3Login called ---');
                const mockUser = { walletAddress: '0x1234...5678' };
                window.game.registry.set('loggedInUser', mockUser);
                return { success: true, user: mockUser };
            };
            console.log('--- web3Login has been mocked ---');
        }
    """)

    # Helper function to find and click a named object in a scene
    def click_named_object_in_scene(scene_key, object_name):
        print(f"Attempting to click object '{object_name}' in scene '{scene_key}'...")
        result = page.evaluate(f"""
            () => {{
                const scene = window.game.scene.getScene('{scene_key}');
                if (!scene || !scene.scene.isActive()) return 'SCENE_NOT_ACTIVE';
                function findObject(container) {{
                    for (const child of container.list) {{
                        if (child.name === '{object_name}') return child;
                        if (child.list) {{
                           const found = findObject(child);
                           if(found) return found;
                        }}
                    }}
                    return null;
                }}
                const foundObject = findObject(scene.children);
                if (foundObject && foundObject.input && foundObject.input.enabled) {{
                    foundObject.emit('pointerdown');
                    return 'CLICKED';
                }}
                return `OBJECT_NOT_FOUND_OR_ENABLED: {object_name}`;
            }}
        """)
        if result != 'CLICKED':
            pytest.fail(f"Failed to click object '{object_name}' in scene '{scene_key}'. Status: {result}")
        print(f"Successfully clicked object '{object_name}'.")

    # 2. Act: Navigate through the initial scenes
    # TermsScene
    page.wait_for_function("() => window.game.scene.getScene('TermsScene').scene.isActive()", timeout=15000)
    print("TermsScene is active.")
    page.evaluate("""
        () => {
            const scene = window.game.scene.getScene('TermsScene');
            if (scene && typeof scene.activateButton === 'function') {
                scene.activateButton();
            }
        }
    """)
    click_named_object_in_scene('TermsScene', 'acceptButton')

    # AuthChoiceScene -> MenuScene (uses the mock now)
    page.wait_for_function("() => window.game.scene.getScene('AuthChoiceScene').scene.isActive()", timeout=10000)
    print("AuthChoiceScene is active.")
    click_named_object_in_scene('AuthChoiceScene', 'web3LoginButton')

    # MenuScene -> CharacterSelectionScene.
    page.wait_for_function("() => window.game.scene.getScene('MenuScene').scene.isActive()", timeout=5000)
    print("MenuScene is active.")
    click_named_object_in_scene('MenuScene', 'solo_button')

    # CharacterSelectionScene -> GameScene.
    page.wait_for_function("() => window.game.scene.getScene('CharacterSelectionScene').scene.isActive()", timeout=10000)
    print("CharacterSelectionScene is active.")
    time.sleep(1)
    click_named_object_in_scene('CharacterSelectionScene', 'confirm_button')

    # 3. Assert & Screenshot 1: Verify the HUD on game start
    page.wait_for_function("() => window.game.scene.getScene('HUDScene').scene.isActive()", timeout=10000)
    print("HUDScene is active. Waiting for HUD to render.")
    time.sleep(2)

    print("Verifying HUD elements...")
    page.screenshot(path="jules-scratch/verification/verification_hud.png")
    print("HUD screenshot taken.")

    # 4. Assert & Screenshot 2: Verify gameplay
    print("Waiting for gameplay to unfold...")
    time.sleep(5)

    page.screenshot(path="jules-scratch/verification/verification_gameplay.png")
    print("Gameplay screenshot taken.")