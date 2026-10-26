/**
 * The app is India-facing, so every date is formatted in IST explicitly.
 * Without a fixed zone the server and the browser format differently and
 * React reports a hydration mismatch.
 */
export const IST = 'Asia/Kolkata'

const dt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: IST, ...opts })

/** "1 Nov 2025" */
export const shortDate = (iso: string): string =>
  dt({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

/** "Sat 1 Nov" */
export const dayAndDate = (iso: string): string =>
  dt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))

/** "7:00 pm" */
export const clockTime = (iso: string): string =>
  dt({ hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))

/** "1 Nov, 2:32 pm" — used for evidence fetch stamps. */
export const stamp = (iso: string): string =>
  dt({ day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(
    new Date(iso),
  )

/** Whole days from today to an event date, negative once it has passed. */
export function daysUntil(dateYmd: string, today = new Date()): number {
  const target = Date.parse(`${dateYmd}T00:00:00+05:30`)
  const start = Date.parse(
    `${dt({ year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(today)
      .split('/')
      .reverse()
      .join('-')}T00:00:00+05:30`,
  )
  return Math.round((target - start) / 86_400_000)
}

/** YYYY-MM-DD for the next given weekday (0=Sun). Powers the "Next Saturday" chip. */
export function nextWeekday(weekday: number, from = new Date()): string {
  const d = new Date(from)
  const delta = (weekday - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}
