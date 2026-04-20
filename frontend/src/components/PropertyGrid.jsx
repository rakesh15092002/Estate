import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PropertyCard from './PropertyCard'
import { getProperties } from '../services/api'

/** @param {unknown} price */
function formatListingPrice(price) {
  if (price === null || price === undefined) {
    return { primary: 'Price on request', showMonthlySuffix: false }
  }
  if (typeof price === 'string') {
    const t = price.trim()
    if (t === '') return { primary: 'Price on request', showMonthlySuffix: false }
    if (t.startsWith('$')) return { primary: t, showMonthlySuffix: true }
    const n = Number(t.replace(/,/g, ''))
    if (Number.isFinite(n) && !Number.isNaN(n)) {
      return { primary: `$${n.toLocaleString()}`, showMonthlySuffix: true }
    }
    return { primary: 'Price on request', showMonthlySuffix: false }
  }
  if (typeof price === 'number') {
    if (!Number.isFinite(price) || Number.isNaN(price)) {
      return { primary: 'Price on request', showMonthlySuffix: false }
    }
    return { primary: `$${price.toLocaleString()}`, showMonthlySuffix: true }
  }
  return { primary: 'Price on request', showMonthlySuffix: false }
}

/**
 * Trim/normalize scraped text and limit visual length.
 * @param {unknown} value
 * @param {number} maxLen
 */
function truncateText(value, maxLen) {
  if (typeof value !== 'string') return ''
  const clean = value.replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen)}...`
}

function PropertyModal({ property, onClose }) {
  if (!property) return null
  const sqft = property.sqft ?? '—'
  const amenities = Array.isArray(property.amenities) ? property.amenities : []
  const priceDisplay = formatListingPrice(property.price)
  const modalDescription = truncateText(property.description, 300)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,14,26,0.85)] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[rgba(201,168,76,0.25)] bg-gradient-to-br from-[#1A2340] to-[#111827] shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-modal-title"
      >
        <div className="relative h-48 bg-[#0A0E1A]">
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1A2340] to-[#0A0E1A]">
            <svg className="h-16 w-16 text-[#2A3452]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(0,0,0,0.5)] transition-colors hover:bg-[rgba(201,168,76,0.2)]"
            aria-label="Close"
          >
            <svg className="h-4 w-4 text-[#9AA0B0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-4">
            <p className="text-2xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {priceDisplay.primary}
              {priceDisplay.showMonthlySuffix ? (
                <span className="ml-1 text-sm font-normal text-[#9AA0B0]">/mo</span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <h2 id="property-modal-title" className="text-xl text-[#F0EDE6]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              {property.title}
            </h2>
            <p className="mt-1 text-xs text-[#9AA0B0]">{property.address}</p>
          </div>
          <p className="text-sm leading-relaxed text-[#9AA0B0]">{modalDescription}</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Bedrooms', value: property.bedrooms === 0 ? 'Studio' : property.bedrooms },
              { label: 'Bathrooms', value: property.bathrooms },
              { label: 'Area', value: typeof sqft === 'number' ? `${sqft} sqft` : sqft },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[rgba(201,168,76,0.08)] bg-[#0A0E1A] p-3 text-center"
              >
                <p className="text-xs font-bold text-[#C9A84C]">{stat.value}</p>
                <p className="mt-0.5 text-[10px] text-[#4A5568]">{stat.label}</p>
              </div>
            ))}
          </div>

          {amenities.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#4A5568]">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-[rgba(201,168,76,0.15)] bg-[#1A2340] px-2.5 py-1 text-[11px] text-[#9AA0B0]"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg py-2.5 text-sm font-medium text-[#0A0E1A] transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #8A6E2F)' }}
            >
              Schedule Tour
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border border-[rgba(201,168,76,0.3)] py-2.5 text-sm text-[#C9A84C] transition-colors hover:bg-[rgba(201,168,76,0.08)]"
            >
              View Lease Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildQuery(filters) {
  const q = {}
  if (filters == null) return q
  const { maxPrice, city, petFriendly } = filters
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') q.maxPrice = maxPrice
  if (city !== undefined && city !== null && String(city).trim() !== '') q.city = String(city).trim()
  if (petFriendly === true || petFriendly === false) q.petFriendly = petFriendly
  return q
}

/**
 * @param {{ refreshTrigger?: number, filters?: { maxPrice?: number, city?: string, petFriendly?: boolean } | undefined }} props
 */
export default function PropertyGrid({ refreshTrigger = 0, filters = undefined }) {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [selected, setSelected] = useState(null)

  const maxPrice = filters?.maxPrice
  const city = filters?.city
  const petFriendly = filters?.petFriendly

  const query = useMemo(() => buildQuery({ maxPrice, city, petFriendly }), [maxPrice, city, petFriendly])

  const fetchProperties = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    try {
      const data = await getProperties(query)
      const list = data?.properties ?? (Array.isArray(data) ? data : [])
      setProperties(Array.isArray(list) ? list : [])
    } catch {
      setProperties([])
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchProperties()
  }, [refreshTrigger, fetchProperties])

  useEffect(() => {
    const onPropertiesUpdated = () => {
      void fetchProperties()
    }
    window.addEventListener('properties-updated', onPropertiesUpdated)
    return () => {
      window.removeEventListener('properties-updated', onPropertiesUpdated)
    }
  }, [fetchProperties])

  return (
    <>
      {selected && <PropertyModal property={selected} onClose={() => setSelected(null)} />}

      <div className="flex h-full min-h-0 flex-col border-[rgba(201,168,76,0.08)]">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[rgba(201,168,76,0.1)] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg text-[#F0EDE6]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Listings
            </h2>
            {!loading && (
              <span className="rounded-full bg-[rgba(201,168,76,0.1)] px-2 py-0.5 font-mono text-[11px] text-[#C9A84C]">
                {properties.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={fetchProperties}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(201,168,76,0.2)] bg-[#1A2340] px-3 py-2 text-xs font-medium text-[#9AA0B0] transition-colors hover:border-[rgba(201,168,76,0.35)] hover:text-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </header>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-xl border border-[rgba(201,168,76,0.08)] bg-[#1A2340]"
                />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1A2340]">
                <svg className="h-7 w-7 text-[#4A5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#9AA0B0]">No properties found</p>
              {fetchError ? (
                <p className="max-w-xs text-xs text-[#4A5568]">Could not reach the API. Confirm the backend is running.</p>
              ) : (
                <p className="max-w-xs text-xs text-[#4A5568]">Try adjusting filters or ask the agent to search listings.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {properties.map((p) => (
                <PropertyCard
                  key={p.id || p._id}
                  title={p.title}
                  address={p.address}
                  price={p.price}
                  description={p.description ?? ''}
                  folderPath={p.folder_path}
                  screenshotPath={p.screenshot_path}
                  screenshot={p.screenshot || p.leaseFolder || p.folder}
                  petFriendly={p.petFriendly}
                  bedrooms={p.bedrooms}
                  bathrooms={p.bathrooms}
                  onSelect={() => setSelected(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
