import type { Geo, VendorCategory } from '@/lib/schemas'
import { fetchJson, type SourceResult } from './http'

/**
 * Overpass, over OpenStreetMap data. Free and keyless, but shared — one query
 * per research run, cached for a day, and a single retry is the user's job
 * rather than ours.
 *
 * OSM carries no prices and almost never carries capacity. Everything returned
 * here is therefore evidence status `unknown` for both, and the UI says so.
 */

const ENDPOINT = 'https://overpass-api.de/api/interpreter'

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = { elements?: OverpassElement[] }

export type VenueCandidate = {
  osmId: string
  name: string
  category: VendorCategory
  geo: Geo
  address: string | null
  /** The OSM tag that matched, shown as the extracted fact. */
  kind: string
}

/**
 * Venue-ish things near a point. The filters mirror the brief: event venues,
 * community centres, parks and gardens, and banquet halls.
 */
function query(geo: Geo, radiusMetres: number): string {
  const around = `(around:${radiusMetres},${geo.lat},${geo.lon})`
  return `[out:json][timeout:25];
(
  node["amenity"="events_venue"]${around};
  way["amenity"="events_venue"]${around};
  node["amenity"="community_centre"]${around};
  way["amenity"="community_centre"]${around};
  way["leisure"="park"]${around};
  way["leisure"="garden"]${around};
  node["amenity"="banquet_hall"]${around};
  way["amenity"="banquet_hall"]${around};
);
out center tags 40;`
}

const KIND_LABEL: Record<string, string> = {
  events_venue: 'Event venue',
  community_centre: 'Community centre',
  banquet_hall: 'Banquet hall',
  park: 'Public park',
  garden: 'Garden',
}

export async function findVenues(
  geo: Geo,
  radiusMetres = 6_000,
): Promise<SourceResult<VenueCandidate[]>> {
  const result = await fetchJson<OverpassResponse>(ENDPOINT, {
    label: 'Overpass',
    method: 'POST',
    body: `data=${encodeURIComponent(query(geo, radiusMetres))}`,
    contentType: 'application/x-www-form-urlencoded',
    revalidate: 86_400,
    // Overpass is slower than the others and asks for patience over retries.
    timeoutMs: 50_000,
  })

  if (!result.ok) return result

  const candidates: VenueCandidate[] = []

  for (const element of result.data.elements ?? []) {
    const tags = element.tags ?? {}
    const name = tags.name?.trim()
    // An unnamed polygon is not something a user can book.
    if (!name) continue

    const point = element.center ?? { lat: element.lat, lon: element.lon }
    if (typeof point.lat !== 'number' || typeof point.lon !== 'number') continue

    const kindKey = tags.amenity ?? tags.leisure ?? 'venue'

    candidates.push({
      osmId: `${element.type}/${element.id}`,
      name,
      category: 'venue',
      geo: { lat: point.lat, lon: point.lon },
      address: formatAddress(tags),
      kind: KIND_LABEL[kindKey] ?? kindKey.replace(/_/g, ' '),
    })
  }

  // Deduplicate by name: OSM often holds a node and a way for one place.
  const seen = new Set<string>()
  const unique = candidates.filter((c) => {
    const key = c.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { ok: true, fetchedAt: result.fetchedAt, data: unique.slice(0, 12) }
}

function formatAddress(tags: Record<string, string>): string | null {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:suburb'],
    tags['addr:city'],
  ].filter((p) => p && p.length)
  return parts.length ? parts.join(', ') : null
}

/** The attribution OpenStreetMap's licence requires wherever data is shown. */
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)'
export const OSM_URL = 'https://www.openstreetmap.org'
