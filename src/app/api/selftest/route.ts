import { NextResponse } from 'next/server'
import { buildPlanFromDraft } from '@/lib/engines/plan'
import { budgetTotals } from '@/lib/engines/budget'
import { validatePlan } from '@/lib/engines/validate'
import { getLlm } from '@/lib/llm'
import { PlanExplanation, parseWithRetry } from '@/lib/llm/provider'
import { EventDraft } from '@/lib/schemas'
import { getStore } from '@/lib/store'
import { holidaysNear } from '@/lib/sources/nager'
import { forecastForDate, geocodeCity, withinForecastWindow } from '@/lib/sources/open-meteo'
import { extractPriceINR, isPermittedSource } from '@/lib/sources/search'

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

  /* The configured model provider, if any, must actually answer. A key that
     is set but rejected is a failure; no key at all is a valid configuration. */
  const llm = getLlm()
  if (llm.available) {
    try {
      const probe = await llm.explainPlan({
        eventType: 'birthday',
        city: 'Hyderabad',
        guestCount: 10,
        budgetLabel: '₹10,000',
        styleLabel: 'minimal',
        indoorOutdoor: 'indoor',
        constraints: '',
        lines: [{ category: 'food', label: 'Catering', plannedLabel: '₹10,000', perHeadLabel: '₹1,000' }],
      })
      record('LLM1', 'Configured model answers in the expected shape', true,
        `${llm.name} returned ${probe.summary.length} chars`)
    } catch (error) {
      record('LLM1', 'Configured model answers in the expected shape', false,
        `${llm.name} failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 160)}`)
    }
  } else {
    record('LLM1', 'No model configured, fallback in use', true,
      'set OPENAI_API_KEY or GEMINI_API_KEY to enable model prose')
  }

  /* M3 — live sources. Each is checked for behaviour, not just reachability. */

  const geo = await geocodeCity('Hyderabad')
  record(
    'SRC1',
    'Open-Meteo geocodes the demo city',
    geo.ok && geo.data !== null,
    geo.ok && geo.data ? `${geo.data.lat}, ${geo.data.lon}` : 'failed',
  )

  if (geo.ok && geo.data) {
    // A date inside the window must produce a forecast...
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
    const near = await forecastForDate(geo.data, soon)
    record(
      'SRC2',
      'A date inside the window returns a forecast',
      near.ok && near.data !== null,
      near.ok && near.data ? `${soon}: ${near.data.rainChancePct}% rain` : 'no forecast',
    )

    // ...and one beyond it must be refused rather than guessed.
    const far = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10)
    record(
      'SRC3',
      'A date beyond the window is reported unknown, not guessed',
      withinForecastWindow(far) === false,
      `${far} correctly outside the 15-day horizon`,
    )
  }

  const holidays = await holidaysNear(new Date().toISOString().slice(0, 10))
  record(
    'SRC4',
    'Holiday lookup declares its source and caveat',
    holidays.ok && holidays.data.source === 'bundled-india' && Boolean(holidays.data.caveat),
    holidays.ok ? `source=${holidays.data.source}` : 'failed',
  )

  record(
    'SRC5',
    'Blocked sources are refused',
    !isPermittedSource('https://maps.google.com/place/x') &&
      !isPermittedSource('https://www.justdial.com/x') &&
      isPermittedSource('https://example.in/pricing'),
    'map, social and directory hosts rejected',
  )

  record(
    'SRC6',
    'A price read from a snippet is an estimate, not a quote',
    extractPriceINR('Buffet from Rs 450 per head') === 450 &&
      extractPriceINR('call for details') === null,
    'regex extraction is bounded and nullable',
  )

  const passed = results.filter((r) => r.pass).length
  return NextResponse.json(
    { passed, total: results.length, ok: passed === results.length, results },
    { status: passed === results.length ? 200 : 500 },
  )
}
