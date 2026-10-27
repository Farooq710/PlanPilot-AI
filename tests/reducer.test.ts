import { describe, expect, it } from 'vitest'
import { applyAll, applyProposal } from '@/lib/engines/reducer'
import type { Proposal } from '@/lib/schemas'
import { makePlan, makeVendor, makeVendorProposal } from './helpers'

/**
 * The reducer is the only thing that writes to a plan, so its rejection paths
 * matter more than its happy path. A proposal must land whole or not at all.
 */
describe('applyProposal: budget', () => {
  const plan = makePlan()

  const lines = (overrides: Partial<{ plannedINR: number }> = {}) =>
    plan.budget.map((b) => ({
      category: b.category,
      label: b.label,
      plannedINR: overrides.plannedINR ?? b.plannedINR,
      evidence: { status: 'estimate' as const },
    }))

  it('applies a budget that fits', () => {
    const result = applyProposal(plan, { kind: 'budget', rationale: '', items: lines() })

    expect(result.rejected).toHaveLength(0)
    expect(result.applied.join(' ')).toMatch(/budget lines/)
    expect(result.plan.budget).toHaveLength(plan.budget.length)
  })

  it('scopes the ids it assigns to the event', () => {
    const result = applyProposal(plan, { kind: 'budget', rationale: '', items: lines() })
    expect(result.plan.budget.every((b) => b.id.includes(plan.event.id))).toBe(true)
  })

  it('drops an individual malformed line but keeps the rest', () => {
    const items = lines()
    // A negative allocation is not a valid budget line.
    items[0] = { ...items[0], plannedINR: -5 }

    const result = applyProposal(plan, { kind: 'budget', rationale: '', items })

    expect(result.rejected).toHaveLength(1)
    expect(result.plan.budget).toHaveLength(items.length - 1)
  })

  it('rejects the whole proposal when the total exceeds the budget', () => {
    const result = applyProposal(plan, {
      kind: 'budget',
      rationale: '',
      items: lines({ plannedINR: 99_999 }),
    })

    expect(result.rejected.some((r) => /exceeds the event budget/i.test(r.reason))).toBe(true)
    // Nothing partial: the original budget is untouched.
    expect(result.plan.budget).toEqual(plan.budget)
  })
})

describe('applyProposal: research', () => {
  const plan = makePlan()

  it('adds vendors and reports how many landed', () => {
    const result = applyProposal(plan, {
      kind: 'research',
      gaps: [],
      vendors: [
        makeVendorProposal({ name: 'One' }),
        makeVendorProposal({ name: 'Two', category: 'food' }),
      ],
    })

    expect(result.plan.vendors).toHaveLength(2)
    expect(result.applied.join(' ')).toMatch(/2 research results/)
  })

  it('deduplicates by name within a category', () => {
    const result = applyProposal(plan, {
      kind: 'research',
      gaps: [],
      vendors: [makeVendorProposal({ name: 'Olive Rooftop' }), makeVendorProposal({ name: 'olive rooftop' })],
    })

    expect(result.plan.vendors).toHaveLength(1)
  })

  it('keeps the same name in a different category as a separate vendor', () => {
    const result = applyProposal(plan, {
      kind: 'research',
      gaps: [],
      vendors: [
        makeVendorProposal({ name: 'Same Name', category: 'venue' }),
        makeVendorProposal({ name: 'Same Name', category: 'food' }),
      ],
    })

    expect(result.plan.vendors).toHaveLength(2)
  })

  it('rejects a vendor with an unusable source URL', () => {
    const result = applyProposal(plan, {
      kind: 'research',
      gaps: [],
      // Schema-invalid: a source URL must be http(s).
      vendors: [makeVendorProposal({ name: 'Bad', sourceUrl: 'javascript:alert(1)' })],
    })

    expect(result.plan.vendors).toHaveLength(0)
    expect(result.rejected).toHaveLength(1)
  })
})

describe('applyProposal: schedule', () => {
  it('replaces entries and tasks together', () => {
    const plan = makePlan()
    const result = applyProposal(plan, {
      kind: 'schedule',
      entries: [
        {
          title: 'Doors open',
          startsAt: '2026-12-05T13:30:00.000Z',
          durationMinutes: 30,
          category: null,
          note: null,
        },
      ],
      tasks: [
        {
          title: 'Brief the venue',
          dueDate: '2026-12-01',
          status: 'todo',
          dependsOn: [],
          linkedItemId: null,
          category: 'venue',
        },
      ],
    })

    expect(result.plan.schedule).toHaveLength(1)
    expect(result.plan.tasks).toHaveLength(1)
    expect(result.applied.join(' ')).toMatch(/run-of-show slots/)
  })

  it('rejects a slot with an impossible duration', () => {
    const plan = makePlan()
    const result = applyProposal(plan, {
      kind: 'schedule',
      tasks: [],
      entries: [
        {
          title: 'Forever',
          startsAt: '2026-12-05T13:30:00.000Z',
          // Over 24 hours is out of range.
          durationMinutes: 5_000,
          category: null,
          note: null,
        },
      ],
    })

    expect(result.rejected).toHaveLength(1)
    expect(result.plan.schedule).toEqual(plan.schedule)
  })
})

describe('applyProposal: risk', () => {
  const risk = (title: string, status: 'open' | 'mitigated' | 'unknown' = 'open') => ({
    kind: 'weather' as const,
    title,
    severity: 'high' as const,
    status,
    mitigation: null,
    evidence: { status: 'unknown' as const },
  })

  it('adds risks', () => {
    const result = applyProposal(makePlan(), { kind: 'risk', risks: [risk('Rain likely')] })
    expect(result.plan.risks).toHaveLength(1)
  })

  it('does not reopen a risk the user already mitigated', () => {
    const first = applyProposal(makePlan(), { kind: 'risk', risks: [risk('Rain likely')] })
    const mitigated = {
      ...first.plan,
      risks: first.plan.risks.map((r) => ({ ...r, status: 'mitigated' as const })),
    }

    // A later research run proposes the same risk as open again.
    const second = applyProposal(mitigated, { kind: 'risk', risks: [risk('Rain likely')] })

    expect(second.plan.risks[0].status).toBe('mitigated')
  })
})

describe('applyAll', () => {
  it('threads the plan through every proposal and accumulates outcomes', () => {
    const plan = makePlan()
    const proposals: Proposal[] = [
      { kind: 'research', gaps: [], vendors: [makeVendorProposal({ name: 'Venue A' })] },
      { kind: 'risk', risks: [] },
      {
        kind: 'budget',
        rationale: '',
        // Rejected: over budget.
        items: plan.budget.map((b) => ({
          category: b.category,
          label: b.label,
          plannedINR: 99_999,
          evidence: { status: 'estimate' as const },
        })),
      },
    ]

    const result = applyAll(plan, proposals)

    // The research proposal still landed despite the budget one failing.
    expect(result.plan.vendors).toHaveLength(1)
    expect(result.rejected.length).toBeGreaterThan(0)
  })

  it('is a no-op for an empty batch', () => {
    const plan = makePlan({ vendors: [makeVendor()] })
    const result = applyAll(plan, [])

    expect(result.plan).toEqual(plan)
    expect(result.applied).toHaveLength(0)
    expect(result.rejected).toHaveLength(0)
  })
})
