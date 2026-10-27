import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryStore } from '@/lib/store/memory'
import { PlanNarrative, ScenarioResult } from '@/lib/schemas'
import { makePlan, makeVendor } from './helpers'

/**
 * Round-trip tests for the store contract. Both drivers implement the same
 * interface, so a field the memory driver drops is a field the SQLite driver
 * is likely dropping too — which is exactly how the sample-data flag was lost.
 */
const store = new MemoryStore()

const narrative = PlanNarrative.parse({
  summary: 'A compact plan for a small birthday.',
  categoryNotes: [{ category: 'food', note: 'Scales with headcount.' }],
  watchOut: 'Weather is the main risk.',
  source: 'fallback',
  considerations: [],
})

beforeEach(async () => {
  await store.reset()
})

describe('MemoryStore round trip', () => {
  it('returns null for an event that does not exist', async () => {
    expect(await store.getPlan('nope')).toBeNull()
    expect(await store.getEvent('nope')).toBeNull()
  })

  it('preserves every collection', async () => {
    const plan = makePlan({ vendors: [makeVendor({ shortlisted: true })] })
    await store.putPlan(plan)
    const loaded = await store.getPlan(plan.event.id)

    expect(loaded).not.toBeNull()
    expect(loaded!.budget).toHaveLength(plan.budget.length)
    expect(loaded!.tasks).toHaveLength(plan.tasks.length)
    expect(loaded!.schedule).toHaveLength(plan.schedule.length)
    expect(loaded!.vendors[0].shortlisted).toBe(true)
  })

  it('preserves the narrative', async () => {
    const plan = makePlan({ narrative })
    await store.putPlan(plan)

    expect((await store.getPlan(plan.event.id))!.narrative?.summary).toBe(narrative.summary)
  })

  it('preserves the sample-data flag', async () => {
    // This flag drives the "Sample data — not live" banner. It was being
    // dropped on read, so the banner never appeared for a fallback plan.
    const plan = makePlan({ usingSampleData: true })
    await store.putPlan(plan)

    expect((await store.getPlan(plan.event.id))!.usingSampleData).toBe(true)
  })

  it('keeps a live plan unflagged', async () => {
    const plan = makePlan({ usingSampleData: false })
    await store.putPlan(plan)

    expect((await store.getPlan(plan.event.id))!.usingSampleData).toBe(false)
  })

  it('does not hand back a reference callers can mutate', async () => {
    const plan = makePlan()
    await store.putPlan(plan)

    const first = await store.getPlan(plan.event.id)
    first!.budget[0].plannedINR = 999_999

    const second = await store.getPlan(plan.event.id)
    expect(second!.budget[0].plannedINR).not.toBe(999_999)
  })

  it('removes every child collection when an event is deleted', async () => {
    const plan = makePlan({ vendors: [makeVendor()], usingSampleData: true })
    await store.putPlan(plan)
    await store.deleteEvent(plan.event.id)

    expect(await store.getPlan(plan.event.id)).toBeNull()

    // Re-creating the event must not resurrect the old children or flags.
    await store.putEvent(plan.event)
    const fresh = await store.getPlan(plan.event.id)
    expect(fresh!.vendors).toHaveLength(0)
    expect(fresh!.usingSampleData).toBe(false)
  })

  it('stores scenarios newest first', async () => {
    const plan = makePlan()
    await store.putPlan(plan)

    const base = {
      eventId: plan.event.id,
      delta: { guestCount: 55 },
      changes: [],
      warnings: [],
      totalBeforeINR: 25_000,
      totalAfterINR: 29_000,
      readinessBefore: 20,
      readinessAfter: 10,
      cascade: [],
    }

    await store.putScenario(
      ScenarioResult.parse({ ...base, id: 'sc_1', createdAt: '2026-11-01T00:00:00.000Z' }),
    )
    await store.putScenario(
      ScenarioResult.parse({ ...base, id: 'sc_2', createdAt: '2026-11-02T00:00:00.000Z' }),
    )

    const scenarios = await store.listScenarios(plan.event.id)
    expect(scenarios.map((s) => s.id)).toEqual(['sc_2', 'sc_1'])
  })

  it('lists events most recently updated first', async () => {
    const older = makePlan()
    const newer = makePlan({
      event: { ...older.event, id: 'evt_newer', updatedAt: '2027-01-01T00:00:00.000Z' },
    })

    await store.putPlan(older)
    await store.putPlan(newer)

    expect((await store.listEvents())[0].id).toBe('evt_newer')
  })
})
