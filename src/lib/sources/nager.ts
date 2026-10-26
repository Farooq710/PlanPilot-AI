import { fetchJson, type SourceResult } from './http'

/**
 * Nager.Date: public holidays, free and keyless. A holiday on or near the event
 * date matters twice over — vendors close, and venues charge more.
 */

const BASE = 'https://date.nager.at/api/v3/PublicHolidays'

type NagerHoliday = {
  date: string
  localName: string
  name: string
  global: boolean
  counties: string[] | null
}

export type Holiday = {
  date: string
  name: string
  /** How many days from the event; 0 is the day itself. */
  offsetDays: number
  national: boolean
}

/**
 * Nager.Date does not cover India. Verified on 26 Oct 2026: `IN` is absent
 * from its 204-country list and every year returns 204 No Content.
 *
 * So for India we fall back to the three fixed-date national holidays, which
 * land on the same dates every year and can be stated without fetching
 * anything. Festivals that move with the lunar calendar — Diwali, Holi, Eid,
 * Dussehra — are deliberately not included: their dates cannot be derived
 * here, and guessing them would be exactly the kind of confident fabrication
 * this app refuses to do elsewhere.
 */
const FIXED_INDIA_HOLIDAYS = [
  { monthDay: '01-26', name: 'Republic Day' },
  { monthDay: '08-15', name: 'Independence Day' },
  { monthDay: '10-02', name: 'Gandhi Jayanti' },
]

export const INDIA_HOLIDAY_CAVEAT =
  'Fixed-date national holidays only. Festivals that move each year, such as Diwali and Eid, are not covered.'

/** True when the holiday list came from the bundled table rather than the API. */
export type HolidaySource = 'nager' | 'bundled-india'

export type HolidayLookup = {
  holidays: Holiday[]
  source: HolidaySource
  caveat: string | null
}

/** Holidays within `windowDays` either side of the event. */
export async function holidaysNear(
  date: string,
  windowDays = 3,
  countryCode = 'IN',
): Promise<SourceResult<HolidayLookup>> {
  const year = Number(date.slice(0, 4))
  const eventTime = Date.parse(`${date}T00:00:00+05:30`)

  const near = (list: Holiday[]) =>
    list
      .filter((h) => Math.abs(h.offsetDays) <= windowDays)
      .sort((a, b) => Math.abs(a.offsetDays) - Math.abs(b.offsetDays))

  const offsetOf = (iso: string) =>
    Math.round((Date.parse(`${iso}T00:00:00+05:30`) - eventTime) / 86_400_000)

  if (countryCode === 'IN') {
    const bundled = FIXED_INDIA_HOLIDAYS.map((h) => ({
      date: `${year}-${h.monthDay}`,
      name: h.name,
      offsetDays: offsetOf(`${year}-${h.monthDay}`),
      national: true,
    }))
    return {
      ok: true,
      fetchedAt: new Date().toISOString(),
      data: {
        holidays: near(bundled),
        source: 'bundled-india',
        caveat: INDIA_HOLIDAY_CAVEAT,
      },
    }
  }

  const result = await fetchJson<NagerHoliday[]>(`${BASE}/${year}/${countryCode}`, {
    label: 'Nager.Date',
    // The holiday calendar for a year does not change.
    revalidate: 604_800,
  })

  if (!result.ok) return result

  const fetched = (result.data ?? []).map((h) => ({
    date: h.date,
    name: h.localName || h.name,
    offsetDays: offsetOf(h.date),
    national: h.global,
  }))

  return {
    ok: true,
    fetchedAt: result.fetchedAt,
    data: { holidays: near(fetched), source: 'nager', caveat: null },
  }
}

export const NAGER_URL = 'https://date.nager.at'
