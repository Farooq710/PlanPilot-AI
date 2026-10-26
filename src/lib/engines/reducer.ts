import { budgetItemId } from './budget'
import {
  BudgetItem,
  Risk,
  ScheduleEntry,
  Task,
  Vendor,
  type Plan,
  type Proposal,
} from '@/lib/schemas'

/**
 * Agents propose; this reducer disposes. Every proposal is re-validated
 * against the event it targets before any of it is applied, and a proposal
 * that breaks an invariant is rejected with a reason rather than partially
 * written. Nothing here calls a model.
 */

export type ApplyResult = {
  plan: Plan
  applied: string[]
  rejected: { reason: string; detail?: string }[]
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)

export function applyProposal(plan: Plan, proposal: Proposal): ApplyResult {
  const applied: string[] = []
  const rejected: ApplyResult['rejected'] = []
  const eventId = plan.event.id
  let next: Plan = plan

  switch (proposal.kind) {
    case 'budget': {
      const items: BudgetItem[] = []
      for (const raw of proposal.items) {
        const parsed = BudgetItem.safeParse({
          ...raw,
          id: budgetItemId(eventId, raw.category),
          eventId,
          actualINR: raw.actualINR ?? null,
          perHead: raw.perHead ?? null,
        })
        if (!parsed.success) {
          rejected.push({
            reason: `Budget line "${raw.label}" failed validation`,
            detail: parsed.error.issues[0]?.message,
          })
          continue
        }
        items.push(parsed.data)
      }

      // The headline invariant: a plan may never be proposed over its budget.
      const planned = items.reduce((s, i) => s + i.plannedINR, 0)
      if (planned > plan.event.budgetINR) {
        rejected.push({
          reason: 'Budget proposal exceeds the event budget',
          detail: `Proposed ₹${planned.toLocaleString('en-IN')} against ₹${plan.event.budgetINR.toLocaleString('en-IN')}`,
        })
        break
      }

      if (items.length) {
        next = { ...next, budget: items }
        applied.push(`${items.length} budget lines`)
      }
      break
    }

    case 'research': {
      const existing = new Map(next.vendors.map((v) => [`${v.category}:${slug(v.name)}`, v]))
      let added = 0

      for (const raw of proposal.vendors) {
        const key = `${raw.category}:${slug(raw.name)}`
        const parsed = Vendor.safeParse({ ...raw, id: `vn_${slug(raw.name)}`, eventId })
        if (!parsed.success) {
          rejected.push({
            reason: `Vendor "${raw.name}" failed validation`,
            detail: parsed.error.issues[0]?.message,
          })
          continue
        }
        const vendor = parsed.data

        // A price with no evidence behind it is not a price we will show.
        if (vendor.priceINR !== null && vendor.evidence.status === 'unknown') {
          rejected.push({
            reason: `Vendor "${vendor.name}" carries a price with unknown evidence`,
          })
          continue
        }

        const prior = existing.get(key)
        // Re-researching must not silently drop the user's shortlist choices.
        existing.set(
          key,
          prior
            ? { ...vendor, shortlisted: prior.shortlisted, confirmed: prior.confirmed }
            : vendor,
        )
        added++
      }

      next = { ...next, vendors: [...existing.values()] }
      if (added) applied.push(`${added} research results`)
      break
    }

    case 'schedule': {
      const entries: ScheduleEntry[] = []
      for (const raw of proposal.entries) {
        const parsed = ScheduleEntry.safeParse({
          ...raw,
          id: `sc_${slug(raw.title)}`,
          eventId,
        })
        if (parsed.success) entries.push(parsed.data)
        else rejected.push({ reason: `Schedule entry "${raw.title}" failed validation` })
      }

      const tasks: Task[] = []
      for (const raw of proposal.tasks) {
        const parsed = Task.safeParse({ ...raw, id: `tk_${slug(raw.title)}`, eventId })
        if (parsed.success) tasks.push(parsed.data)
        else rejected.push({ reason: `Task "${raw.title}" failed validation` })
      }

      if (entries.length) {
        next = { ...next, schedule: entries }
        applied.push(`${entries.length} run-of-show slots`)
      }
      if (tasks.length) {
        next = { ...next, tasks }
        applied.push(`${tasks.length} tasks`)
      }
      break
    }

    case 'risk': {
      const byKey = new Map(next.risks.map((r) => [`${r.kind}:${slug(r.title)}`, r]))
      let added = 0

      for (const raw of proposal.risks) {
        const parsed = Risk.safeParse({ ...raw, id: `rk_${slug(raw.title)}`, eventId })
        if (!parsed.success) {
          rejected.push({ reason: `Risk "${raw.title}" failed validation` })
          continue
        }
        const risk = parsed.data
        const key = `${risk.kind}:${slug(risk.title)}`
        const prior = byKey.get(key)
        // A risk the user already mitigated does not reopen on a re-run.
        byKey.set(key, prior?.status === 'mitigated' ? { ...risk, status: 'mitigated' } : risk)
        added++
      }

      next = { ...next, risks: [...byKey.values()] }
      if (added) applied.push(`${added} risks`)
      break
    }
  }

  return { plan: next, applied, rejected }
}

/** Applies a batch in order, accumulating what landed and what did not. */
export function applyAll(plan: Plan, proposals: Proposal[]): ApplyResult {
  return proposals.reduce<ApplyResult>(
    (acc, proposal) => {
      const result = applyProposal(acc.plan, proposal)
      return {
        plan: result.plan,
        applied: [...acc.applied, ...result.applied],
        rejected: [...acc.rejected, ...result.rejected],
      }
    },
    { plan, applied: [], rejected: [] },
  )
}
