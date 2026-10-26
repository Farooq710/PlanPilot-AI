import { FallbackProvider } from './fallback'
import { GeminiProvider } from './gemini'
import { OpenAiProvider } from './openai'
import {
  type ConstraintReading,
  type ExplainInput,
  type LlmProvider,
  type PlanExplanation,
} from './provider'

export type { LlmProvider, ExplainInput, PlanExplanation, ConstraintReading }
export { PlanExplanation as PlanExplanationSchema } from './provider'

const fallback = new FallbackProvider()

/**
 * Provider preference: OpenAI, then Gemini, then the deterministic writer.
 * Set LLM_PROVIDER to pin one explicitly.
 */
export function getLlm(): LlmProvider {
  const pinned = process.env.LLM_PROVIDER?.toLowerCase()
  const openAiKey = process.env.OPENAI_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (pinned === 'fallback') return fallback
  if (pinned === 'openai') return openAiKey ? new OpenAiProvider(openAiKey) : fallback
  if (pinned === 'gemini') return geminiKey ? new GeminiProvider(geminiKey) : fallback

  if (openAiKey) return new OpenAiProvider(openAiKey)
  if (geminiKey) return new GeminiProvider(geminiKey)
  return fallback
}

export type ExplainOutcome = {
  explanation: PlanExplanation
  /** Which provider's words these are, so the UI can be honest about it. */
  source: 'model' | 'fallback'
  /** Present when the model was tried and failed. */
  error?: string
}

/**
 * Asks the model, and falls back rather than failing. A model that is down,
 * rate limited or returning malformed JSON twice costs the user nothing beyond
 * plainer prose — the plan itself was computed before we ever got here.
 */
export async function explainPlan(input: ExplainInput): Promise<ExplainOutcome> {
  const llm = getLlm()
  if (!llm.available) {
    return { explanation: await fallback.explainPlan(input), source: 'fallback' }
  }

  try {
    return { explanation: await llm.explainPlan(input), source: 'model' }
  } catch (error) {
    return {
      explanation: await fallback.explainPlan(input),
      source: 'fallback',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function readConstraints(constraints: string): Promise<ConstraintReading> {
  const llm = getLlm()
  if (!llm.available) return fallback.readConstraints(constraints)

  try {
    return await llm.readConstraints(constraints)
  } catch {
    return fallback.readConstraints(constraints)
  }
}
