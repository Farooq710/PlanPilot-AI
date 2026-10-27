import { afterEach, describe, expect, it, vi } from 'vitest'
import { USER_AGENT, fetchJson } from '@/lib/sources/http'
import { holidaysNear } from '@/lib/sources/nager'
import { withinForecastWindow } from '@/lib/sources/open-meteo'
import { delta, inr, num, pctOf } from '@/lib/money'
import { clockTime, daysUntil, nextWeekday, shortDate, todayYmd } from '@/lib/time'

/**
 * The HTTP layer must never throw: a failed source degrades its own category
 * and leaves the rest of the plan intact. These tests pin that contract.
 */
describe('fetchJson', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends a descriptive User-Agent, as the shared endpoints ask', async () => {
    const spy = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)

    await fetchJson('https://example.test/x', { label: 'Test' })

    const headers = (spy.mock.calls[0] as unknown as [string, RequestInit])[1]
      .headers as Record<string, string>
    expect(headers['User-Agent']).toBe(USER_AGENT)
    expect(USER_AGENT).toMatch(/PlanPilot/)
  })

  it('returns ok with parsed data and a fetch timestamp', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"value":42}', { status: 200 }))

    const result = await fetchJson<{ value: number }>('https://example.test/x', { label: 'Test' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.value).toBe(42)
      expect(Number.isNaN(Date.parse(result.fetchedAt))).toBe(false)
    }
  })

  it('reports a non-ok status without throwing', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 500 }))

    const result = await fetchJson('https://example.test/x', { label: 'Overpass' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Overpass HTTP 500/)
  })

  it('names rate limiting specifically, since these are shared free endpoints', async () => {
    vi.stubGlobal('fetch', async () => new Response('slow down', { status: 429 }))

    const result = await fetchJson('https://example.test/x', { label: 'Overpass' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/rate limited/)
  })

  it('reports a network failure as unreachable rather than throwing', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('getaddrinfo ENOTFOUND')
    })

    const result = await fetchJson('https://example.test/x', { label: 'Nager.Date' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/Nager\.Date unreachable/)
  })

  it('reports an aborted request as a timeout', async () => {
    vi.stubGlobal('fetch', async () => {
      const error = new Error('aborted')
      error.name = 'AbortError'
      throw error
    })

    const result = await fetchJson('https://example.test/x', { label: 'Overpass' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('Overpass timed out')
  })

  it('treats malformed JSON as a failed source, not a crash', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>nope</html>', { status: 200 }))

    const result = await fetchJson('https://example.test/x', { label: 'Test' })
    expect(result.ok).toBe(false)
  })
})

describe('holidaysNear', () => {
  it('uses the bundled table for India and declares the limit', async () => {
    // Nager.Date has no India data: verified 26 Oct 2026, every year 204s.
    const result = await holidaysNear('2026-08-15')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.source).toBe('bundled-india')
      expect(result.data.caveat).toMatch(/Diwali/)
      expect(result.data.holidays.some((h) => h.name === 'Independence Day')).toBe(true)
    }
  })

  it('reports nothing when no holiday is near the date', async () => {
    const result = await holidaysNear('2026-06-10')
    if (result.ok) expect(result.data.holidays).toHaveLength(0)
  })

  it('places a holiday relative to the event date', async () => {
    const result = await holidaysNear('2026-08-17')
    if (result.ok) {
      const independence = result.data.holidays.find((h) => h.name === 'Independence Day')
      expect(independence?.offsetDays).toBe(-2)
    }
  })
})

describe('withinForecastWindow', () => {
  const today = new Date('2026-10-27T10:00:00+05:30')

  it('accepts a date inside the horizon', () => {
    expect(withinForecastWindow('2026-10-30', today)).toBe(true)
  })

  it('refuses a date beyond it rather than guessing', () => {
    expect(withinForecastWindow('2027-03-01', today)).toBe(false)
  })

  it('refuses a date well in the past', () => {
    expect(withinForecastWindow('2025-11-01', today)).toBe(false)
  })
})

describe('money formatting', () => {
  it('groups rupees the Indian way', () => {
    expect(inr(25_000)).toBe('₹25,000')
    expect(inr(120_000)).toBe('₹1,20,000')
    expect(inr(0)).toBe('₹0')
  })

  it('formats a bare number the same way', () => {
    expect(num(1_20_000)).toBe('1,20,000')
  })

  it('signs a delta and uses a true minus sign', () => {
    expect(delta(3_200)).toBe('+₹3,200')
    expect(delta(-900)).toBe('−₹900')
    expect(delta(0)).toBe('₹0')
  })

  it('clamps a percentage and never divides by zero', () => {
    expect(pctOf(50, 200)).toBe(25)
    expect(pctOf(5, 0)).toBe(0)
    expect(pctOf(10_000, 1)).toBe(999)
  })
})

describe('date helpers', () => {
  it('formats in IST so server and client agree', () => {
    // Late UTC on the 4th is already the 5th in IST; a floating zone would
    // render differently on the server and in the browser.
    expect(shortDate('2026-12-04T19:00:00.000Z')).toBe('5 Dec 2026')
    expect(clockTime('2026-12-05T13:30:00.000Z')).toMatch(/7:00/)
  })

  it('counts whole days to an event', () => {
    const today = new Date('2026-10-27T10:00:00+05:30')
    expect(daysUntil('2026-10-31', today)).toBe(4)
    expect(daysUntil('2026-10-27', today)).toBe(0)
    expect(daysUntil('2026-10-20', today)).toBe(-7)
  })

  it('returns today in IST as YYYY-MM-DD', () => {
    expect(todayYmd(new Date('2026-10-27T10:00:00+05:30'))).toBe('2026-10-27')
  })

  it('always moves forward to the next weekday', () => {
    // 2026-10-27 is a Tuesday; the next Saturday is the 31st.
    const next = nextWeekday(6, new Date('2026-10-27T10:00:00+05:30'))
    expect(next).toBe('2026-10-31')

    // From a Saturday it must skip a week, not return today.
    const fromSaturday = nextWeekday(6, new Date('2026-10-31T10:00:00+05:30'))
    expect(fromSaturday).toBe('2026-11-07')
  })
})
