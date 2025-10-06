from playwright.sync_api import sync_playwright, expect
import time

def login(page):
    """Helper function to perform login, adapted for canvas interaction."""
    page.goto("http://localhost:5173", wait_until='load', timeout=60000)

    # Wait for the game to be ready and expose the necessary login function
    page.wait_for_function("typeof window.api?.web3Login === 'function'", timeout=15000)

    # Use evaluate to trigger the login flow
    page.evaluate("window.api.web3Login()")

    # Wait for login to complete and the menu scene to be active
    page.wait_for_function("window.game && window.game.scene.isActive('MenuScene')", timeout=20000)
    print("Login successful, MenuScene is active.")

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console messages and print them to the terminal
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

    try:
        login(page)

        # Click the "Settings" button using page.evaluate
        page.evaluate("""
            const menuScene = window.game.scene.getScene('MenuScene');
            const settingsButton = menuScene.children.list.find(c => c.name === 'config_button');
            if (settingsButton) {
                settingsButton.emit('pointerdown');
            } else {
                throw new Error('Settings button not found on MenuScene.');
            }
        """)
        print("Clicked 'Settings' button.")

        # Wait for the ConfigScene to become active
        page.wait_for_function("window.game && window.game.scene.isActive('ConfigScene')", timeout=10000)
        print("ConfigScene is now active.")

        # Add a small delay to ensure the scene has fully rendered before screenshot
        time.sleep(1)

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot saved successfully to jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        print("Error screenshot saved for debugging.")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)