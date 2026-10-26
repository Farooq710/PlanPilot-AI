import {
  BudgetItem,
  type BudgetCategory,
  type EventRecord,
  type EventType,
} from '@/lib/schemas'
import { inr } from '@/lib/money'

/**
 * All budget arithmetic lives here, in code. The LLM never computes a figure —
 * it only writes prose about figures this module has already decided.
 */

export type Split = Record<BudgetCategory, number>

/** Percentages, summing to 100. Editable per event type. */
export const SPLITS: Record<EventType, Split> = {
  birthday: { venue: 25, food: 35, decor: 15, cake: 8, activities: 7, contingency: 10 },
  wedding: { venue: 30, food: 38, decor: 14, cake: 4, activities: 4, contingency: 10 },
  community: { venue: 30, food: 30, decor: 12, cake: 3, activities: 15, contingency: 10 },
  corporate: { venue: 32, food: 36, decor: 10, cake: 2, activities: 10, contingency: 10 },
}

export const CATEGORY_ORDER: BudgetCategory[] = [
  'venue',
  'food',
  'decor',
  'cake',
  'activities',
  'contingency',
]

export const CATEGORY_LABEL: Record<BudgetCategory, string> = {
  venue: 'Venue',
  food: 'Food',
  decor: 'Decor',
  cake: 'Cake',
  activities: 'Activities',
  contingency: 'Contingency',
}

/**
 * Which categories scale with headcount. Used both when first building the
 * budget and when a what-if changes the guest count, so the two can never
 * disagree about what a guest costs.
 */
export const SCALES_WITH_GUESTS: BudgetCategory[] = ['food', 'cake']

const LINE_LABEL: Record<BudgetCategory, string> = {
  venue: 'Venue hire',
  food: 'Catering',
  decor: 'Decor and florals',
  cake: 'Celebration cake',
  activities: 'Activities and music',
  contingency: 'Contingency',
}

/**
 * Budget item ids are scoped to their event. Two events in the same database
 * would otherwise both claim `bi_venue`.
 */
export const budgetItemId = (eventId: string, category: BudgetCategory) =>
  `bi_${eventId}_${category}`

const floorTo = (n: number, step: number) => Math.floor(n / step) * step

/**
 * Builds the opening budget. Allocations are floored to the nearest ₹10 and the
 * remainder is swept into contingency, so the total is exactly the budget —
 * never a rupee over, which is acceptance test 1.
 */
export function buildBudget(event: EventRecord): BudgetItem[] {
  const split = SPLITS[event.type]
  const allocated: Partial<Record<BudgetCategory, number>> = {}

  let running = 0
  for (const category of CATEGORY_ORDER) {
    if (category === 'contingency') continue
    const amount = floorTo((event.budgetINR * split[category]) / 100, 10)
    allocated[category] = amount
    running += amount
  }
  // Whatever rounding left behind lands here, keeping the sum exact.
  allocated.contingency = Math.max(0, event.budgetINR - running)

  return CATEGORY_ORDER.map((category) => {
    const plannedINR = allocated[category] ?? 0
    const scales = SCALES_WITH_GUESTS.includes(category)
    return BudgetItem.parse({
      id: budgetItemId(event.id, category),
      eventId: event.id,
      category,
      label: LINE_LABEL[category],
      plannedINR,
      actualINR: null,
      perHead: scales && event.guestCount > 0 ? Math.round(plannedINR / event.guestCount) : null,
      evidence: {
        status: 'estimate',
        note: `${split[category]}% of a ${inr(event.budgetINR)} budget for ${event.guestCount} guests`,
      },
    })
  })
}

/* ------------------------------------------------------------------ totals */

export type BudgetTotals = {
  planned: number
  actual: number
  /** Positive when actuals exceed the budget. */
  overBy: number
  remaining: number
}

export function budgetTotals(items: BudgetItem[], budgetINR: number): BudgetTotals {
  const planned = items.reduce((sum, i) => sum + i.plannedINR, 0)
  const actual = items.reduce((sum, i) => sum + (i.actualINR ?? 0), 0)
  return {
    planned,
    actual,
    overBy: Math.max(0, actual - budgetINR),
    remaining: budgetINR - actual,
  }
}

/** Categories whose actual has run past their plan. */
export function overspentCategories(items: BudgetItem[]): BudgetItem[] {
  return items.filter((i) => (i.actualINR ?? 0) > i.plannedINR)
}

/* -------------------------------------------------------------- trade-offs */

export type TradeOff = {
  category: BudgetCategory
  label: string
  saveINR: number
  action: string
}

/**
 * When a plan is over budget we propose specific cuts rather than telling the
 * user to "reduce costs". Contingency is offered last, and only what is
 * genuinely available is ever promised.
 */
export function proposeTradeOffs(
  items: BudgetItem[],
  event: EventRecord,
  needINR: number,
): TradeOff[] {
  if (needINR <= 0) return []

  const byCategory = new Map(items.map((i) => [i.category, i]))
  const options: TradeOff[] = []

  const food = byCategory.get('food')
  if (food && food.perHead) {
    // A buffet course is worth roughly 15% of the per-head rate.
    const save = Math.round(food.perHead * 0.15) * event.guestCount
    if (save > 0) {
      options.push({
        category: 'food',
        label: CATEGORY_LABEL.food,
        saveINR: save,
        action: `Drop one buffet course, saving about ${inr(
          Math.round(food.perHead * 0.15),
        )} per head across ${event.guestCount} guests`,
      })
    }
  }

  const decor = byCategory.get('decor')
  if (decor && decor.plannedINR > 0) {
    const save = Math.round(decor.plannedINR * 0.3)
    options.push({
      category: 'decor',
      label: CATEGORY_LABEL.decor,
      saveINR: save,
      action: `Swap fresh florals for dried and candles, keeping the look and saving ${inr(save)}`,
    })
  }

  const activities = byCategory.get('activities')
  if (activities && activities.plannedINR > 0) {
    options.push({
      category: 'activities',
      label: CATEGORY_LABEL.activities,
      saveINR: activities.plannedINR,
      action: `Run self-hosted games and a playlist instead of hired entertainment, saving ${inr(
        activities.plannedINR,
      )}`,
    })
  }

  const contingency = byCategory.get('contingency')
  if (contingency && contingency.plannedINR > 0) {
    options.push({
      category: 'contingency',
      label: CATEGORY_LABEL.contingency,
      saveINR: contingency.plannedINR,
      action: `Draw ${inr(contingency.plannedINR)} from contingency — this removes your buffer`,
    })
  }

  // Biggest saving first, but contingency stays last whatever it is worth.
  return options.sort((a, b) => {
    if (a.category === 'contingency') return 1
    if (b.category === 'contingency') return -1
    return b.saveINR - a.saveINR
  })
}

/**
 * Rescales the headcount-driven lines for a new guest count. Returns fresh
 * items; nothing is mutated, so the caller can diff before and after.
 */
export function rescaleForGuests(items: BudgetItem[], guestCount: number): BudgetItem[] {
  return items.map((item) => {
    if (!item.perHead || !SCALES_WITH_GUESTS.includes(item.category)) return item
    return { ...item, plannedINR: Math.round(item.perHead * guestCount) }
  })
}
