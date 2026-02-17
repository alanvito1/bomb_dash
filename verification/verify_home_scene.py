from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to home page...")
    try:
        # Vite starts on 5173
        page.goto("http://localhost:5173", timeout=30000)
    except Exception as e:
        print(f"Failed to navigate: {e}")
        return

    # Wait for the canvas (Phaser game)
    try:
        page.wait_for_selector("canvas", state="visible", timeout=10000)
        # Give it a moment to render the Home Scene
        page.wait_for_timeout(3000)

        print("Taking Home Scene screenshot...")
        page.screenshot(path="verification/home.png")

        # Click to transition
        print("Clicking to start...")
        page.locator("canvas").click()

        # Wait for Loading Scene
        page.wait_for_timeout(3000)
        print("Taking Loading Scene screenshot...")
        page.screenshot(path="verification/loading.png")

    except Exception as e:
        print(f"Error during interaction: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
