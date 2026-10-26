import type { Plan, Readiness, ReadinessDeduction } from '@/lib/schemas'
import { inr } from '@/lib/money'
import { budgetTotals } from './budget'

/**
 * Readiness, 0-100. Computed in code from the plan, never written by a model.
 *
 * Every lost point is attributable: each band reports what it took off, why,
 * and the one action that recovers it. A score with no explanation is just a
 * number, and a number the user cannot act on is worse than none.
 */

export type ReadinessBand = {
  key: 'bookings' | 'tasks' | 'budget' | 'weather' | 'backup'
  label: string
  /** Points available in this band. */
  weight: number
  earned: number
}

export const WEIGHTS = {
  bookings: 30,
  tasks: 25,
  budget: 20,
  weather: 15,
  backup: 10,
} as const

export type ReadinessReport = Readiness & {
  bands: ReadinessBand[]
  /** Highest-value fix first, so "Fix next" means something. */
  nextAction: string | null
}

/** Categories that need a confirmed supplier before the event can run. */
const ESSENTIAL_CATEGORIES = ['venue', 'food'] as const

export function scoreReadiness(plan: Plan): ReadinessReport {
  const { event, budget, vendors, tasks, risks } = plan
  const deductions: ReadinessDeduction[] = []
  const bands: ReadinessBand[] = []

  /* ------------------------------------------------- confirmed bookings */

  const confirmedEssentials = ESSENTIAL_CATEGORIES.filter((category) =>
    vendors.some((v) => v.category === category && v.confirmed),
  )
  const bookingShare = confirmedEssentials.length / ESSENTIAL_CATEGORIES.length
  const bookingPoints = Math.round(WEIGHTS.bookings * bookingShare)
  bands.push({
    key: 'bookings',
    label: 'Confirmed bookings',
    weight: WEIGHTS.bookings,
    earned: bookingPoints,
  })

  if (bookingPoints < WEIGHTS.bookings) {
    const missing = ESSENTIAL_CATEGORIES.filter((c) => !confirmedEssentials.includes(c))
    deductions.push({
      points: WEIGHTS.bookings - bookingPoints,
      reason: `${missing.join(' and ')} not confirmed`,
      fixNext: `Confirm a ${missing[0]} from the shortlist`,
    })
  }

  /* ------------------------------------------------------------- tasks */

  const done = tasks.filter((t) => t.status === 'done').length
  const taskShare = tasks.length ? done / tasks.length : 0
  const taskPoints = Math.round(WEIGHTS.tasks * taskShare)
  bands.push({ key: 'tasks', label: 'Tasks done', weight: WEIGHTS.tasks, earned: taskPoints })

  if (taskPoints < WEIGHTS.tasks && tasks.length) {
    const open = tasks.filter((t) => t.status !== 'done')
    // Name the task that unblocks the most others.
    const blocking = [...open].sort(
      (a, b) => dependents(tasks, b.id) - dependents(tasks, a.id),
    )[0]
    deductions.push({
      points: WEIGHTS.tasks - taskPoints,
      reason: `${open.length} of ${tasks.length} tasks still open`,
      fixNext: blocking ? `Start "${blocking.title}"` : 'Work the task board',
    })
  }

  /* ------------------------------------------------------------ budget */

  const totals = budgetTotals(budget, event.budgetINR)
  const headroomShare =
    event.budgetINR > 0 ? Math.max(0, totals.remaining) / event.budgetINR : 0
  // Full marks at 10% headroom or better; nothing once the budget is gone.
  const budgetPoints = Math.round(WEIGHTS.budget * Math.min(1, headroomShare / 0.1))
  bands.push({ key: 'budget', label: 'Budget headroom', weight: WEIGHTS.budget, earned: budgetPoints })

  if (budgetPoints < WEIGHTS.budget) {
    deductions.push({
      points: WEIGHTS.budget - budgetPoints,
      reason:
        totals.remaining < 0
          ? `${inr(Math.abs(totals.remaining))} over budget`
          : `Only ${inr(totals.remaining)} left of ${inr(event.budgetINR)}`,
      fixNext: 'Review the trade-offs and cut a line',
    })
  }

  /* ----------------------------------------------------------- weather */

  const weatherRisks = risks.filter((r) => r.kind === 'weather')
  const weatherResolved = weatherRisks.length > 0 && weatherRisks.every((r) => r.status === 'mitigated')
  const weatherUnknown = weatherRisks.some((r) => r.status === 'unknown')
  const weatherPoints = weatherResolved ? WEIGHTS.weather : 0
  bands.push({ key: 'weather', label: 'Weather risk resolved', weight: WEIGHTS.weather, earned: weatherPoints })

  if (weatherPoints < WEIGHTS.weather) {
    deductions.push({
      points: WEIGHTS.weather - weatherPoints,
      reason: weatherRisks.length === 0
        ? 'Weather has not been checked'
        : weatherUnknown
          ? 'Weather risk unresolved — no forecast available yet'
          : 'Rain is forecast and not yet mitigated',
      fixNext: weatherUnknown
        ? 'Run research closer to the date to fetch the forecast'
        : 'Cost a canopy, or move the event indoors',
    })
  }

  /* ------------------------------------------------------------ backup */

  const needsBackup = event.indoorOutdoor !== 'indoor'
  const backupTask = tasks.find((t) => /backup|canopy|wet.weather|tent/i.test(t.title))
  const hasBackup = !needsBackup || backupTask?.status === 'done'
  const backupPoints = hasBackup ? WEIGHTS.backup : 0
  bands.push({ key: 'backup', label: 'Backup plan', weight: WEIGHTS.backup, earned: backupPoints })

  if (backupPoints < WEIGHTS.backup) {
    deductions.push({
      points: WEIGHTS.backup,
      reason: 'No wet-weather backup in place',
      fixNext: backupTask
        ? `Complete "${backupTask.title}"`
        : 'Add a backup plan and cost it',
    })
  }

  /* ------------------------------------------------------------- total */

  const score = bands.reduce((sum, b) => sum + b.earned, 0)
  // Biggest recoverable gain first.
  const ordered = [...deductions].sort((a, b) => b.points - a.points)

  return {
    score: Math.max(0, Math.min(100, score)),
    deductions: ordered,
    bands,
    nextAction: ordered[0]?.fixNext ?? null,
  }
}

/** How many tasks depend on this one, directly. */
function dependents(tasks: Plan['tasks'], id: string): number {
  return tasks.filter((t) => t.dependsOn.includes(id)).length
}

/** Green from 75, amber from 50, red below. */
export function readinessTone(score: number): 'ok' | 'warn' | 'danger' {
  if (score >= 75) return 'ok'
  if (score >= 50) return 'warn'
  return 'danger'
}
