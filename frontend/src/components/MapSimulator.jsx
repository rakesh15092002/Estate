import React, { useEffect, useState, useCallback } from 'react'
import { searchMap } from '../services/api'

function escapeForSvg(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Offline-safe placeholder “street view” frame for Playwright screenshots. */
function streetViewPlaceholderDataUrl(addressLine) {
  const label = escapeForSvg(addressLine || '—')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480" viewBox="0 0 960 480">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="55%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="960" height="480" fill="url(#sky)"/>
  <rect x="0" y="300" width="960" height="180" fill="url(#road)"/>
  <rect x="80" y="120" width="72" height="200" fill="#1e293b" opacity="0.95"/>
  <rect x="180" y="80" width="90" height="240" fill="#334155" opacity="0.95"/>
  <rect x="300" y="140" width="65" height="180" fill="#1e293b" opacity="0.95"/>
  <rect x="520" y="60" width="110" height="260" fill="#475569" opacity="0.95"/>
  <rect x="700" y="100" width="85" height="220" fill="#1e293b" opacity="0.95"/>
  <line x1="0" y1="318" x2="960" y2="318" stroke="#C9A84C" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="14 18"/>
  <text x="480" y="395" text-anchor="middle" fill="#94a3b8" font-family="system-ui,Segoe UI,sans-serif" font-size="15">Street view placeholder</text>
  <text x="480" y="428" text-anchor="middle" fill="#C9A84C" font-family="system-ui,Segoe UI,sans-serif" font-size="13">${label}</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Map simulator for browser automation (Playwright) and manual checks.
 * @param {{ standalone?: boolean }} props — `standalone` when routed at `/map-simulator`
 */
export default function MapSimulator({ standalone = false }) {
  const [address, setAddress] = useState('')
  const [searched, setSearched] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.__mapSimulator = {
      setAddress: (v) => setAddress(String(v ?? '')),
      triggerSearch: () => document.querySelector('[data-testid="view-street-view"]')?.click(),
    }
    return () => {
      delete window.__mapSimulator
    }
  }, [])

  const handleViewStreetView = useCallback(async () => {
    const trimmed = address.trim()
    if (!trimmed || loading) return

    setLoading(true)
    // 1) Show placeholder street view below (Playwright screenshots this region)
    setSearched(trimmed)
    setShowPreview(true)

    try {
      // 2) POST /api/map/search — services/api.searchMap(address)
      await searchMap(trimmed)
    } catch {
      /* UI still shows placeholder; backend may be offline */
    } finally {
      setLoading(false)
    }
  }, [address, loading])

  const shell = standalone
    ? 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6'
    : 'flex h-full min-h-0 flex-col'

  return (
    <div className={shell}>
      {standalone && (
        <header className="text-center">
          <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-[#C9A84C]">ESTATESCOUT · MAP SIMULATOR</p>
          <h1 className="text-3xl text-[#F0EDE6] sm:text-4xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Street view simulator
          </h1>
          <p className="mt-2 text-sm text-[#9AA0B0]">Used by the inspector agent for address verification.</p>
        </header>
      )}

      {!standalone && (
        <div className="shrink-0 border-b border-[rgba(201,168,76,0.1)] px-4 py-3 sm:px-5">
          <h2 className="text-base text-[#F0EDE6]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Map simulator
          </h2>
          <p className="mt-0.5 text-[10px] text-[#4A5568]">Route: /map-simulator</p>
        </div>
      )}

      <div className={`flex flex-col gap-4 ${standalone ? '' : 'min-h-0 flex-1 px-4 pb-4 pt-3 sm:px-5'}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {/* Playwright: page.wait_for_selector('#address-input') */}
          <input
            id="address-input"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleViewStreetView()
            }}
            placeholder="Enter property address…"
            autoComplete="street-address"
            className="min-h-[48px] flex-1 rounded-xl border border-[rgba(201,168,76,0.2)] bg-[#111827] px-4 py-3 text-sm text-[#F0EDE6] placeholder-[#4A5568] outline-none ring-0 transition-colors focus:border-[rgba(201,168,76,0.55)]"
          />
          {/* Playwright: page.get_by_test_id('view-street-view') */}
          <button
            type="button"
            data-testid="view-street-view"
            onClick={handleViewStreetView}
            disabled={!address.trim() || loading}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl px-5 text-sm font-semibold text-[#0A0E1A] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #8A6E2F)' }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Working…
              </span>
            ) : (
              'View street view'
            )}
          </button>
        </div>

        <div
          className={`overflow-hidden rounded-xl border border-[rgba(201,168,76,0.12)] bg-[#0f172a]/80 ${standalone ? '' : 'min-h-[240px] flex-1'}`}
        >
          {!showPreview ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 py-16 text-center sm:min-h-[280px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A2340]">
                <svg className="h-6 w-6 text-[#4A5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <p className="text-sm text-[#6B7280]">Preview appears after you search an address.</p>
            </div>
          ) : (
            <figure className="m-0">
              <img
                src={streetViewPlaceholderDataUrl(searched)}
                alt={`Street view placeholder for ${searched}`}
                className="h-auto w-full object-cover object-center"
                width={960}
                height={480}
                decoding="async"
              />
              <figcaption className="border-t border-[rgba(201,168,76,0.08)] px-4 py-2 text-center text-[11px] text-[#4A5568]">
                Placeholder preview · POST /api/map/search notified for this address
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </div>
  )
}
