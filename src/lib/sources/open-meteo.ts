import type { Geo } from '@/lib/schemas'
import { fetchJson, type SourceResult } from './http'

/**
 * Open-Meteo: free geocoding and forecast, no key. CC-BY 4.0, non-commercial
 * tier — attribution is shown in the UI.
 *
 * The forecast only reaches about sixteen days out. Beyond that we report the
 * weather risk as unknown rather than inventing a number, which is the whole
 * point of the evidence model.
 */

const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'

/** Open-Meteo publishes 16 days; we stay a day inside that. */
export const FORECAST_HORIZON_DAYS = 15

type GeocodeResponse = {
  results?: { latitude: number; longitude: number; name: string; admin1?: string }[]
}

export type GeocodeHit = Geo & { name: string; region: string | null }

export async function geocodeCity(city: string): Promise<SourceResult<GeocodeHit | null>> {
  const url = `${GEOCODE}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  const result = await fetchJson<GeocodeResponse>(url, {
    label: 'Open-Meteo geocoding',
    // A city's coordinates do not move; cache them for a day.
    revalidate: 86_400,
  })

  if (!result.ok) return result

  const hit = result.data.results?.[0]
  return {
    ok: true,
    fetchedAt: result.fetchedAt,
    data: hit
      ? { lat: hit.latitude, lon: hit.longitude, name: hit.name, region: hit.admin1 ?? null }
      : null,
  }
}

type ForecastResponse = {
  daily?: {
    time: string[]
    precipitation_probability_max?: (number | null)[]
    temperature_2m_max?: (number | null)[]
    temperature_2m_min?: (number | null)[]
    wind_speed_10m_max?: (number | null)[]
  }
}

export type DayForecast = {
  date: string
  rainChancePct: number | null
  tempMaxC: number | null
  tempMinC: number | null
  windMaxKph: number | null
}

/** Null data means the date sits outside the forecast window. */
export async function forecastForDate(
  geo: Geo,
  date: string,
): Promise<SourceResult<DayForecast | null>> {
  const url =
    `${FORECAST}?latitude=${geo.lat}&longitude=${geo.lon}` +
    `&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max` +
    `&timezone=Asia%2FKolkata&start_date=${date}&end_date=${date}`

  const result = await fetchJson<ForecastResponse>(url, {
    label: 'Open-Meteo forecast',
    // Forecasts move; an hour is a reasonable compromise for a demo.
    revalidate: 3600,
  })

  if (!result.ok) return result

  const daily = result.data.daily
  const index = daily?.time?.indexOf(date) ?? -1
  if (!daily || index === -1) {
    return { ok: true, fetchedAt: result.fetchedAt, data: null }
  }

  const at = <T>(arr: (T | null)[] | undefined): T | null => arr?.[index] ?? null

  return {
    ok: true,
    fetchedAt: result.fetchedAt,
    data: {
      date,
      rainChancePct: at(daily.precipitation_probability_max),
      tempMaxC: at(daily.temperature_2m_max),
      tempMinC: at(daily.temperature_2m_min),
      windMaxKph: at(daily.wind_speed_10m_max),
    },
  }
}

/** Whether a date is close enough for the forecast to say anything useful. */
export function withinForecastWindow(date: string, today = new Date()): boolean {
  const target = Date.parse(`${date}T00:00:00+05:30`)
  const days = (target - today.getTime()) / 86_400_000
  return days >= -1 && days <= FORECAST_HORIZON_DAYS
}
