import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # 1. Navigate to the application
            await page.goto("http://localhost:5173/", timeout=15000)

            # 2. Log in as a guest to reach the main menu
            # Using get_by_text is a robust way to find the guest login button
            guest_login_button = page.get_by_text("Login as Guest")
            await expect(guest_login_button).to_be_visible(timeout=10000)
            await guest_login_button.click()

            # 3. Verify navigation to Account Hub and take a screenshot
            account_button = page.get_by_role("button", name="ACCOUNT")
            await expect(account_button).to_be_visible(timeout=10000)
            await account_button.click()

            account_hub_title = page.get_by_text("Account Hub")
            await expect(account_hub_title).to_be_visible(timeout=10000)
            await page.screenshot(path="jules-scratch/verification/account_hub_scene.png")
            print("Successfully captured screenshot of Account Hub.")

            # 4. Go back and navigate to Hero Inventory for a screenshot
            back_button = page.get_by_text("< Back to Menu")
            await expect(back_button).to_be_visible(timeout=10000)
            await back_button.click()

            heroes_button = page.get_by_role("button", name="HEROES")
            await expect(heroes_button).to_be_visible(timeout=10000)
            await heroes_button.click()

            hero_inventory_title = page.get_by_text("Hero Inventory")
            await expect(hero_inventory_title).to_be_visible(timeout=10000)
            await page.screenshot(path="jules-scratch/verification/hero_inventory_scene.png")
            print("Successfully captured screenshot of Hero Inventory.")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())