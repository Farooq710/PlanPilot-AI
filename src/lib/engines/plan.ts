import { randomUUID } from 'node:crypto'
import { EventRecord, Plan, Risk, type EventDraft } from '@/lib/schemas'
import { inr } from '@/lib/money'
import { explainPlan, readConstraints, type PlanExplanation } from '@/lib/llm'
import { CATEGORY_LABEL, buildBudget } from './budget'
import { buildSchedule, buildTasks } from './schedule'
import { validatePlan, type ValidationResult } from './validate'

/**
 * Brief to plan. The order matters: the engines compute the whole plan, the
 * validator checks it, and only then is the model asked to describe it. If the
 * model never answers, everything above it has already happened.
 */

export type BuiltPlan = {
  plan: Plan
  validation: ValidationResult
  explanation: PlanExplanation
  /** Whether the prose came from the model or the deterministic writer. */
  explanationSource: 'model' | 'fallback'
  considerations: { label: string; detail: string; affects: string | null }[]
}

export function draftToEvent(draft: EventDraft, id = `evt_${randomUUID()}`): EventRecord {
  const now = new Date().toISOString()
  return EventRecord.parse({
    ...draft,
    id,
    geo: null, // Filled by geocoding in M3.
    time: draft.time ?? '19:00',
    constraints: draft.constraints ?? '',
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * Risks we can state without any network call. The weather risk is created as
 * `unknown` rather than guessed — the forecast lookup in M3 resolves it.
 */
function baselineRisks(event: EventRecord): Risk[] {
  const risks: Risk[] = []

  if (event.indoorOutdoor === 'outdoor') {
    risks.push(
      Risk.parse({
        id: `rk_${event.id}_weather`,
        eventId: event.id,
        kind: 'weather',
        title: 'Weather on the event date is unconfirmed',
        severity: 'high',
        status: 'unknown',
        mitigation: 'Check the forecast and cost a wet-weather backup.',
        evidence: { status: 'unknown' },
      }),
    )
  }

  risks.push(
    Risk.parse({
      id: `rk_${event.id}_capacity`,
      eventId: event.id,
      kind: 'capacity',
      title: 'No venue confirmed for the guest count',
      severity: 'medium',
      status: 'open',
      mitigation: `Shortlist a venue that seats at least ${event.guestCount}.`,
      evidence: { status: 'unknown' },
    }),
  )

  return risks
}

export async function buildPlanFromDraft(draft: EventDraft): Promise<BuiltPlan> {
  const event = draftToEvent(draft)

  // Everything numeric is decided here, before the model is involved at all.
  const budget = buildBudget(event)
  const tasks = buildTasks(event)
  const schedule = buildSchedule(event)
  const risks = baselineRisks(event)

  const [explained, constraintReading] = await Promise.all([
    explainPlan({
      eventType: event.type,
      city: event.city,
      guestCount: event.guestCount,
      budgetLabel: inr(event.budgetINR),
      styleLabel: event.style.join(', '),
      indoorOutdoor: event.indoorOutdoor,
      constraints: event.constraints,
      lines: budget.map((b) => ({
        category: b.category,
        label: CATEGORY_LABEL[b.category],
        plannedLabel: inr(b.plannedINR),
        perHeadLabel: b.perHead ? inr(b.perHead) : null,
      })),
    }),
    readConstraints(event.constraints),
  ])

  const plan = Plan.parse({
    event,
    budget,
    vendors: [],
    tasks,
    risks,
    schedule,
    narrative: {
      ...explained.explanation,
      source: explained.source,
      considerations: constraintReading.considerations,
    },
    usingSampleData: false,
  })

  // Validation runs on the finished plan, after everything has been assembled.
  const validation = validatePlan(plan)

  return {
    plan,
    validation,
    explanation: explained.explanation,
    explanationSource: explained.source,
    considerations: constraintReading.considerations,
  }
}
