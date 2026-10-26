import { CATEGORY_LABEL } from '@/lib/engines/budget'
import type { BudgetCategory } from '@/lib/schemas'
import {
  ConstraintReading,
  PlanExplanation,
  type ExplainInput,
  type LlmProvider,
} from './provider'

/**
 * The safe fallback. Used when no key is configured, when the network is down,
 * and when the model returns something that fails validation twice. It writes
 * from the same figures the model would have been given, so the app degrades
 * into being less eloquent rather than less correct.
 */

const CATEGORY_NOTE: Record<BudgetCategory, string> = {
  venue: 'Covers hire and the hours you need. Confirm early — it gates seating and catering.',
  food: 'Scales directly with headcount, so it moves first when the guest list changes.',
  decor: 'The most flexible line. Style can be preserved at lower cost with swaps.',
  cake: 'Sized by guest count, usually a kilogram per twenty guests.',
  activities: 'Music and games. Cuttable without affecting the core of the event.',
  contingency: 'Held back against weather, overruns and late additions. Spend it last.',
}

export class FallbackProvider implements LlmProvider {
  readonly name = 'deterministic-fallback'
  readonly available = false

  async explainPlan(input: ExplainInput): Promise<PlanExplanation> {
    const biggest = [...input.lines].sort(
      (a, b) => parseAmount(b.plannedLabel) - parseAmount(a.plannedLabel),
    )[0]

    const summary =
      `A ${input.styleLabel.toLowerCase()} ${input.eventType} for ${input.guestCount} guests in ` +
      `${input.city}, planned against ${input.budgetLabel}. The largest single line is ` +
      `${biggest ? biggest.label.toLowerCase() : 'catering'}, and a tenth of the budget is held ` +
      `back as contingency. Every figure here is an allocation, not a quote — the Research Room ` +
      `replaces them with sourced prices.`

    const watchOut =
      input.indoorOutdoor === 'outdoor'
        ? 'This is an outdoor event, so weather is the main risk. Keep a wet-weather backup costed and decided before the week of the event.'
        : 'Confirm the venue first. Seating, catering numbers and the run of show all depend on it.'

    return PlanExplanation.parse({
      summary,
      categoryNotes: input.lines.map((line) => ({
        category: line.category as BudgetCategory,
        note: CATEGORY_NOTE[line.category as BudgetCategory] ?? CATEGORY_LABEL.venue,
      })),
      watchOut,
    })
  }

  async readConstraints(constraints: string): Promise<ConstraintReading> {
    const text = constraints.trim()
    if (!text) return ConstraintReading.parse({ considerations: [] })

    // Keyword matching, not comprehension. Honest about being a fallback.
    const rules: { test: RegExp; label: string; detail: string; affects: BudgetCategory | null }[] =
      [
        {
          test: /veg|vegan|jain|no meat/i,
          label: 'Dietary requirement',
          detail: 'Dietary restrictions mentioned. Confirm counts with the caterer.',
          affects: 'food',
        },
        {
          test: /no alcohol|dry|teetotal/i,
          label: 'No alcohol',
          detail: 'A dry event. Budget soft drinks and mocktails instead.',
          affects: 'food',
        },
        {
          test: /park|valet/i,
          label: 'Parking',
          detail: 'Parking was raised. Check what the venue provides.',
          affects: 'venue',
        },
        {
          test: /kid|child|baby/i,
          label: 'Children attending',
          detail: 'Children mentioned. Plan seating, food and activities for them.',
          affects: 'activities',
        },
        {
          test: /access|wheelchair|ramp|elder/i,
          label: 'Accessibility',
          detail: 'Accessibility was raised. Confirm step-free access and seating.',
          affects: 'venue',
        },
      ]

    const considerations = rules
      .filter((r) => r.test.test(text))
      .map(({ label, detail, affects }) => ({ label, detail, affects }))

    if (!considerations.length) {
      considerations.push({
        label: 'Your notes',
        detail: `Recorded, but not interpreted: "${text.slice(0, 180)}"`,
        affects: null,
      })
    }

    return ConstraintReading.parse({ considerations })
  }
}

/** "₹8,750" -> 8750. Only used to rank lines by size. */
function parseAmount(label: string): number {
  return Number(label.replace(/[^0-9]/g, '')) || 0
}
