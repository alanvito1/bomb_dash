import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # --- Start Console Message Listener ---
    # This is the key to debugging client-side errors.
    # We will collect all console messages into a list.
    console_messages = []
    page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
    # --- End Console Message Listener ---

    try:
        # Step 1: Navigate to the app
        page.goto("http://localhost:5173/")

        # Step 2: Wait for the game to load past the initial asset loading screen.
        # We'll wait for the "Web3 Login" button, which appears on the AuthChoiceScene.
        web3_login_button = page.get_by_role("button", name="Web3 Login")
        expect(web3_login_button).to_be_visible(timeout=10000) # Reduced timeout, it should be fast now

        # ... (rest of the script remains the same, but it will likely fail before this)

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        print("Error screenshot saved to jules-scratch/verification/error_screenshot.png")

    finally:
        # --- Print Captured Console Logs ---
        print("\n--- Captured Browser Console Logs ---")
        if console_messages:
            for msg in console_messages:
                print(msg)
        else:
            print("No console messages were captured.")
        print("------------------------------------")
        # --- End Print ---
        browser.close()

with sync_playwright() as playwright:
    run(playwright)