import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Define the mock user data
        mock_user = {
            "id": 1,
            "address": '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            "heroes": [
                { "id": 1, "sprite_name": 'Ninja', "level": 1, "xp": 10 },
                { "id": 2, "sprite_name": 'Witch', "level": 5, "xp": 550 }
            ]
        }

        # Intercept the network request that checks the login status
        await page.route("**/api/auth/me", lambda route:
            route.fulfill(
                status=200,
                json={ "success": True, "user": mock_user }
            )
        )

        # Set a dummy token in localStorage BEFORE navigating.
        # The app's ApiClient will use this token to make the /api/auth/me call.
        await page.evaluate("localStorage.setItem('jwtToken', 'fake-test-token')")

        # Navigate to the game. The LoadingScene will now make a real API call
        # which we intercept and mock, ensuring a smooth transition to MenuScene.
        await page.goto("http://localhost:5173/")

        # Wait for the MenuScene to load by looking for the PvP button
        await expect(page.get_by_role('button', name='PvP Ranqueado')).to_be_visible(timeout=15000)

        # Click the PvP button to navigate to the scene we want to verify
        await page.get_by_role('button', name='PvP Ranqueado').click()

        # Wait for the PvP scene to load and verify its title
        await expect(page.get_by_text('PvP 1v1 Ranqueado')).to_be_visible()

        # Verify that the hero cards from our mock user data are displayed
        await expect(page.get_by_text('Ninja (Lvl: 1)')).to_be_visible()
        await expect(page.get_by_text('Witch (Lvl: 5)')).to_be_visible()

        # Take the screenshot for visual confirmation
        await page.screenshot(path="jules-scratch/verification/pvp_scene_verification.png")
        print("Screenshot saved to jules-scratch/verification/pvp_scene_verification.png")

        await browser.close()

asyncio.run(main())