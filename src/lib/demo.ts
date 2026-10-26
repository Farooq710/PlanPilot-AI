import { budgetItemId } from '@/lib/engines/budget'
import {
  BudgetItem,
  EventRecord,
  Plan,
  Risk,
  Task,
  Vendor,
  type BudgetCategory,
  type Evidence,
} from '@/lib/schemas'

/**
 * The demo scenario, carried over from the Figma reference so the build and
 * the design agree. Every record is parsed through its schema here, so drift
 * between the two surfaces fails loudly at startup rather than silently in
 * the UI.
 *
 * This is sample data and the plan is flagged as such, which is why the
 * workspace shows the "Sample data — not live" banner over it.
 *
 * Nothing here is labelled `published`, and no record carries a source URL.
 * An earlier version of this file asserted published evidence against URLs
 * invented to look plausible — which is the exact failure this product exists
 * to prevent. Sourced evidence only ever comes from the research engine, which
 * has actually fetched the page it cites.
 */

export const DEMO_EVENT_ID = 'evt_demo_hyderabad'

const FETCHED = '2025-10-26T09:14:00.000Z'

const estimate = (note: string): Evidence => ({ status: 'estimate', note })

const quoted = (note: string): Evidence => ({
  status: 'user_quote',
  note,
  fetchedAt: FETCHED,
})

const unknown = (): Evidence => ({ status: 'unknown' })

export const demoEvent: EventRecord = EventRecord.parse({
  id: DEMO_EVENT_ID,
  type: 'birthday',
  title: "Aarav's 30th Birthday",
  city: 'Hyderabad',
  geo: { lat: 17.385, lon: 78.4867 },
  date: '2025-11-01',
  time: '19:00',
  guestCount: 40,
  budgetINR: 25000,
  style: ['premium'],
  indoorOutdoor: 'outdoor',
  constraints: 'Vegetarian options for 15 guests. Parking needed.',
  createdAt: FETCHED,
  updatedAt: FETCHED,
})

/** Planned figures sum to exactly the 25,000 budget. Enforced by assertDemoPlan. */
export const demoBudget: BudgetItem[] = (
  [
    {
      category: 'venue',
      label: 'Rooftop terrace, 4 hours',
      plannedINR: 6250,
      actualINR: 4000,
      perHead: null,
      evidence: estimate('Illustrative rooftop hire for this area'),
    },
    {
      category: 'food',
      label: 'Dinner buffet',
      plannedINR: 8750,
      actualINR: 10850,
      perHead: 271,
      evidence: quoted('Caterer quoted ₹271 per head by phone'),
    },
    {
      category: 'decor',
      label: 'Florals, lighting, backdrop',
      plannedINR: 3750,
      actualINR: 1950,
      perHead: null,
      evidence: estimate('Typical premium outdoor package for 40 guests'),
    },
    {
      category: 'cake',
      label: '2 kg celebration cake',
      plannedINR: 2000,
      actualINR: 1200,
      perHead: null,
      evidence: estimate('Illustrative rate of ₹600 per kilogram'),
    },
    {
      category: 'activities',
      label: 'Music and games',
      plannedINR: 1750,
      actualINR: 400,
      perHead: null,
      evidence: estimate('Speaker hire plus props'),
    },
    {
      category: 'contingency',
      label: 'Contingency, 10%',
      plannedINR: 2500,
      actualINR: 0,
      perHead: null,
      evidence: estimate('Reserved against weather and overruns'),
    },
  ] as const
).map((b) =>
  BudgetItem.parse({
    ...b,
    id: budgetItemId(DEMO_EVENT_ID, b.category as BudgetCategory),
    eventId: DEMO_EVENT_ID,
  }),
)

export const demoVendors: Vendor[] = (
  [
    {
      id: 'vn_rooftop',
      name: 'Rooftop terrace (sample)',
      category: 'venue',
      priceINR: 4000,
      capacity: 50,
      geo: { lat: 17.4239, lon: 78.4194 },
      address: 'Jubilee Hills, Hyderabad',
      fact: 'Terrace seats 50, four-hour hire',
      evidence: estimate('Illustrative rooftop rate, not a quote'),
      shortlisted: true,
    },
    {
      id: 'vn_caterer',
      name: 'Vegetarian buffet caterer (sample)',
      category: 'food',
      priceINR: 271,
      capacity: null,
      geo: null,
      address: 'Banjara Hills, Hyderabad',
      fact: 'Quoted ₹271 per head, minimum 30 covers',
      evidence: quoted('Quoted by phone on 26 Oct'),
      shortlisted: true,
    },
    {
      id: 'vn_florist',
      name: 'Local florist (sample)',
      category: 'decor',
      priceINR: null,
      capacity: null,
      geo: { lat: 17.4126, lon: 78.4071 },
      address: 'Road No. 12, Banjara Hills',
      // Price and capacity genuinely unknown — the honest default.
      fact: 'No published pricing found',
      evidence: unknown(),
      shortlisted: false,
    },
    {
      id: 'vn_cake',
      name: 'Celebration cakes (sample)',
      category: 'cake',
      priceINR: 600,
      capacity: null,
      geo: null,
      address: 'Jubilee Hills, Hyderabad',
      fact: 'Around ₹600 per kilogram, 48 hours notice',
      evidence: estimate('Illustrative per-kilogram rate'),
      shortlisted: true,
    },
    {
      id: 'vn_rentals',
      name: 'Canopy and seating hire (sample)',
      category: 'rentals',
      priceINR: 3200,
      capacity: null,
      geo: null,
      address: 'Madhapur, Hyderabad',
      fact: 'Quoted ₹3,200 for a 20x20 canopy',
      evidence: quoted('Quoted by phone on 26 Oct'),
      shortlisted: false,
    },
  ] as const
).map((v) => Vendor.parse({ ...v, sourceUrl: null, fetchedAt: FETCHED, eventId: DEMO_EVENT_ID }))

export const demoTasks: Task[] = (
  [
    { id: 'tk_venue', title: 'Confirm rooftop booking', dueDate: '2025-10-28', status: 'doing', category: 'venue' },
    { id: 'tk_menu', title: 'Lock the buffet menu', dueDate: '2025-10-29', status: 'todo', dependsOn: ['tk_venue'], category: 'food' },
    { id: 'tk_cake', title: 'Order the cake', dueDate: '2025-10-30', status: 'todo', category: 'cake' },
    { id: 'tk_decor', title: 'Approve decor moodboard', dueDate: '2025-10-29', status: 'done', category: 'decor' },
    { id: 'tk_backup', title: 'Arrange wet-weather canopy', dueDate: '2025-10-30', status: 'todo', category: 'venue' },
  ] as const
).map((t) => Task.parse({ ...t, eventId: DEMO_EVENT_ID }))

export const demoRisks: Risk[] = (
  [
    {
      id: 'rk_weather',
      kind: 'weather',
      title: 'Weather on the event evening is unconfirmed',
      severity: 'high',
      // No forecast was fetched for this seed, so the status is unknown.
      status: 'unknown',
      mitigation: 'Run research to fetch the forecast, and hold the canopy quote.',
      evidence: unknown(),
    },
    {
      id: 'rk_capacity',
      kind: 'capacity',
      title: 'Venue capacity leaves no headroom',
      severity: 'medium',
      status: 'open',
      mitigation: 'The terrace seats 50 against 40 guests. Cap the guest list at 48.',
      evidence: estimate('Based on the sample venue capacity'),
    },
    {
      id: 'rk_budget',
      kind: 'budget',
      title: 'Catering is over its allocation',
      severity: 'medium',
      status: 'open',
      mitigation: 'Food is ₹2,100 over. Trim the starter course or draw on contingency.',
      evidence: estimate('Derived from the quoted per-head rate'),
    },
  ] as const
).map((r) => Risk.parse({ ...r, eventId: DEMO_EVENT_ID }))

export const demoPlan: Plan = Plan.parse({
  event: demoEvent,
  budget: demoBudget,
  vendors: demoVendors,
  tasks: demoTasks,
  risks: demoRisks,
  schedule: [],
  narrative: null,
  // The seed is illustrative, so the banner stays up until a real plan is built.
  usingSampleData: true,
})

/**
 * Acceptance test 1 lives here rather than in the UI: the demo brief must
 * produce a plan that sums to at most its budget.
 */
export function assertDemoPlan(): void {
  const planned = demoBudget.reduce((s, b) => s + b.plannedINR, 0)
  if (planned > demoEvent.budgetINR) {
    throw new Error(
      `Demo plan is over budget: planned ₹${planned} against ₹${demoEvent.budgetINR}`,
    )
  }
}
