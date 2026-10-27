import { describe, expect, it } from 'vitest'
import { Evidence, Vendor } from '@/lib/schemas'
import { validatePlan } from '@/lib/engines/validate'
import { applyProposal } from '@/lib/engines/reducer'
import { extractPriceINR, isPermittedSource, looksPerHead } from '@/lib/sources/search'
import { makePlan, makeVendor, makeVendorProposal } from './helpers'

/**
 * The evidence rules are the product. These tests exist to make it hard to
 * weaken them by accident: an estimate must never be presentable as verified,
 * and unknown must stay unknown.
 */
describe('Evidence schema', () => {
  it('refuses to call something published without a source', () => {
    const result = Evidence.safeParse({ status: 'published', note: 'trust me' })
    expect(result.success).toBe(false)
  })

  it('refuses a sourced fact with no retrieval time', () => {
    const result = Evidence.safeParse({
      status: 'published',
      sourceUrl: 'https://example.in/pricing',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a properly sourced fact', () => {
    const result = Evidence.safeParse({
      status: 'published',
      sourceUrl: 'https://example.in/pricing',
      fetchedAt: '2026-11-01T00:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('allows an estimate to carry no source at all', () => {
    expect(Evidence.safeParse({ status: 'estimate', note: 'typical rate' }).success).toBe(true)
  })

  it('rejects a javascript: URL that would become an href', () => {
    const result = Evidence.safeParse({
      status: 'published',
      sourceUrl: 'javascript:alert(1)',
      fetchedAt: '2026-11-01T00:00:00.000Z',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed source URL', () => {
    const result = Evidence.safeParse({
      status: 'published',
      sourceUrl: 'not-a-url',
      fetchedAt: '2026-11-01T00:00:00.000Z',
    })
    expect(result.success).toBe(false)
  })
})

describe('validatePlan evidence rules', () => {
  it('blocks a price shown against unknown evidence', () => {
    const plan = makePlan({
      vendors: [makeVendor({ priceINR: 5_000, evidence: { status: 'unknown' } })],
    })
    const { ok, issues } = validatePlan(plan)

    expect(ok).toBe(false)
    expect(issues.some((i) => i.severity === 'blocker' && i.area === 'evidence')).toBe(true)
  })

  it('accepts a price backed by an estimate', () => {
    const plan = makePlan({
      vendors: [makeVendor({ priceINR: 5_000, evidence: { status: 'estimate', note: 'typical' } })],
    })
    expect(validatePlan(plan).issues.some((i) => i.severity === 'blocker')).toBe(false)
  })

  it('blocks a venue too small for the guest list', () => {
    const plan = makePlan({
      vendors: [makeVendor({ capacity: 10, confirmed: true, name: 'Tiny Room' })],
    })
    const { ok, issues } = validatePlan(plan)

    expect(ok).toBe(false)
    expect(issues.some((i) => i.area === 'capacity')).toBe(true)
  })

  it('reports unknown risks rather than treating them as resolved', () => {
    const plan = makePlan({
      risks: [
        {
          id: 'rk_w',
          eventId: 'evt_test',
          kind: 'weather',
          title: 'Weather',
          severity: 'high',
          status: 'unknown',
          mitigation: null,
          evidence: { status: 'unknown' },
        },
      ],
    })
    expect(validatePlan(plan).issues.some((i) => /could not be assessed/.test(i.message))).toBe(
      true,
    )
  })
})

describe('reducer evidence enforcement', () => {
  it('rejects a proposed vendor whose price has no evidence', () => {
    const plan = makePlan()
    const result = applyProposal(plan, {
      kind: 'research',
      // The reducer assigns the id and event id itself.
      vendors: [makeVendorProposal({ priceINR: 9_000, evidence: { status: 'unknown' } })],
      gaps: [],
    })

    expect(result.plan.vendors).toHaveLength(0)
    expect(result.rejected.map((r) => r.reason).join(' ')).toMatch(/unknown evidence/i)
  })

  it('rejects a budget proposal that exceeds the event budget', () => {
    const plan = makePlan()
    const result = applyProposal(plan, {
      kind: 'budget',
      rationale: '',
      items: plan.budget.map((b) => ({
        category: b.category,
        label: b.label,
        plannedINR: b.plannedINR * 2,
        evidence: { status: 'estimate' as const },
      })),
    })

    expect(result.rejected.some((r) => /exceeds the event budget/i.test(r.reason))).toBe(true)
    // Rejected whole, never half-applied.
    expect(result.plan.budget).toEqual(plan.budget)
  })

  it('preserves a shortlist choice across a re-run', () => {
    const plan = makePlan({
      vendors: [makeVendor({ name: 'Keep Me', shortlisted: true, confirmed: true })],
    })
    const result = applyProposal(plan, {
      kind: 'research',
      gaps: [],
      vendors: [makeVendorProposal({ name: 'Keep Me' })],
    })

    const vendor = result.plan.vendors.find((v) => v.name === 'Keep Me')!
    expect(vendor.shortlisted).toBe(true)
    expect(vendor.confirmed).toBe(true)
  })
})

describe('search extraction', () => {
  it('reads a rupee figure in several notations', () => {
    expect(extractPriceINR('Buffet from Rs 450 per head')).toBe(450)
    expect(extractPriceINR('₹1,200 per plate')).toBe(1_200)
    expect(extractPriceINR('INR 2.5 lakh for the hall')).toBe(250_000)
    expect(extractPriceINR('starting at Rs 15k')).toBe(15_000)
  })

  it('returns null rather than guessing', () => {
    expect(extractPriceINR('call for details')).toBeNull()
    expect(extractPriceINR('')).toBeNull()
    expect(extractPriceINR('open 9 to 5')).toBeNull()
  })

  it('ignores figures outside a plausible range', () => {
    expect(extractPriceINR('Rs 2 per sticker')).toBeNull()
    expect(extractPriceINR('Rs 90,00,000 villa')).toBeNull()
  })

  it('detects a per-head rate', () => {
    expect(looksPerHead('Rs 450 per head')).toBe(true)
    expect(looksPerHead('Rs 450 per plate')).toBe(true)
    expect(looksPerHead('Rs 45000 total')).toBe(false)
  })
})

describe('source permissions', () => {
  it('refuses map, social and directory hosts', () => {
    for (const url of [
      'https://maps.google.com/place/x',
      'https://www.justdial.com/x',
      'https://instagram.com/x',
      'https://www.tripadvisor.in/x',
      'https://x.com/someone',
    ]) {
      expect(isPermittedSource(url), url).toBe(false)
    }
  })

  it('allows an ordinary vendor site', () => {
    expect(isPermittedSource('https://example.in/pricing')).toBe(true)
  })

  it('refuses anything that is not an http(s) URL', () => {
    // new URL() parses these, so the protocol must be checked explicitly or a
    // javascript: URL reaches the page as an href.
    expect(isPermittedSource('javascript:alert(1)')).toBe(false)
    expect(isPermittedSource('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isPermittedSource('file:///etc/passwd')).toBe(false)
    expect(isPermittedSource('not a url')).toBe(false)
  })
})

describe('Vendor schema', () => {
  it('defaults an unspecified price and capacity to unknown rather than zero', () => {
    const vendor = Vendor.parse({
      id: 'v',
      eventId: 'e',
      name: 'Somewhere',
      category: 'venue',
      fetchedAt: '2026-11-01T00:00:00.000Z',
      evidence: { status: 'unknown' },
    })

    expect(vendor.priceINR).toBeNull()
    expect(vendor.capacity).toBeNull()
  })
})
