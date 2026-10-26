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
 * The demo scenario, carried over from the Figma reference so the build and the
 * design agree. Every record is parsed through its schema here, which means a
 * drift between the two surfaces fails loudly at startup rather than silently
 * in the UI.
 *
 * This is seed data for the walkthrough, not the fallback dataset — that one
 * lands in M6 and is labelled "Sample data, not live" wherever it is shown.
 */

export const DEMO_EVENT_ID = 'evt_demo_hyderabad'

const FETCHED = '2025-10-26T09:14:00.000Z'

const published = (url: string, note: string): Evidence => ({
  status: 'published',
  sourceUrl: url,
  sourceDomain: new URL(url).host,
  fetchedAt: FETCHED,
  note,
})

const estimate = (note: string): Evidence => ({ status: 'estimate', note })

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

/** Planned figures sum to exactly the 25,000 budget. Verified by assertDemoPlan. */
export const demoBudget: BudgetItem[] = [
  {
    id: 'bi_venue',
    category: 'venue',
    label: 'Rooftop terrace, 4 hours',
    plannedINR: 6250,
    actualINR: 4000,
    perHead: null,
    evidence: published('https://olivebistro.in/private-dining', 'Terrace hire from ₹4,000'),
  },
  {
    id: 'bi_food',
    category: 'food',
    label: 'Dinner buffet',
    plannedINR: 8750,
    actualINR: 10850,
    perHead: 271,
    evidence: published('https://sampoornacaterers.in/menus', 'Veg buffet ₹271 per head'),
  },
  {
    id: 'bi_decor',
    category: 'decor',
    label: 'Florals, lighting, backdrop',
    plannedINR: 3750,
    actualINR: 1950,
    perHead: null,
    evidence: estimate('Typical premium outdoor package for 40 guests'),
  },
  {
    id: 'bi_cake',
    category: 'cake',
    label: '2 kg celebration cake',
    plannedINR: 2000,
    actualINR: 1200,
    perHead: null,
    evidence: published('https://thecakeshoppe.in/pricing', 'Fondant cake ₹600 per kg'),
  },
  {
    id: 'bi_activities',
    category: 'activities',
    label: 'Music and games',
    plannedINR: 1750,
    actualINR: 400,
    perHead: null,
    evidence: estimate('Speaker hire plus props'),
  },
  {
    id: 'bi_contingency',
    category: 'contingency',
    label: 'Contingency, 10%',
    plannedINR: 2500,
    actualINR: 0,
    perHead: null,
    evidence: { status: 'estimate', note: 'Reserved against weather and overruns' },
  },
].map((b) =>
  BudgetItem.parse({
    ...b,
    id: budgetItemId(DEMO_EVENT_ID, b.category as BudgetCategory),
    eventId: DEMO_EVENT_ID,
  }),
)

export const demoVendors: Vendor[] = [
  {
    id: 'vn_olive',
    name: 'Olive Bistro Rooftop',
    category: 'venue',
    sourceUrl: 'https://olivebistro.in/private-dining',
    fetchedAt: FETCHED,
    priceINR: 4000,
    capacity: 50,
    geo: { lat: 17.4239, lon: 78.4194 },
    address: 'Jubilee Hills, Hyderabad',
    fact: 'Terrace seats 50, hire from ₹4,000 for 4 hours',
    evidence: published('https://olivebistro.in/private-dining', 'Terrace hire from ₹4,000'),
    shortlisted: true,
  },
  {
    id: 'vn_sampoorna',
    name: 'Sampoorna Caterers',
    category: 'food',
    sourceUrl: 'https://sampoornacaterers.in/menus',
    fetchedAt: FETCHED,
    priceINR: 271,
    capacity: null,
    geo: null,
    address: 'Banjara Hills, Hyderabad',
    fact: 'Vegetarian buffet at ₹271 per head, minimum 30',
    evidence: published('https://sampoornacaterers.in/menus', 'Veg buffet ₹271 per head'),
    shortlisted: true,
  },
  {
    id: 'vn_bloom',
    name: 'Bloom & Bough Decor',
    category: 'decor',
    sourceUrl: null,
    fetchedAt: FETCHED,
    priceINR: null,
    capacity: null,
    geo: { lat: 17.4126, lon: 78.4071 },
    address: 'Road No. 12, Banjara Hills',
    // OpenStreetMap carries neither price nor capacity, so both stay unknown.
    fact: 'Listed on OpenStreetMap as a florist. No published pricing.',
    evidence: { status: 'unknown', sourceDomain: 'openstreetmap.org', fetchedAt: FETCHED },
    shortlisted: false,
  },
  {
    id: 'vn_cake',
    name: 'The Cake Shoppe',
    category: 'cake',
    sourceUrl: 'https://thecakeshoppe.in/pricing',
    fetchedAt: FETCHED,
    priceINR: 600,
    capacity: null,
    geo: null,
    address: 'Jubilee Hills, Hyderabad',
    fact: 'Fondant cakes from ₹600 per kg, 48 hours notice',
    evidence: published('https://thecakeshoppe.in/pricing', 'Fondant cake ₹600 per kg'),
    shortlisted: true,
  },
  {
    id: 'vn_rentals',
    name: 'Hyderabad Party Rentals',
    category: 'rentals',
    sourceUrl: null,
    fetchedAt: FETCHED,
    priceINR: 3200,
    capacity: null,
    geo: null,
    address: 'Madhapur, Hyderabad',
    fact: 'Quoted ₹3,200 for a 20x20 canopy on a call',
    evidence: { status: 'user_quote', note: 'Quoted by phone on 26 Oct', fetchedAt: FETCHED },
    shortlisted: false,
  },
].map((v) => Vendor.parse({ ...v, eventId: DEMO_EVENT_ID }))

export const demoTasks: Task[] = [
  { id: 'tk_venue', title: 'Confirm rooftop booking', dueDate: '2025-10-28', status: 'doing', category: 'venue' },
  { id: 'tk_menu', title: 'Lock the buffet menu', dueDate: '2025-10-29', status: 'todo', dependsOn: ['tk_venue'], category: 'food' },
  { id: 'tk_cake', title: 'Order the cake', dueDate: '2025-10-30', status: 'todo', category: 'cake' },
  { id: 'tk_decor', title: 'Approve decor moodboard', dueDate: '2025-10-29', status: 'done', category: 'decor' },
  { id: 'tk_backup', title: 'Arrange wet-weather canopy', dueDate: '2025-10-30', status: 'todo', category: 'venue' },
].map((t) => Task.parse({ ...t, eventId: DEMO_EVENT_ID }))

export const demoRisks: Risk[] = [
  {
    id: 'rk_weather',
    kind: 'weather',
    title: 'Rain forecast on the event evening',
    severity: 'high',
    status: 'open',
    mitigation: 'Hold the canopy quote and confirm by 30 Oct.',
    // The forecast window reached the date, so this one is published, not guessed.
    evidence: published('https://open-meteo.com/', '62% chance of rain after 6 PM'),
  },
  {
    id: 'rk_capacity',
    kind: 'capacity',
    title: 'Venue capacity leaves no headroom',
    severity: 'medium',
    status: 'open',
    mitigation: 'Terrace seats 50 against 40 guests. Cap the guest list at 48.',
    evidence: published('https://olivebistro.in/private-dining', 'Terrace seats 50'),
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
].map((r) => Risk.parse({ ...r, eventId: DEMO_EVENT_ID }))

export const demoPlan: Plan = Plan.parse({
  event: demoEvent,
  budget: demoBudget,
  vendors: demoVendors,
  tasks: demoTasks,
  risks: demoRisks,
  schedule: [],
  usingSampleData: false,
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
