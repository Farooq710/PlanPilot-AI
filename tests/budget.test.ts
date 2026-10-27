import { describe, expect, it } from 'vitest'
import {
  SPLITS,
  budgetItemId,
  budgetTotals,
  buildBudget,
  proposeTradeOffs,
  rescaleForGuests,
} from '@/lib/engines/budget'
import { makeEvent } from './helpers'

describe('buildBudget', () => {
  it('allocates exactly the budget, never a rupee over', () => {
    // Acceptance test 1. Checked across awkward numbers, not just the demo.
    for (const budgetINR of [25_000, 25_001, 33_333, 7, 1_000_000, 99_999]) {
      const items = buildBudget(makeEvent({ budgetINR }))
      const planned = items.reduce((sum, i) => sum + i.plannedINR, 0)
      expect(planned, `budget ${budgetINR}`).toBe(budgetINR)
    }
  })

  it('matches the documented split for the demo brief', () => {
    const items = buildBudget(makeEvent({ budgetINR: 25_000 }))
    const byCategory = Object.fromEntries(items.map((i) => [i.category, i.plannedINR]))

    expect(byCategory).toEqual({
      venue: 6_250,
      food: 8_750,
      decor: 3_750,
      cake: 2_000,
      activities: 1_750,
      contingency: 2_500,
    })
  })

  it('keeps every split summing to 100 percent', () => {
    for (const [type, split] of Object.entries(SPLITS)) {
      const total = Object.values(split).reduce((a, b) => a + b, 0)
      expect(total, type).toBe(100)
    }
  })

  it('sets a per-head rate only on headcount-driven lines', () => {
    const items = buildBudget(makeEvent({ guestCount: 40 }))
    const perHead = items.filter((i) => i.perHead !== null).map((i) => i.category)
    expect(perHead.sort()).toEqual(['cake', 'food'])
  })

  it('never presents a computed allocation as verified', () => {
    const items = buildBudget(makeEvent())
    expect(items.every((i) => i.evidence.status === 'estimate')).toBe(true)
  })

  it('scopes item ids to the event so two events cannot collide', () => {
    const a = buildBudget(makeEvent({ id: 'evt_a' }))
    const b = buildBudget(makeEvent({ id: 'evt_b' }))
    expect(a[0].id).not.toBe(b[0].id)
    expect(a[0].id).toBe(budgetItemId('evt_a', 'venue'))
  })

  it('handles a zero budget without dividing by zero', () => {
    const items = buildBudget(makeEvent({ budgetINR: 0 }))
    expect(items.reduce((s, i) => s + i.plannedINR, 0)).toBe(0)
    expect(items.every((i) => Number.isFinite(i.plannedINR))).toBe(true)
  })
})

describe('budgetTotals', () => {
  it('reports an overspend rather than a negative overspend', () => {
    const items = buildBudget(makeEvent({ budgetINR: 10_000 }))
    const spent = items.map((i) => ({ ...i, actualINR: i.plannedINR * 2 }))
    const totals = budgetTotals(spent, 10_000)

    expect(totals.actual).toBe(20_000)
    expect(totals.overBy).toBe(10_000)
    expect(totals.remaining).toBe(-10_000)
  })

  it('reports no overspend when under budget', () => {
    const items = buildBudget(makeEvent({ budgetINR: 10_000 }))
    expect(budgetTotals(items, 10_000).overBy).toBe(0)
  })
})

describe('rescaleForGuests', () => {
  it('moves per-head lines and leaves the rest alone', () => {
    const items = buildBudget(makeEvent({ guestCount: 40, budgetINR: 25_000 }))
    const rescaled = rescaleForGuests(items, 55)

    const food = rescaled.find((i) => i.category === 'food')!
    const venue = rescaled.find((i) => i.category === 'venue')!

    expect(food.plannedINR).toBeGreaterThan(8_750)
    expect(venue.plannedINR).toBe(6_250)
  })
})

describe('proposeTradeOffs', () => {
  it('returns nothing when there is no shortfall', () => {
    const items = buildBudget(makeEvent())
    expect(proposeTradeOffs(items, makeEvent(), 0)).toEqual([])
  })

  it('offers contingency last, however large it is', () => {
    const event = makeEvent({ budgetINR: 25_000 })
    const offers = proposeTradeOffs(buildBudget(event), event, 5_000)

    expect(offers.length).toBeGreaterThan(1)
    expect(offers.at(-1)!.category).toBe('contingency')
  })

  it('never promises a saving larger than the line it comes from', () => {
    const event = makeEvent({ budgetINR: 25_000 })
    const items = buildBudget(event)
    for (const offer of proposeTradeOffs(items, event, 5_000)) {
      if (offer.category === 'food') continue // scales with headcount
      const line = items.find((i) => i.category === offer.category)!
      expect(offer.saveINR).toBeLessThanOrEqual(line.plannedINR)
    }
  })
})
