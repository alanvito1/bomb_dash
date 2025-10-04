from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to the root URL where Vite is serving the app
            page.goto("http://localhost:5173", timeout=60000)

            # Wait for a known element that should appear on the loading screen
            # The game canvas is a good candidate
            canvas = page.locator('canvas')
            expect(canvas).to_be_visible(timeout=30000)

            print("Application loaded successfully. Taking screenshot.")
            page.screenshot(path="jules-scratch/verification/startup_verification.png")
            print("Screenshot saved to jules-scratch/verification/startup_verification.png")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            # Take a screenshot even on failure to see the state of the page
            page.screenshot(path="jules-scratch/verification/startup_failure.png")
            print("Failure screenshot saved to jules-scratch/verification/startup_failure.png")

        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()