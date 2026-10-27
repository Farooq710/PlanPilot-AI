import { describe, expect, it } from 'vitest'
import { WEIGHTS, readinessTone, scoreReadiness } from '@/lib/engines/readiness'
import { Risk } from '@/lib/schemas'
import { makePlan, makeVendor } from './helpers'

const weatherRisk = (status: 'open' | 'mitigated' | 'unknown') =>
  Risk.parse({
    id: 'rk_weather',
    eventId: 'evt_test',
    kind: 'weather',
    title: 'Weather',
    severity: 'high',
    status,
    mitigation: null,
    evidence: { status: 'unknown' },
  })

describe('scoreReadiness', () => {
  it('weights sum to 100', () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('score is always the sum of its bands and within range', () => {
    const report = scoreReadiness(makePlan())
    const bandTotal = report.bands.reduce((sum, b) => sum + b.earned, 0)

    expect(report.score).toBe(bandTotal)
    expect(report.score).toBeGreaterThanOrEqual(0)
    expect(report.score).toBeLessThanOrEqual(100)
  })

  it('every deduction states a cost, a reason and a fix', () => {
    for (const deduction of scoreReadiness(makePlan()).deductions) {
      expect(deduction.points).toBeGreaterThan(0)
      expect(deduction.reason.length).toBeGreaterThan(0)
      expect(deduction.fixNext.length).toBeGreaterThan(0)
    }
  })

  it('orders deductions by the largest recoverable gain', () => {
    const points = scoreReadiness(makePlan()).deductions.map((d) => d.points)
    expect([...points].sort((a, b) => b - a)).toEqual(points)
  })

  it('awards full headroom to a well-formed plan', () => {
    // A plan allocates 100 percent of its budget by design; the contingency
    // line is the buffer and must not count against the headroom it provides.
    const band = scoreReadiness(makePlan()).bands.find((b) => b.key === 'budget')!
    expect(band.earned).toBe(WEIGHTS.budget)
  })

  it('removes headroom once the committed lines exceed the budget', () => {
    const plan = makePlan()
    const bloated = {
      ...plan,
      budget: plan.budget.map((b) =>
        b.category === 'food' ? { ...b, plannedINR: b.plannedINR + 20_000 } : b,
      ),
    }
    const band = scoreReadiness(bloated).bands.find((b) => b.key === 'budget')!
    expect(band.earned).toBe(0)
  })

  it('awards booking points only for confirmed essentials', () => {
    const none = scoreReadiness(makePlan()).bands.find((b) => b.key === 'bookings')!
    expect(none.earned).toBe(0)

    const half = scoreReadiness(
      makePlan({ vendors: [makeVendor({ category: 'venue', confirmed: true })] }),
    ).bands.find((b) => b.key === 'bookings')!
    expect(half.earned).toBe(WEIGHTS.bookings / 2)

    const both = scoreReadiness(
      makePlan({
        vendors: [
          makeVendor({ id: 'v1', category: 'venue', confirmed: true }),
          makeVendor({ id: 'v2', category: 'food', confirmed: true }),
        ],
      }),
    ).bands.find((b) => b.key === 'bookings')!
    expect(both.earned).toBe(WEIGHTS.bookings)
  })

  it('treats an unknown weather risk as unresolved, not as resolved', () => {
    const unknown = scoreReadiness(makePlan({ risks: [weatherRisk('unknown')] }))
    const band = unknown.bands.find((b) => b.key === 'weather')!

    expect(band.earned).toBe(0)
    expect(unknown.deductions.some((d) => /unresolved|not been checked/i.test(d.reason))).toBe(true)
  })

  it('awards weather points once the risk is mitigated', () => {
    const before = scoreReadiness(makePlan({ risks: [weatherRisk('open')] }))
    const after = scoreReadiness(makePlan({ risks: [weatherRisk('mitigated')] }))

    expect(after.score - before.score).toBe(WEIGHTS.weather)
  })

  it('penalises an outdoor event with no completed backup', () => {
    const report = scoreReadiness(makePlan())
    expect(report.bands.find((b) => b.key === 'backup')!.earned).toBe(0)
    expect(report.deductions.some((d) => /backup/i.test(d.reason))).toBe(true)
  })

  it('awards backup points when the backup task is done', () => {
    const plan = makePlan()
    const done = {
      ...plan,
      tasks: plan.tasks.map((t) =>
        /backup/i.test(t.title) ? { ...t, status: 'done' as const } : t,
      ),
    }
    expect(scoreReadiness(done).bands.find((b) => b.key === 'backup')!.earned).toBe(
      WEIGHTS.backup,
    )
  })

  it('names the next action as the biggest single recovery', () => {
    const report = scoreReadiness(makePlan())
    expect(report.nextAction).toBe(report.deductions[0].fixNext)
  })
})

describe('readinessTone', () => {
  it('maps the documented bands', () => {
    expect(readinessTone(100)).toBe('ok')
    expect(readinessTone(75)).toBe('ok')
    expect(readinessTone(74)).toBe('warn')
    expect(readinessTone(50)).toBe('warn')
    expect(readinessTone(49)).toBe('danger')
    expect(readinessTone(0)).toBe('danger')
  })
})
