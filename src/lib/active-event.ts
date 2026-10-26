import { cookies } from 'next/headers'
import { DEMO_EVENT_ID } from './demo'

/**
 * Which event the workspace is currently showing. A cookie rather than a
 * database column, because there are no accounts — the plan belongs to
 * whoever is holding the browser.
 */
const COOKIE = 'planpilot_event'

export async function getActiveEventId(): Promise<string> {
  const jar = await cookies()
  return jar.get(COOKIE)?.value ?? DEMO_EVENT_ID
}

export async function setActiveEventId(id: string): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}
