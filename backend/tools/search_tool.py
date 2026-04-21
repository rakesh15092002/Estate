"""Tavily-backed web search for real estate listings (EstateScout)."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

from config import settings

TAVILY_SEARCH_URL = "https://api.tavily.com/search"

_PRICE_RE = re.compile(
    r"\$\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|m(?:illion)?|thousand|k|bn|billion))?\b",
    re.IGNORECASE,
)
_ADDRESS_RE = re.compile(
    r"\b\d{1,5}\s+[NWSE]?\s*[A-Za-z0-9.#\s,'\-+]{3,100}?"
    r"(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Boulevard|Blvd\.?|"
    r"Lane|Ln\.?|Court|Ct\.?|Way|Place|Pl\.?|Terrace|Ter\.?|Circle|Cir\.?)\b",
    re.IGNORECASE,
)


def _parse_listing_fields(text: str) -> tuple[str, str]:
    """Best-effort price and street address from snippet text."""
    if not text:
        return "", ""
    price_m = _PRICE_RE.search(text)
    price = price_m.group(0).strip() if price_m else ""
    addr_m = _ADDRESS_RE.search(text)
    address = addr_m.group(0).strip() if addr_m else ""
    return address, price


def _result_to_property(item: dict[str, Any]) -> dict[str, str]:
    title = str(item.get("title") or "").strip()
    url = str(item.get("url") or "").strip()
    raw_description = str(
        item.get("content") or item.get("snippet") or item.get("raw_content") or ""
    )
    description = re.sub(r"<[^>]+>", "", raw_description)
    description = re.sub(r"\s+", " ", description).strip()
    description = description[:200]
    blob = f"{title}\n{description}"
    address, price = _parse_listing_fields(blob)
    return {
        "title": title,
        "url": url,
        "description": description,
        "address": address,
        "price": price,
    }


def _mock_properties() -> list[dict[str, str]]:
    return [
        {
            "title": "Bright 2BR condo near downtown — open house Sat",
            "url": "https://example.com/listings/mock-condo-101",
            "description": (
                "Corner unit with floor-to-ceiling windows, in-unit laundry, "
                "and a walk score of 92. HOA includes gym and roof deck."
            ),
            "address": "742 Evergreen Terrace, Springfield, IL 62704",
            "price": "$349,000",
        },
        {
            "title": "Single-family home with fenced yard and garage",
            "url": "https://example.com/listings/mock-house-42",
            "description": (
                "3 bed, 2 bath ranch on a quiet cul-de-sac. Updated kitchen (2023), "
                "hardwood floors, and mature trees. Great schools nearby."
            ),
            "address": "221B Baker Street, London, KY 40741",
            "price": "$425,000",
        },
    ]


def _tavily_search(query: str, api_key: str) -> list[dict[str, str]]:
    payload = {
        "api_key": api_key,
        "query": f"{query} real estate listing property home for sale",
        "search_depth": "advanced",
        "max_results": 10,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        TAVILY_SEARCH_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode("utf-8")
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
        return []

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []

    results = data.get("results")
    if not isinstance(results, list):
        return []

    out: list[dict[str, str]] = []
    for item in results:
        if isinstance(item, dict):
            out.append(_result_to_property(item))
    return out


def search_properties(query: str) -> list[dict]:
    """
    Search the web for real estate listings via Tavily.

    Returns a list of dicts with keys: title, url, description, address, price.
    If ``TAVILY_API_KEY`` is unset or empty, returns two fixed sample listings.
    """
    key = (settings.tavily_api_key or "").strip()
    if not key:
        return _mock_properties()
    stripped = query.strip()
    if not stripped:
        return []
    return _tavily_search(stripped, key)
