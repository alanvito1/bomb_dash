from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Load Game
    print("Loading game...")
    page.goto("http://localhost:5173")

    # 2. Click Play Now
    print("Clicking Play Now...")
    page.click("#start-game-btn")

    # 3. Handle ToS
    print("Handling ToS...")
    page.wait_for_selector("#tos-modal")
    page.check("#tos-checkbox")
    page.click("#tos-btn")

    # 4. Handle Auth (Guest)
    print("Logging in as Guest...")
    page.wait_for_selector("#auth-menu")
    page.click("#btn-login-guest")

    # 5. Wait for Game Canvas
    print("Waiting for Game Canvas...")
    page.wait_for_selector("#game-container canvas", state="visible")

    # 6. Wait for MenuScene to be ready
    print("Waiting for MenuScene...")
    # Polling for scene existence
    page.wait_for_function("""
        () => window.game &&
              window.game.scene &&
              window.game.scene.keys &&
              window.game.scene.keys.MenuScene &&
              window.game.scene.keys.MenuScene.sys.settings.active
    """)

    # Give it a moment to render
    time.sleep(2)

    # 7. Open Settings Modal via Console
    print("Opening Settings Modal...")
    page.evaluate("window.game.scene.keys.MenuScene.settingsModal.open()")

    # Wait for modal animation
    time.sleep(1)

    # 8. Screenshot 1: Default (ON)
    print("Taking screenshot: Retro Filter ON")
    page.screenshot(path="verification_retro_on.png")

    # 9. Toggle Retro Filter
    # Find the button via text in the canvas? Hard.
    # Use evaluate to click or find the button object.
    # SettingsModal stores the button in this.retroBtn
    print("Toggling Retro Filter...")
    page.evaluate("""
        const modal = window.game.scene.keys.MenuScene.settingsModal;
        if (modal.retroBtn) {
            // Simulate click
            modal.retroBtn.emit('pointerup');
        }
    """)

    time.sleep(0.5)

    # 10. Screenshot 2: Retro Filter OFF
    print("Taking screenshot: Retro Filter OFF")
    page.screenshot(path="verification_retro_off.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
