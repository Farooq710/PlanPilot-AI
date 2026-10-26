import type { Plan } from '@/lib/schemas'
import { inr } from '@/lib/money'
import { todayYmd } from '@/lib/time'
import { budgetTotals } from './budget'
import { scheduleIssues } from './schedule'

/**
 * The last gate before a plan reaches the screen. It re-derives the things an
 * agent could have got wrong — totals, evidence, schedule consistency,
 * unresolved risks — rather than trusting that they were done correctly
 * upstream.
 */

export type IssueSeverity = 'blocker' | 'warning' | 'info'

export type PlanIssue = {
  severity: IssueSeverity
  area: 'budget' | 'evidence' | 'schedule' | 'risk' | 'tasks' | 'capacity'
  message: string
  /** What the user can do about it, when there is a clear next action. */
  fix?: string
}

export type ValidationResult = {
  ok: boolean
  issues: PlanIssue[]
}

export function validatePlan(plan: Plan): ValidationResult {
  const issues: PlanIssue[] = []
  const { event, budget, vendors, tasks, risks, schedule } = plan

  /* ------------------------------------------------------------- budget */

  const totals = budgetTotals(budget, event.budgetINR)

  if (totals.planned > event.budgetINR) {
    issues.push({
      severity: 'blocker',
      area: 'budget',
      message: `Planned spend of ${inr(totals.planned)} exceeds the ${inr(event.budgetINR)} budget`,
      fix: 'Rebalance the split or raise the budget',
    })
  }

  if (totals.overBy > 0) {
    issues.push({
      severity: 'warning',
      area: 'budget',
      message: `Actual spend is ${inr(totals.overBy)} over budget`,
      fix: 'Review trade-offs or draw on contingency',
    })
  }

  for (const item of budget) {
    if (item.actualINR !== null && item.actualINR > item.plannedINR) {
      issues.push({
        severity: 'warning',
        area: 'budget',
        message: `${item.label} is ${inr(item.actualINR - item.plannedINR)} over its allocation`,
        fix: `Reduce ${item.label.toLowerCase()} or move budget from another category`,
      })
    }
  }

  /* ----------------------------------------------------------- evidence */

  for (const vendor of vendors) {
    const { evidence } = vendor

    // The rule that makes the product trustworthy: no claim without a source.
    if (evidence.status === 'published' && !evidence.sourceUrl) {
      issues.push({
        severity: 'blocker',
        area: 'evidence',
        message: `${vendor.name} is marked published but has no source URL`,
        fix: 'Downgrade it to an estimate, or attach the source',
      })
    }

    if (vendor.priceINR !== null && evidence.status === 'unknown') {
      issues.push({
        severity: 'blocker',
        area: 'evidence',
        message: `${vendor.name} shows a price with unknown evidence`,
        fix: 'Label the price as an estimate or a user quote',
      })
    }

    if (evidence.sourceUrl && !evidence.fetchedAt) {
      issues.push({
        severity: 'warning',
        area: 'evidence',
        message: `${vendor.name} has a source but no fetch time`,
      })
    }
  }

  const unsourced = vendors.filter((v) => v.evidence.status === 'unknown').length
  if (unsourced > 0) {
    issues.push({
      severity: 'info',
      area: 'evidence',
      message: `${unsourced} ${unsourced === 1 ? 'option is' : 'options are'} missing price or capacity data`,
      fix: 'Add what you know, or call the vendor and record it as a quote',
    })
  }

  /* ----------------------------------------------------------- schedule */

  for (const overlap of scheduleIssues(schedule)) {
    issues.push({
      severity: 'warning',
      area: 'schedule',
      message: overlap,
      fix: 'Shorten the earlier slot or push the later one back',
    })
  }

  /* -------------------------------------------------------------- tasks */

  const taskIds = new Set(tasks.map((t) => t.id))
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (!taskIds.has(dep)) {
        issues.push({
          severity: 'warning',
          area: 'tasks',
          message: `"${task.title}" depends on a task that no longer exists`,
        })
      }
    }
  }

  // Overdue means past today. Every prep task is due before the event.
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate < todayYmd()).length
  if (overdue > 0) {
    issues.push({
      severity: 'info',
      area: 'tasks',
      message: `${overdue} ${overdue === 1 ? 'task is' : 'tasks are'} overdue`,
      fix: 'Work the task board',
    })
  }

  /* ----------------------------------------------------------- capacity */

  const chosenVenue = vendors.find((v) => v.category === 'venue' && (v.confirmed || v.shortlisted))
  if (chosenVenue?.capacity != null && chosenVenue.capacity < event.guestCount) {
    issues.push({
      severity: 'blocker',
      area: 'capacity',
      message: `${chosenVenue.name} seats ${chosenVenue.capacity}, below the ${event.guestCount} guests expected`,
      fix: 'Choose a larger venue or reduce the guest list',
    })
  }

  /* --------------------------------------------------------------- risk */

  for (const risk of risks.filter((r) => r.status === 'open' && r.severity === 'high')) {
    issues.push({
      severity: 'warning',
      area: 'risk',
      message: risk.title,
      fix: risk.mitigation ?? 'Decide on a mitigation',
    })
  }

  const unknownRisks = risks.filter((r) => r.status === 'unknown').length
  if (unknownRisks > 0) {
    issues.push({
      severity: 'info',
      area: 'risk',
      // An unknown is reported as unknown, never quietly treated as resolved.
      message: `${unknownRisks} ${unknownRisks === 1 ? 'risk' : 'risks'} could not be assessed`,
    })
  }

  return { ok: !issues.some((i) => i.severity === 'blocker'), issues }
}
