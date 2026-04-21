import React, { useEffect, useMemo, useState } from 'react'

const FILES_BASE = 'http://localhost:8000/files/listings'

/**
 * From ``folder_path``: split on `/` and `\`, find `listings`, use the folder name
 * immediately after it (no encoding). `{FILES_BASE}/{folder_name}/screenshot.png`.
 * @param {string} folderPathAbsolute
 */
function screenshotUrlFromFolderPath(folderPathAbsolute) {
  if (!folderPathAbsolute || typeof folderPathAbsolute !== 'string') return ''
  const parts = folderPathAbsolute.trim().split(/[/\\]+/).filter(Boolean)
  const listingsIdx = parts.findIndex((p) => p.toLowerCase() === 'listings')
  if (listingsIdx === -1 || listingsIdx >= parts.length - 1) return ''
  const folderName = parts[listingsIdx + 1]
  if (!folderName || /\.png$/i.test(folderName)) return ''
  return `${FILES_BASE}/${folderName}/screenshot.png`
}

/**
 * From ``screenshot_path``: same split/listings logic; folder name is first segment
 * after `listings`, skipping a trailing ``screenshot.png`` segment if present.
 * @param {string} screenshotPathAbsolute
 */
function screenshotUrlFromScreenshotPath(screenshotPathAbsolute) {
  if (!screenshotPathAbsolute || typeof screenshotPathAbsolute !== 'string') return ''
  const parts = screenshotPathAbsolute.trim().split(/[/\\]+/).filter(Boolean)
  const listingsIdx = parts.findIndex((p) => p.toLowerCase() === 'listings')
  if (listingsIdx === -1 || listingsIdx >= parts.length - 1) return ''
  let after = parts.slice(listingsIdx + 1)
  if (after.length >= 2 && /\.png$/i.test(after[after.length - 1])) {
    after = after.slice(0, -1)
  }
  const folderName = after[0]
  if (!folderName || /\.png$/i.test(folderName)) return ''
  return `${FILES_BASE}/${folderName}/screenshot.png`
}

/**
 * Last path segment for legacy `screenshot` / lease folder slug fields.
 * @param {string} [raw]
 */
function folderSlug(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const s = raw.replace(/\\/g, '/').replace(/^\.\/+/, '')
  const parts = s.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

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

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.address
 * @param {number|string|null|undefined} props.price
 * @param {string} props.description
 * @param {string} [props.folderPath] — MongoDB ``folder_path`` (absolute dir under …/listings/…)
 * @param {string} [props.screenshotPath] — MongoDB ``screenshot_path`` (absolute path to screenshot.png)
 * @param {string} [props.screenshot] — fallback: full image URL, `/public` path, or listing folder slug
 * @param {boolean} [props.petFriendly]
 * @param {number} props.bedrooms
 * @param {number} props.bathrooms
 * @param {() => void} [props.onSelect]
 */
export default function PropertyCard({
  title,
  address,
  price,
  description,
  folderPath,
  screenshotPath,
  screenshot,
  petFriendly,
  bedrooms,
  bathrooms,
  onSelect,
}) {
  const [imgFailed, setImgFailed] = useState(false)

  const imageSrc = useMemo(() => {
    const fromFolder = screenshotUrlFromFolderPath(folderPath || '')
    if (fromFolder) return fromFolder
    const fromScreenshotFile = screenshotUrlFromScreenshotPath(screenshotPath || '')
    if (fromScreenshotFile) return fromScreenshotFile
    const s = screenshot
    if (!s || typeof s !== 'string') return ''
    const t = s.trim()
    if (!t) return ''
    if (t.startsWith('http://') || t.startsWith('https://')) return t
    if (t.startsWith('/')) return t
    const slug = folderSlug(t)
    if (!slug) return ''
    return `${FILES_BASE}/${slug}/screenshot.png`
  }, [folderPath, screenshotPath, screenshot])

  useEffect(() => {
    setImgFailed(false)
  }, [imageSrc])

  const showImage = Boolean(imageSrc) && !imgFailed

  const priceDisplay = useMemo(() => formatListingPrice(price), [price])
  const shortDescription = useMemo(() => truncateText(description, 150), [description])

  const bedLabel = bedrooms === 0 ? 'Studio' : `${bedrooms} bed`

  return (
    <button
      type="button"
      onClick={() => onSelect?.()}
      className="group w-full overflow-hidden rounded-xl border border-[rgba(201,168,76,0.12)] bg-gradient-to-br from-[#1A2340] to-[#111827] text-left shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(201,168,76,0.28)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/50"
    >
      <div className="relative h-44 w-full overflow-hidden bg-[#1f2937]">
        {showImage ? (
          <img
            src={imageSrc}
            alt={title || 'Listing photo'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#374151] to-[#1f2937]">
            <svg className="h-10 w-10 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.25} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">NO PHOTO</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111827]/90 via-transparent to-transparent" />
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-medium leading-snug text-[#F0EDE6]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {title}
          </h3>
          <p className="text-xs leading-relaxed text-[#9AA0B0]">{address}</p>
          <p className="text-xl font-bold text-[#C9A84C]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {priceDisplay.primary}
            {priceDisplay.showMonthlySuffix ? (
              <span className="ml-1 text-xs font-semibold text-[#9AA0B0]">/mo</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[rgba(201,168,76,0.15)] bg-[#0A0E1A] px-2.5 py-1 text-[11px] text-[#9AA0B0]">
            {bedLabel}
          </span>
          <span className="inline-flex items-center rounded-full border border-[rgba(201,168,76,0.15)] bg-[#0A0E1A] px-2.5 py-1 text-[11px] text-[#9AA0B0]">
            {bathrooms} bath
          </span>
          {petFriendly ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#C9A84C]">
              <span aria-hidden>🐾</span>
              Pet friendly
            </span>
          ) : null}
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-[#9AA0B0]">{shortDescription}</p>
      </div>
    </button>
  )
}
