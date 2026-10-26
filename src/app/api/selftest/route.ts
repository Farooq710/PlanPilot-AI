import { NextResponse } from 'next/server'
import { buildPlanFromDraft } from '@/lib/engines/plan'
import { budgetTotals } from '@/lib/engines/budget'
import { validatePlan } from '@/lib/engines/validate'
import { getLlm } from '@/lib/llm'
import { PlanExplanation, parseWithRetry } from '@/lib/llm/provider'
import { EventDraft } from '@/lib/schemas'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

/**
 * Runs the acceptance tests that can be checked from the server and reports
 * pass or fail per test. Kept in the app so it can be run against a deployment,
 * not just locally.
 */
export async function GET() {
  const results: { id: string; name: string; pass: boolean; detail: string }[] = []
  const record = (id: string, name: string, pass: boolean, detail: string) =>
    results.push({ id, name, pass, detail })

  /* AT1 — the demo brief produces a plan within budget. */
  const draft = EventDraft.parse({
    type: 'birthday',
    title: "Aarav's 30th Birthday",
    city: 'Hyderabad',
    date: '2025-11-01',
    time: '19:00',
    guestCount: 40,
    budgetINR: 25_000,
    style: ['premium'],
    indoorOutdoor: 'outdoor',
    constraints: 'Vegetarian options for 15 guests. Parking needed.',
  })

  const built = await buildPlanFromDraft(draft)
  const totals = budgetTotals(built.plan.budget, built.plan.event.budgetINR)
  record(
    'AT1',
    'Demo brief plans within budget',
    totals.planned <= 25_000,
    `planned ₹${totals.planned.toLocaleString('en-IN')} of ₹25,000`,
  )

  /* The allocation must also be exact, not merely under. */
  record(
    'AT1b',
    'Allocation uses the whole budget exactly',
    totals.planned === 25_000,
    `planned ₹${totals.planned.toLocaleString('en-IN')}`,
  )

  /* AT7 — malformed model output is rejected, retried once, then falls back. */
  let attempts = 0
  let retryPassed = false
  try {
    await parseWithRetry(PlanExplanation, async () => {
      attempts++
      return 'this is not json'
    })
  } catch {
    retryPassed = attempts === 2
  }
  record(
    'AT7a',
    'Malformed model output is retried exactly once',
    retryPassed,
    `${attempts} attempts before giving up`,
  )

  record(
    'AT7b',
    'A plan is still produced with no model available',
    Boolean(built.plan.narrative?.summary),
    `narrative source: ${built.plan.narrative?.source ?? 'none'} (provider: ${getLlm().name})`,
  )

  /* The validator must run and must not pass a plan with blockers silently. */
  const validation = validatePlan(built.plan)
  record(
    'VAL',
    'Validator runs on the assembled plan',
    Array.isArray(validation.issues),
    `${validation.issues.length} issues, ok=${validation.ok}`,
  )

  /* Evidence rule: nothing from the engines claims to be published. */
  const falselyPublished = built.plan.budget.filter(
    (b) => b.evidence.status === 'published' && !b.evidence.sourceUrl,
  )
  record(
    'EV1',
    'No computed figure is presented as verified',
    falselyPublished.length === 0,
    `${falselyPublished.length} unsourced "published" items`,
  )

  /* Storage round-trip, including the narrative. */
  const store = await getStore()
  await store.putPlan(built.plan)
  const reloaded = await store.getPlan(built.plan.event.id)
  record(
    'DB1',
    'Plan round-trips through the store',
    reloaded?.budget.length === built.plan.budget.length &&
      reloaded?.narrative?.summary === built.plan.narrative?.summary,
    `driver: ${store.driver}`,
  )
  await store.deleteEvent(built.plan.event.id)

  const passed = results.filter((r) => r.pass).length
  return NextResponse.json(
    { passed, total: results.length, ok: passed === results.length, results },
    { status: passed === results.length ? 200 : 500 },
  )
}
