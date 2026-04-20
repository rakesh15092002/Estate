"""Headless browser automation for EstateScout (map simulator screenshots)."""

from __future__ import annotations

import asyncio
import re
from pathlib import Path

# Imported inside inspect_property so the API can start without Playwright installed.


def _sanitize_address_for_path(address: str) -> str:
    """Turn a free-form address into a single filesystem-safe folder name."""
    s = (address or "").strip().lower()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", s)
    s = re.sub(r"_+", "_", s).strip("._")
    return s or "unknown_address"


def _screenshot_path(address: str) -> Path:
    backend_root = Path(__file__).resolve().parent.parent
    safe = _sanitize_address_for_path(address)
    return backend_root / "data" / "listings" / safe / "screenshot.png"


async def inspect_property(
    address: str,
    map_url: str = "http://localhost:3000/map-simulator",
) -> str:
    """
    Open the map simulator, search an address, open street view, and save a screenshot.

    Saves to ``data/listings/{sanitized_address}/screenshot.png`` under the backend package.
    Returns the absolute path to the PNG file.
    """
    stripped = address.strip()
    if not stripped:
        raise ValueError("address must be non-empty")

    try:
        from playwright.async_api import async_playwright
    except ModuleNotFoundError as e:
        raise RuntimeError(
            "Playwright is not installed. Run: pip install playwright && playwright install chromium"
        ) from e

    out_path = _screenshot_path(stripped)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.goto(map_url, wait_until="domcontentloaded", timeout=60_000)
            await page.wait_for_selector("#address-input", state="visible", timeout=30_000)

            await page.fill("#address-input", stripped)
            await page.get_by_test_id("view-street-view").click()
            await asyncio.sleep(2)
            await page.screenshot(path=str(out_path))
        finally:
            await browser.close()

    return str(out_path.resolve())
