
from playwright.sync_api import sync_playwright

def verify_avre_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the file directly
        page.goto("file:///app/index.html")

        # Inject styles to simulate the dark background properly if not loaded (though body has it)
        # and wait for a moment
        page.wait_for_timeout(1000)

        # Take a screenshot of the initial state
        page.screenshot(path="/app/verification/initial_load.png")
        print("Initial screenshot taken.")

        # Simulate Konami code
        keys = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]
        for key in keys:
            page.keyboard.press(key)
            page.wait_for_timeout(100)

        page.wait_for_timeout(1000) # Wait for animation
        page.screenshot(path="/app/verification/avre_mode.png")
        print("AVRE mode screenshot taken.")

        # Also check the form styles by making the login form visible via JS
        page.evaluate("document.getElementById(\"login-form-container\").style.display = \"flex\"")
        page.wait_for_timeout(500)
        page.screenshot(path="/app/verification/login_form.png")
        print("Login form screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_avre_ui()
