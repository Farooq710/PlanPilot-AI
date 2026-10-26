import { z } from 'zod'
import { BudgetCategory } from '@/lib/schemas'

/**
 * The model's entire remit: prose. It explains figures that the engines have
 * already decided and reads free-text constraints into structured notes. It
 * never returns a number that the app treats as authoritative.
 */

export const PlanExplanation = z.object({
  /** Two or three sentences on the shape of the plan. */
  summary: z.string().min(20).max(700),
  categoryNotes: z
    .array(
      z.object({
        category: BudgetCategory,
        note: z.string().min(5).max(240),
      }),
    )
    .max(6),
  /** The single thing most likely to go wrong. */
  watchOut: z.string().min(5).max(300),
})
export type PlanExplanation = z.infer<typeof PlanExplanation>

export const ConstraintReading = z.object({
  considerations: z
    .array(
      z.object({
        label: z.string().min(2).max(80),
        detail: z.string().min(5).max(240),
        affects: BudgetCategory.nullable(),
      }),
    )
    .max(8),
})
export type ConstraintReading = z.infer<typeof ConstraintReading>

/** Facts handed to the model. Everything here was computed by the engines. */
export type ExplainInput = {
  eventType: string
  city: string
  guestCount: number
  budgetLabel: string
  styleLabel: string
  indoorOutdoor: string
  constraints: string
  lines: { category: string; label: string; plannedLabel: string; perHeadLabel: string | null }[]
}

export interface LlmProvider {
  readonly name: string
  /** False when no key is configured, so callers can label the output. */
  readonly available: boolean

  explainPlan(input: ExplainInput): Promise<PlanExplanation>
  readConstraints(constraints: string): Promise<ConstraintReading>
}

/**
 * Parses a model response, retrying once before giving up. The retry gets the
 * validation error appended, which is usually enough for a model to correct
 * its own shape. A second failure throws and the caller falls back.
 */
export async function parseWithRetry<T extends z.ZodTypeAny>(
  schema: T,
  call: (correction?: string) => Promise<string>,
): Promise<z.infer<T>> {
  const attempt = async (correction?: string) => {
    const raw = await call(correction)
    return schema.parse(JSON.parse(stripFences(raw)))
  }

  try {
    return await attempt()
  } catch (first) {
    const why = first instanceof Error ? first.message : String(first)
    // One retry, then the caller falls back to deterministic prose.
    return attempt(
      `Your previous response could not be parsed: ${why.slice(0, 400)}. ` +
        `Return only valid JSON matching the requested shape, with no commentary.`,
    )
  }
}

/** Models often wrap JSON in a markdown fence despite being told not to. */
function stripFences(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return fenced ? fenced[1] : trimmed
}
