import { GoogleGenAI } from '@google/genai'
import {
  ConstraintReading,
  PlanExplanation,
  parseWithRetry,
  type ExplainInput,
  type LlmProvider,
} from './provider'

/**
 * Gemini behind the LlmProvider interface. Structured JSON out, Zod in front of
 * it, one retry on a malformed response. Swapping in another model means
 * writing one more class, not touching the engines.
 */

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

const RULES = `You write explanations for an event planning tool used in India.

Hard rules:
- Never invent or alter a number. Every figure you need is given to you.
- Never state a price as verified. The tool labels evidence separately.
- Write plainly, in British English. No marketing language, no exclamation marks.
- Return only JSON. No markdown fence, no commentary before or after.`

export class GeminiProvider implements LlmProvider {
  readonly name = `gemini:${MODEL}`
  readonly available = true

  private client: GoogleGenAI

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey })
  }

  private async generate(prompt: string, correction?: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: correction ? `${prompt}\n\n${correction}` : prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.4,
        // Free-tier content is used to improve Google products, so the prompts
        // carry event logistics only — never a name, address or contact.
        systemInstruction: RULES,
      },
    })
    return response.text ?? ''
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

Return JSON with exactly these keys:
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
stated. Return JSON:
{
  "considerations": [{ "label": "short name", "detail": "one sentence on what to do about it", "affects": "venue|food|decor|cake|activities|contingency or null" }]
}

Return an empty array if nothing actionable is stated.`

    return parseWithRetry(ConstraintReading, (correction) => this.generate(prompt, correction))
  }
}
