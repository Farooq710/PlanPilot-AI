import {
  EventRecord,
  type Plan,
  type ResearchProposal,
  type RiskProposal,
  type Vendor,
  type VendorCategory,
} from '@/lib/schemas'
import { inr } from '@/lib/money'
import { sampleVendorsFor } from '@/lib/sources/fallback'
import { holidaysNear, type Holiday, type HolidaySource } from '@/lib/sources/nager'
import {
  forecastForDate,
  geocodeCity,
  withinForecastWindow,
  type DayForecast,
} from '@/lib/sources/open-meteo'
import { OSM_ATTRIBUTION, OSM_URL, findVenues } from '@/lib/sources/overpass'
import {
  extractPriceINR,
  getSearchProvider,
  looksPerHead,
  type SearchHit,
} from '@/lib/sources/search'
import { applyAll } from './reducer'

/**
 * Runs every source, turns what came back into proposals, and lets the reducer
 * apply them. Each source is independent: one failing degrades its own
 * category and leaves the rest of the plan intact.
 */

export type CategoryStatus = {
  category: VendorCategory
  state: 'done' | 'failed' | 'skipped' | 'pending'
  found: number
  checked: number
  error?: string
}

export type WeatherReading = {
  available: boolean
  forecast: DayForecast | null
  reason: string
  fetchedAt: string
}

export type ResearchReport = {
  plan: Plan
  categories: CategoryStatus[]
  gaps: string[]
  weather: WeatherReading
  holidays: Holiday[]
  holidaySource: HolidaySource | null
  usedSampleData: boolean
  attributions: { label: string; url: string }[]
  rejected: { reason: string; detail?: string }[]
}

/** Categories we go looking for, in the order the UI lists them. */
const SEARCH_CATEGORIES: VendorCategory[] = ['venue', 'food', 'decor', 'cake', 'activities']

const SEARCH_TERMS: Record<VendorCategory, string> = {
  venue: 'party venue hire price',
  food: 'catering price per head',
  decor: 'event decor package price',
  cake: 'celebration cake price per kg',
  activities: 'event entertainment hire price',
  rentals: 'party equipment rental price',
}

export type ResearchOptions = {
  /**
   * Overpass regularly takes 30-50 seconds, so the Research Room loads without
   * it and fetches venues separately. Set this when blocking is acceptable.
   */
  includeVenues?: boolean
}

export async function runResearch(
  input: Plan,
  options: ResearchOptions = {},
): Promise<ResearchReport> {
  let event = input.event
  const categories: CategoryStatus[] = []
  const gaps: string[] = []
  const attributions: { label: string; url: string }[] = []

  /* ------------------------------------------------------------ geocode */

  if (!event.geo) {
    const geocoded = await geocodeCity(event.city)
    if (geocoded.ok && geocoded.data) {
      event = EventRecord.parse({
        ...event,
        geo: { lat: geocoded.data.lat, lon: geocoded.data.lon },
        updatedAt: new Date().toISOString(),
      })
    } else {
      gaps.push(`Could not place ${event.city} on the map, so nearby venues were skipped`)
    }
  }

  /* ------------------------------------- live sources, run concurrently */

  const searchProvider = getSearchProvider()

  const [weatherResult, venuesResult, holidaysResult, searchResults] = await Promise.all([
    readWeather(event),
    options.includeVenues && event.geo ? findVenues(event.geo) : Promise.resolve(null),
    holidaysNear(event.date),
    searchProvider.available
      ? Promise.all(
          SEARCH_CATEGORIES.map(async (category) => ({
            category,
            hits: await searchProvider.search(
              `${SEARCH_TERMS[category]} ${event.city}`,
            ),
          })),
        )
      : Promise.resolve(null),
  ])

  /* ------------------------------------------------------------ vendors */

  const vendors: ResearchProposal['vendors'] = []

  // Overpass: real places, but OSM holds neither price nor capacity.
  if (venuesResult?.ok) {
    attributions.push({ label: OSM_ATTRIBUTION, url: OSM_URL })
    for (const candidate of venuesResult.data) {
      vendors.push({
        name: candidate.name,
        category: 'venue',
        sourceUrl: `${OSM_URL}/${candidate.osmId}`,
        fetchedAt: venuesResult.fetchedAt,
        priceINR: null,
        capacity: null,
        geo: candidate.geo,
        address: candidate.address,
        fact: `${candidate.kind} on OpenStreetMap. No published price or capacity.`,
        evidence: {
          status: 'unknown',
          sourceUrl: `${OSM_URL}/${candidate.osmId}`,
          sourceDomain: 'openstreetmap.org',
          fetchedAt: venuesResult.fetchedAt,
          note: 'OpenStreetMap records the place, not its pricing',
        },
        shortlisted: false,
        confirmed: false,
      })
    }
    categories.push({
      category: 'venue',
      state: 'done',
      found: venuesResult.data.length,
      checked: venuesResult.data.length,
    })
    if (venuesResult.data.length) {
      gaps.push(
        `Capacity unknown for ${venuesResult.data.length} ${
          venuesResult.data.length === 1 ? 'venue' : 'venues'
        } — OpenStreetMap does not record it`,
      )
    }
  } else if (venuesResult && !venuesResult.ok) {
    categories.push({
      category: 'venue',
      state: 'failed',
      found: 0,
      checked: 0,
      error: venuesResult.error,
    })
  } else if (!options.includeVenues) {
    categories.push({ category: 'venue', state: 'pending', found: 0, checked: 0 })
  }

  // Web search: a price read out of a snippet is an estimate, never verified.
  if (searchResults) {
    for (const { category, hits } of searchResults) {
      const fromSearch = hits
        .map((hit) => vendorFromHit(hit, category))
        .filter((v): v is NonNullable<typeof v> => v !== null)

      vendors.push(...fromSearch)
      categories.push({
        category,
        state: 'done',
        found: fromSearch.length,
        checked: hits.length,
      })
      if (!fromSearch.length && hits.length) {
        gaps.push(`No published price found for ${category}`)
      }
    }
  } else {
    for (const category of SEARCH_CATEGORIES) {
      if (category === 'venue' && venuesResult) continue
      categories.push({
        category,
        state: 'skipped',
        found: 0,
        checked: 0,
        error: 'No SEARCH_API_KEY configured',
      })
    }
    gaps.push('Web research is off — add a SEARCH_API_KEY to look up real prices')
  }

  /* ------------------------------------- fall back only if nothing landed */

  const usedSampleData = vendors.length === 0 && Boolean(options.includeVenues)
  if (usedSampleData) {
    for (const sample of sampleVendorsFor([
      'venue',
      'food',
      'decor',
      'cake',
      'rentals',
    ])) {
      vendors.push({
        name: sample.name,
        category: sample.category,
        sourceUrl: null,
        fetchedAt: new Date().toISOString(),
        priceINR: sample.priceINR,
        capacity: sample.capacity,
        geo: null,
        address: sample.address,
        fact: sample.fact,
        evidence: sample.evidence,
        shortlisted: false,
        confirmed: false,
      })
    }
  }

  /* -------------------------------------------------------------- risks */

  const risks: RiskProposal['risks'] = [weatherRisk(event, weatherResult)]

  const holidayLookup = holidaysResult.ok ? holidaysResult.data : null
  const holidays = holidayLookup?.holidays ?? []
  if (holidayLookup?.caveat) gaps.push(holidayLookup.caveat)

  if (holidays.length) {
    const nearest = holidays[0]
    risks.push({
      kind: 'holiday',
      title:
        nearest.offsetDays === 0
          ? `${nearest.name} falls on the event date`
          : `${nearest.name} is ${Math.abs(nearest.offsetDays)} ${
              Math.abs(nearest.offsetDays) === 1 ? 'day' : 'days'
            } ${nearest.offsetDays > 0 ? 'after' : 'before'} the event`,
      severity: nearest.offsetDays === 0 ? 'high' : 'low',
      status: 'open',
      mitigation: 'Vendors may close or charge a premium. Confirm availability early.',
      evidence:
        holidayLookup?.source === 'nager'
          ? {
              status: 'published',
              sourceUrl: 'https://date.nager.at/',
              sourceDomain: 'date.nager.at',
              fetchedAt: holidaysResult.ok ? holidaysResult.fetchedAt : undefined,
              note: `${nearest.name} on ${nearest.date}`,
            }
          : {
              // A bundled table is not a fetched source, so it is not published.
              status: 'estimate',
              note: `${nearest.name} on ${nearest.date}, from a bundled list of fixed-date national holidays`,
            },
    })
    if (holidayLookup?.source === 'nager') {
      attributions.push({ label: 'Public holidays by Nager.Date', url: 'https://date.nager.at' })
    }
  } else if (!holidaysResult.ok) {
    gaps.push(`Holiday check unavailable: ${holidaysResult.error}`)
  }

  if (weatherResult.available) {
    attributions.push({ label: 'Weather by Open-Meteo (CC BY 4.0)', url: 'https://open-meteo.com' })
  }

  /* ------------------------------------------------------- apply and out */

  const applied = applyAll(
    { ...input, event, usingSampleData: usedSampleData },
    [
      { kind: 'research', vendors, gaps },
      { kind: 'risk', risks },
    ],
  )

  return {
    plan: applied.plan,
    categories: dedupeCategories(categories),
    gaps,
    weather: weatherResult,
    holidays,
    holidaySource: holidayLookup?.source ?? null,
    usedSampleData,
    attributions,
    rejected: applied.rejected,
  }
}

/* ----------------------------------------------------------------- weather */

async function readWeather(event: EventRecord): Promise<WeatherReading> {
  const fetchedAt = new Date().toISOString()

  if (!event.geo) {
    return { available: false, forecast: null, reason: 'The city could not be geocoded', fetchedAt }
  }

  // Beyond the forecast horizon we say so, rather than guessing a number.
  if (!withinForecastWindow(event.date)) {
    return {
      available: false,
      forecast: null,
      reason: 'The event date is outside the 15-day forecast window',
      fetchedAt,
    }
  }

  const result = await forecastForDate(event.geo, event.date)
  if (!result.ok) {
    return { available: false, forecast: null, reason: result.error, fetchedAt: result.fetchedAt }
  }
  if (!result.data) {
    return {
      available: false,
      forecast: null,
      reason: 'No forecast returned for that date',
      fetchedAt: result.fetchedAt,
    }
  }

  return { available: true, forecast: result.data, reason: '', fetchedAt: result.fetchedAt }
}

const RAIN_THRESHOLD = 40

function weatherRisk(event: EventRecord, weather: WeatherReading): RiskProposal['risks'][number] {
  const outdoor = event.indoorOutdoor !== 'indoor'

  if (!weather.available || !weather.forecast) {
    return {
      kind: 'weather',
      title: 'Weather on the event date is unconfirmed',
      severity: outdoor ? 'high' : 'low',
      // Unknown stays unknown. It is never quietly treated as resolved.
      status: 'unknown',
      mitigation: `${weather.reason}. Keep a wet-weather backup costed until it can be checked.`,
      evidence: { status: 'unknown', fetchedAt: weather.fetchedAt },
    }
  }

  const { rainChancePct, tempMaxC, windMaxKph } = weather.forecast
  const rain = rainChancePct ?? 0
  const wet = rain >= RAIN_THRESHOLD

  const detail = [
    rainChancePct !== null ? `${rainChancePct}% chance of rain` : null,
    tempMaxC !== null ? `high of ${Math.round(tempMaxC)}°C` : null,
    windMaxKph !== null ? `wind to ${Math.round(windMaxKph)} km/h` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    kind: 'weather',
    title: wet
      ? `Rain likely on the event date — ${rain}% chance`
      : `Forecast is clear for the event date`,
    severity: wet && outdoor ? 'high' : 'low',
    // A fetched forecast that reads benign resolves the risk on evidence.
    status: wet ? 'open' : 'mitigated',
    mitigation: wet
      ? 'Cost a canopy or move the event indoors, and decide before the week of the event.'
      : 'No action needed, but re-check two days before.',
    evidence: {
      status: 'published',
      sourceUrl: 'https://open-meteo.com/',
      sourceDomain: 'open-meteo.com',
      fetchedAt: weather.fetchedAt,
      note: detail || 'Forecast retrieved',
    },
  }
}

/* ---------------------------------------------------------------- helpers */

function vendorFromHit(
  hit: SearchHit,
  category: VendorCategory,
): ResearchProposal['vendors'][number] | null {
  const price = extractPriceINR(hit.snippet)
  const perHead = price !== null && looksPerHead(hit.snippet)
  const host = safeHost(hit.url)
  if (!host) return null

  return {
    name: hit.title.slice(0, 120),
    category,
    sourceUrl: hit.url,
    fetchedAt: new Date().toISOString(),
    priceINR: price,
    capacity: null,
    geo: null,
    address: null,
    fact: price
      ? `${inr(price)}${perHead ? ' per head' : ''}, read from the page`
      : hit.snippet.slice(0, 160),
    evidence: {
      // The page is real and cited, but the figure was read out of a snippet
      // by a regular expression, so it is an estimate rather than verified.
      status: price ? 'estimate' : 'unknown',
      sourceUrl: hit.url,
      sourceDomain: host,
      fetchedAt: new Date().toISOString(),
      note: price ? `Figure read from ${host}` : 'No price found on the page',
    },
    shortlisted: false,
    confirmed: false,
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** One row per category, keeping the most informative state. */
function dedupeCategories(rows: CategoryStatus[]): CategoryStatus[] {
  const byCategory = new Map<VendorCategory, CategoryStatus>()
  for (const row of rows) {
    const prior = byCategory.get(row.category)
    if (!prior || prior.found < row.found) byCategory.set(row.category, row)
  }
  return SEARCH_CATEGORIES.map((c) => byCategory.get(c)).filter(
    (r): r is CategoryStatus => Boolean(r),
  )
}


/* ----------------------------------------------------- deferred venue pass */

export type VenueResult = {
  plan: Plan
  status: CategoryStatus
  gaps: string[]
  attribution: { label: string; url: string } | null
}

/**
 * The Overpass half of research, run on its own so the Research Room can paint
 * before it returns. Results are merged into the stored plan by the reducer,
 * which preserves any shortlisting the user has already done.
 */
export async function researchVenues(input: Plan): Promise<VenueResult> {
  let event = input.event

  // Geocode here rather than relying on the fast pass having run first, so
  // this route stands on its own.
  if (!event.geo) {
    const geocoded = await geocodeCity(event.city)
    if (!geocoded.ok || !geocoded.data) {
      return {
        plan: input,
        status: {
          category: 'venue',
          state: 'failed',
          found: 0,
          checked: 0,
          error: `${event.city} could not be placed on the map`,
        },
        gaps: [],
        attribution: null,
      }
    }
    event = EventRecord.parse({
      ...event,
      geo: { lat: geocoded.data.lat, lon: geocoded.data.lon },
      updatedAt: new Date().toISOString(),
    })
  }

  const result = await findVenues(event.geo!)

  if (!result.ok) {
    return {
      // Keep the geocode even when Overpass fails; it is useful on its own.
      plan: { ...input, event },
      status: { category: 'venue', state: 'failed', found: 0, checked: 0, error: result.error },
      gaps: [],
      attribution: null,
    }
  }

  const vendors: ResearchProposal['vendors'] = result.data.map((candidate) => ({
    name: candidate.name,
    category: 'venue' as const,
    sourceUrl: `${OSM_URL}/${candidate.osmId}`,
    fetchedAt: result.fetchedAt,
    // OpenStreetMap records the place, never its pricing or capacity.
    priceINR: null,
    capacity: null,
    geo: candidate.geo,
    address: candidate.address,
    fact: `${candidate.kind} on OpenStreetMap. No published price or capacity.`,
    evidence: {
      status: 'unknown' as const,
      sourceUrl: `${OSM_URL}/${candidate.osmId}`,
      sourceDomain: 'openstreetmap.org',
      fetchedAt: result.fetchedAt,
      note: 'OpenStreetMap records the place, not its pricing',
    },
    shortlisted: false,
    confirmed: false,
  }))

  const applied = applyAll({ ...input, event }, [{ kind: 'research', vendors, gaps: [] }])

  return {
    plan: applied.plan,
    status: {
      category: 'venue',
      state: 'done',
      found: vendors.length,
      checked: result.data.length,
    },
    gaps: vendors.length
      ? [
          `Capacity unknown for ${vendors.length} ${vendors.length === 1 ? 'venue' : 'venues'} — OpenStreetMap does not record it`,
        ]
      : [],
    attribution: { label: OSM_ATTRIBUTION, url: OSM_URL },
  }
}
