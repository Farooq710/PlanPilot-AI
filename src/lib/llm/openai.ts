import {
  ConstraintReading,
  PlanExplanation,
  parseWithRetry,
  type ExplainInput,
  type LlmProvider,
} from './provider'

/**
 * OpenAI behind the same LlmProvider interface as Gemini. Plain fetch rather
 * than the SDK: one less dependency, and it keeps the timeout and error
 * handling consistent with the rest of the source layer.
 *
 * JSON mode guarantees syntactically valid JSON, not the right shape — Zod
 * still gates every response, with one retry before the fallback takes over.
 */

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const TIMEOUT_MS = 20_000

const RULES = `You write explanations for an event planning tool used in India.

Hard rules:
- Never invent or alter a number. Every figure you need is given to you.
- Never state a price as verified. The tool labels evidence separately.
- Write plainly, in British English. No marketing language, no exclamation marks.
- Return only a JSON object matching the requested keys.`

export class OpenAiProvider implements LlmProvider {
  readonly name = `openai:${MODEL}`
  readonly available = true

  constructor(private apiKey: string) {}

  private async generate(prompt: string, correction?: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: RULES },
            { role: 'user', content: correction ? `${prompt}\n\n${correction}` : prompt },
          ],
        }),
      })

      if (!response.ok) {
        // Surfaced to the caller, which falls back rather than failing.
        const body = await response.text()
        throw new Error(`OpenAI HTTP ${response.status}: ${body.slice(0, 200)}`)
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      return data.choices?.[0]?.message?.content ?? ''
    } finally {
      clearTimeout(timeout)
    }
  }

  async explainPlan(input: ExplainInput): Promise<PlanExplanation> {
    const lines = input.lines
      .map(
        (l) =>
          `- ${l.category}: ${l.label}, allocated ${l.plannedLabel}` +
          (l.perHeadLabel ? ` (${l.perHeadLabel} per head)` : ''),
      )
      .join('\n')

    const prompt = `Explain this event budget allocation.

Event: ${input.eventType}, ${input.styleLabel} style, ${input.indoorOutdoor}
City: ${input.city}
Guests: ${input.guestCount}
Total budget: ${input.budgetLabel}
Constraints given by the organiser: ${input.constraints || 'none stated'}

Allocation:
${lines}

Return a JSON object with exactly these keys:
{
  "summary": "two or three sentences on the shape of this plan",
  "categoryNotes": [{ "category": "venue|food|decor|cake|activities|contingency", "note": "one sentence on why this allocation makes sense and what would change it" }],
  "watchOut": "one sentence on the single thing most likely to go wrong"
}

Include one categoryNotes entry per allocation line above, in the same order.`

    return parseWithRetry(PlanExplanation, (correction) => this.generate(prompt, correction))
  }

  async readConstraints(constraints: string): Promise<ConstraintReading> {
    if (!constraints.trim()) return ConstraintReading.parse({ considerations: [] })

    const prompt = `An event organiser wrote these constraints:

"${constraints}"

Identify what a planner must act on. Do not infer requirements that are not
stated. Return a JSON object:
{
  "considerations": [{ "label": "short name", "detail": "one sentence on what to do about it", "affects": "venue|food|decor|cake|activities|contingency or null" }]
}

Return an empty array if nothing actionable is stated.`

    return parseWithRetry(ConstraintReading, (correction) => this.generate(prompt, correction))
  }
}
