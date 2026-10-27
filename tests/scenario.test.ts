import { describe, expect, it } from 'vitest'
import { applyScenario } from '@/lib/engines/scenario'
import { Risk } from '@/lib/schemas'
import { makePlan, makeVendor } from './helpers'

/**
 * Acceptance test 3. The valuable half of these assertions is what must NOT
 * move: a diff that quietly drifts an unrelated line is worse than no
 * simulation, because the user stops believing any of it.
 */
describe('applyScenario: guest count', () => {
  const plan = makePlan()
  const { result, nextPlan } = applyScenario(plan, { guestCount: 55 })

  const planned = (p: typeof plan, category: string) =>
    p.budget.find((b) => b.category === category)!.plannedINR

  it('raises the headcount-driven lines', () => {
    expect(planned(nextPlan, 'food')).toBeGreaterThan(planned(plan, 'food'))
    expect(planned(nextPlan, 'cake')).toBeGreaterThan(planned(plan, 'cake'))
  })

  it('leaves every line that does not scale with headcount exactly as it was', () => {
    for (const category of ['venue', 'decor', 'activities', 'contingency']) {
      expect(planned(nextPlan, category), category).toBe(planned(plan, category))
    }
  })

  it('does not touch style, constraints or the date', () => {
    expect(nextPlan.event.style).toEqual(plan.event.style)
    expect(nextPlan.event.constraints).toBe(plan.event.constraints)
    expect(nextPlan.event.date).toBe(plan.event.date)
  })

  it('traces the cascade to the dependent items', () => {
    const cascade = result.cascade.find((c) => c.from.includes('Guests'))
    expect(cascade?.to).toEqual(
      expect.arrayContaining(['Catering', 'Cake size', 'Seating', 'Invitations', 'Venue capacity']),
    )
  })

  it('reports the cost delta', () => {
    expect(result.totalAfterINR).toBeGreaterThan(result.totalBeforeINR)
    const foodChange = result.changes.find((c) => c.label === 'Food')
    expect(foodChange?.deltaINR).toBeGreaterThan(0)
  })

  it('warns when the venue can no longer hold the guests', () => {
    const withVenue = makePlan({
      vendors: [makeVendor({ capacity: 50, shortlisted: true, name: 'Small Hall' })],
    })
    const tight = applyScenario(withVenue, { guestCount: 55 })

    expect(tight.result.warnings.join(' ')).toMatch(/exceeded by 5/)
    expect(tight.nextPlan.risks.some((r) => r.kind === 'capacity')).toBe(true)
  })

  it('does not warn when the venue still fits', () => {
    const roomy = makePlan({ vendors: [makeVendor({ capacity: 80, shortlisted: true })] })
    const fine = applyScenario(roomy, { guestCount: 55 })
    expect(fine.result.warnings.join(' ')).not.toMatch(/exceeded/)
  })

  it('is a no-op when the guest count does not actually change', () => {
    const same = applyScenario(plan, { guestCount: plan.event.guestCount })
    expect(same.result.changes).toHaveLength(0)
  })
})

describe('applyScenario: indoor and outdoor', () => {
  const outdoorPlan = makePlan({
    risks: [
      Risk.parse({
        id: 'rk_weather',
        eventId: 'evt_test',
        kind: 'weather',
        title: 'Rain likely',
        severity: 'high',
        status: 'open',
        mitigation: null,
        evidence: { status: 'estimate' },
      }),
    ],
  })

  it('moving indoors resolves the weather risk', () => {
    const { nextPlan } = applyScenario(outdoorPlan, { indoorOutdoor: 'indoor' })
    expect(nextPlan.risks.find((r) => r.kind === 'weather')!.status).toBe('mitigated')
  })

  it('moving indoors drops the wet-weather backup task', () => {
    const before = outdoorPlan.tasks.some((t) => /backup/i.test(t.title))
    const { nextPlan } = applyScenario(outdoorPlan, { indoorOutdoor: 'indoor' })

    expect(before).toBe(true)
    expect(nextPlan.tasks.some((t) => /backup/i.test(t.title))).toBe(false)
  })

  it('moving indoors raises readiness', () => {
    const { result } = applyScenario(outdoorPlan, { indoorOutdoor: 'indoor' })
    expect(result.readinessAfter).toBeGreaterThan(result.readinessBefore)
  })

  it('moving outdoors adds a backup task and warns', () => {
    const indoorPlan = makePlan({ event: makePlan().event })
    const indoors = applyScenario(indoorPlan, { indoorOutdoor: 'indoor' })
    const backOutside = applyScenario(indoors.nextPlan, { indoorOutdoor: 'outdoor' })

    expect(backOutside.nextPlan.tasks.some((t) => /backup/i.test(t.title))).toBe(true)
    expect(backOutside.result.warnings.join(' ')).toMatch(/backup/i)
  })
})

describe('applyScenario: budget', () => {
  it('re-splits to the new budget and keeps recorded actuals', () => {
    const plan = makePlan()
    const spent = {
      ...plan,
      budget: plan.budget.map((b) => (b.category === 'food' ? { ...b, actualINR: 9_000 } : b)),
    }

    const { nextPlan } = applyScenario(spent, { budgetINR: 20_000 })

    expect(nextPlan.budget.reduce((s, b) => s + b.plannedINR, 0)).toBe(20_000)
    expect(nextPlan.budget.find((b) => b.category === 'food')!.actualINR).toBe(9_000)
  })

  it('warns when the plan no longer fits the budget', () => {
    const plan = makePlan()
    const { result } = applyScenario(plan, { guestCount: 120 })
    expect(result.warnings.join(' ')).toMatch(/over/i)
  })
})

describe('applyScenario: city', () => {
  it('invalidates the geocode and the forecast', () => {
    const plan = makePlan({
      risks: [
        Risk.parse({
          id: 'rk_weather',
          eventId: 'evt_test',
          kind: 'weather',
          title: 'Clear',
          severity: 'low',
          status: 'mitigated',
          mitigation: null,
          evidence: { status: 'estimate' },
        }),
      ],
    })

    const { result, nextPlan } = applyScenario(plan, { city: 'Chennai' })

    expect(nextPlan.event.geo).toBeNull()
    expect(nextPlan.risks.find((r) => r.kind === 'weather')!.status).toBe('unknown')
    expect(result.warnings.join(' ')).toMatch(/running again/i)
  })
})
