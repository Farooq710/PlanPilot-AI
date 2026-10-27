import { cookies } from 'next/headers'
import { DEMO_EVENT_ID, demoPlan } from './demo'
import { getStore } from './store'
import type { Plan } from './schemas'

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

/**
 * The plan the current request should act on, seeding the sample plan when the
 * store is empty.
 *
 * Seeding used to live only in the workspace layout, so a request that reached
 * an export or the API without rendering a page found nothing and 404'd. On a
 * cold serverless instance, where the in-memory store starts empty, that was
 * every direct request.
 */
export async function getActivePlan(): Promise<Plan | null> {
  const store = await getStore()
  const activeId = await getActiveEventId()

  const plan = await store.getPlan(activeId)
  if (plan) return plan

  // Only ever seed the sample event, never invent one for an unknown id.
  if (activeId !== DEMO_EVENT_ID) return null

  await store.putPlan(demoPlan)
  return store.getPlan(DEMO_EVENT_ID)
}
