import asyncio
import os
from playwright.async_api import async_playwright

CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"

async def capture_demo_scenes():
    os.makedirs("video_assets", exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=CHROME_PATH,
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--window-size=1920,1080"]
        )
        context = await browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page = await context.new_page()

        print("[Playwright] Loading http://localhost:8000 ...")
        await page.goto("http://localhost:8000", wait_until="networkidle")
        await page.wait_for_timeout(2500)

        # Scene 1: Overview
        print("[Playwright] Capturing Scene 1: Architecture Overview...")
        await page.screenshot(path="video_assets/scene1_overview.png")

        # Scene 2: Attack Path
        print("[Playwright] Clicking Show Attack Path...")
        await page.click("button:has-text('Show Attack Path')")
        await page.wait_for_timeout(1800)
        await page.screenshot(path="video_assets/scene2_attack_path.png")

        # Scene 3: View Evidence
        print("[Playwright] Clicking View Evidence...")
        await page.click("button:has-text('View Evidence')")
        await page.wait_for_timeout(1200)
        await page.screenshot(path="video_assets/scene3_evidence.png")

        # Scene 4: Safe Fix Preview
        print("[Playwright] Opening Safe Fix Preview...")
        await page.click("#evidence-modal .close-btn")
        await page.wait_for_timeout(500)
        await page.click("button:has-text('Review & Apply Safe Fix')")
        await page.wait_for_timeout(1200)
        await page.screenshot(path="video_assets/scene4_safe_fix.png")

        # Scene 5: Apply Patch & Re-verify
        print("[Playwright] Applying Patch...")
        await page.click("#btn-apply-patch")
        await page.wait_for_timeout(3000)
        await page.screenshot(path="video_assets/scene5_verified.png")

        # Scene 6: Blast Radius
        print("[Playwright] Scanning Blast Radius...")
        await page.select_option("#blast-target", "verify_jwt")
        await page.click("button:has-text('Scan Impact')")
        await page.wait_for_timeout(1800)
        await page.screenshot(path="video_assets/scene6_blast_radius.png")

        await browser.close()
        print("[Playwright] All 6 demo scenes successfully captured in video_assets/!")

if __name__ == "__main__":
    asyncio.run(capture_demo_scenes())
