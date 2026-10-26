import { NextResponse } from 'next/server'
import { getActiveEventId } from '@/lib/active-event'
import { researchVenues } from '@/lib/engines/research'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'
// Overpass can take most of a minute; give the route room to wait for it.
export const maxDuration = 60

/**
 * The deferred half of research. The Research Room paints with the fast
 * sources and calls this for venue candidates, so a slow Overpass delays one
 * panel rather than the page.
 */
export async function POST() {
  const store = await getStore()
  const eventId = await getActiveEventId()
  const plan = await store.getPlan(eventId)

  if (!plan) {
    return NextResponse.json({ ok: false, error: 'No active plan' }, { status: 404 })
  }

  const result = await researchVenues(plan)
  // Save either way: a successful geocode is worth keeping even if Overpass
  // timed out, so a retry does not have to resolve the city again.
  await store.putPlan(result.plan)

  return NextResponse.json({
    ok: result.status.state === 'done',
    status: result.status,
    gaps: result.gaps,
    found: result.status.found,
  })
}
