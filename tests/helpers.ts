import { EventRecord, Plan, type Vendor } from '@/lib/schemas'
import { buildBudget } from '@/lib/engines/budget'
import { buildSchedule, buildTasks } from '@/lib/engines/schedule'

/** Test fixtures. Everything goes through the real schemas, never a cast. */

const BASE = {
  id: 'evt_test',
  type: 'birthday' as const,
  title: 'Test Birthday',
  city: 'Hyderabad',
  geo: { lat: 17.385, lon: 78.4867 },
  date: '2026-12-05',
  time: '19:00',
  guestCount: 40,
  budgetINR: 25_000,
  style: ['premium' as const],
  indoorOutdoor: 'outdoor' as const,
  constraints: 'Vegetarian options for 15 guests.',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

export function makeEvent(overrides: Partial<typeof BASE> = {}) {
  return EventRecord.parse({ ...BASE, ...overrides })
}

export function makeVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: 'vn_test',
    eventId: BASE.id,
    name: 'Test Venue',
    category: 'venue',
    sourceUrl: null,
    fetchedAt: '2026-11-01T00:00:00.000Z',
    priceINR: null,
    capacity: null,
    geo: null,
    address: null,
    fact: null,
    evidence: { status: 'estimate', note: 'test fixture' },
    shortlisted: false,
    confirmed: false,
    ...overrides,
  }
}

/**
 * A vendor shaped as the reducer expects a proposal: no id and no eventId,
 * because the reducer assigns both.
 */
export function makeVendorProposal(overrides: Partial<Vendor> = {}) {
  const { id: _id, eventId: _eventId, ...rest } = makeVendor(overrides)
  return rest
}

/** A complete, schema-valid plan built by the real engines. */
export function makePlan(overrides: Partial<Plan> = {}): Plan {
  const event = overrides.event ?? makeEvent()
  return Plan.parse({
    event,
    budget: buildBudget(event),
    vendors: [],
    tasks: buildTasks(event),
    risks: [],
    schedule: buildSchedule(event),
    narrative: null,
    usingSampleData: false,
    ...overrides,
  })
}
