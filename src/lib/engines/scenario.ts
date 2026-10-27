import { randomUUID } from 'node:crypto'
import {
  EventRecord,
  Plan,
  Risk,
  ScenarioResult,
  Task,
  type ScenarioChange,
  type ScenarioDelta,
} from '@/lib/schemas'
import { inr } from '@/lib/money'
import { CATEGORY_LABEL, SCALES_WITH_GUESTS, buildBudget, budgetTotals } from './budget'
import { buildSchedule } from './schedule'
import { scoreReadiness } from './readiness'

/**
 * The what-if engine. Changing one input must move everything that genuinely
 * depends on it and nothing else — a plan where an unrelated line drifts is
 * worse than no simulation at all, because the user stops trusting the diff.
 *
 * Every figure here is computed. The model is not involved.
 */

/** What each lever is allowed to touch. Drives the cascade shown in the UI. */
export const DEPENDENCIES: Record<string, string[]> = {
  guestCount: ['Catering', 'Cake size', 'Seating', 'Invitations', 'Venue capacity'],
  indoorOutdoor: ['Venue type', 'Wet-weather backup', 'Decor', 'Weather risk'],
  budgetINR: ['Every allocation', 'Contingency'],
  city: ['Venue shortlist', 'Weather forecast', 'Travel'],
}

export type ScenarioOutcome = {
  result: ScenarioResult
  /** The plan as it would be if accepted. Not persisted until the user says so. */
  nextPlan: Plan
}

export function applyScenario(plan: Plan, delta: ScenarioDelta): ScenarioOutcome {
  const changes: ScenarioChange[] = []
  const warnings: string[] = []
  const cascade: { from: string; to: string[] }[] = []

  const before = plan.event
  const after = EventRecord.parse({
    ...before,
    guestCount: delta.guestCount ?? before.guestCount,
    budgetINR: delta.budgetINR ?? before.budgetINR,
    city: delta.city ?? before.city,
    indoorOutdoor: delta.indoorOutdoor ?? before.indoorOutdoor,
    // A city change invalidates the coordinates, and therefore the forecast.
    geo: delta.city && delta.city !== before.city ? null : before.geo,
    updatedAt: new Date().toISOString(),
  })

  let nextBudget = plan.budget
  let nextTasks = plan.tasks
  let nextRisks = plan.risks
  let nextSchedule = plan.schedule

  /* ------------------------------------------------------- guest count */

  if (delta.guestCount !== undefined && delta.guestCount !== before.guestCount) {
    cascade.push({
      from: `Guests ${before.guestCount} to ${after.guestCount}`,
      to: DEPENDENCIES.guestCount,
    })

    changes.push({
      itemId: 'event.guestCount',
      label: 'Guest count',
      field: 'guests',
      before: before.guestCount,
      after: after.guestCount,
    })

    // Only the per-head lines move. Venue, decor and activities do not scale
    // with headcount, so they must stay exactly where they were.
    nextBudget = nextBudget.map((item) => {
      if (!item.perHead || !SCALES_WITH_GUESTS.includes(item.category)) return item
      const updated = { ...item, plannedINR: Math.round(item.perHead * after.guestCount) }
      changes.push({
        itemId: item.id,
        label: CATEGORY_LABEL[item.category],
        field: 'planned',
        before: item.plannedINR,
        after: updated.plannedINR,
        deltaINR: updated.plannedINR - item.plannedINR,
      })
      return updated
    })

    // Tasks that are about headcount need redoing; the rest are untouched.
    const headcountTasks = /guest list|invitation|menu|headcount|seating|cake/i
    nextTasks = nextTasks.map((task) => {
      if (!headcountTasks.test(task.title) || task.status === 'todo') return task
      changes.push({
        itemId: task.id,
        label: task.title,
        field: 'status',
        before: task.status,
        after: 'todo',
      })
      return Task.parse({ ...task, status: 'todo' })
    })

    // Capacity is a hard constraint, not a cost.
    const venue = plan.vendors.find(
      (v) => v.category === 'venue' && (v.confirmed || v.shortlisted),
    )
    if (venue?.capacity != null && venue.capacity < after.guestCount) {
      warnings.push(
        `${venue.name} seats ${venue.capacity} — now exceeded by ${after.guestCount - venue.capacity}`,
      )
      nextRisks = upsertRisk(nextRisks, after.id, {
        kind: 'capacity',
        title: `${venue.name} is too small for ${after.guestCount} guests`,
        severity: 'high',
        status: 'open',
        mitigation: `Capacity is ${venue.capacity}. Choose a larger venue or cap the list.`,
      })
    }
  }

  /* ---------------------------------------------------- indoor/outdoor */

  if (delta.indoorOutdoor !== undefined && delta.indoorOutdoor !== before.indoorOutdoor) {
    cascade.push({
      from: `${before.indoorOutdoor} to ${after.indoorOutdoor}`,
      to: DEPENDENCIES.indoorOutdoor,
    })

    changes.push({
      itemId: 'event.indoorOutdoor',
      label: 'Venue setting',
      field: 'setting',
      before: before.indoorOutdoor,
      after: after.indoorOutdoor,
    })

    const goingOutdoors = after.indoorOutdoor !== 'indoor'

    // Going outdoors needs a backup; coming indoors releases its cost.
    const BACKUP_COST = 3_200
    nextBudget = nextBudget.map((item) => {
      if (item.category !== 'contingency') return item
      const updated = {
        ...item,
        plannedINR: Math.max(0, item.plannedINR + (goingOutdoors ? BACKUP_COST : -BACKUP_COST)),
      }
      if (updated.plannedINR === item.plannedINR) return item
      changes.push({
        itemId: item.id,
        label: 'Contingency',
        field: 'planned',
        before: item.plannedINR,
        after: updated.plannedINR,
        deltaINR: updated.plannedINR - item.plannedINR,
      })
      return updated
    })

    const backupTask = nextTasks.find((t) => /backup|canopy|wet.weather/i.test(t.title))
    if (goingOutdoors && !backupTask) {
      const added = Task.parse({
        id: `tk_${after.id}_backup`,
        eventId: after.id,
        title: 'Arrange the wet-weather backup',
        dueDate: shiftDate(after.date, -2),
        status: 'todo',
        dependsOn: [],
        linkedItemId: null,
        category: 'venue',
      })
      nextTasks = [...nextTasks, added]
      changes.push({
        itemId: added.id,
        label: added.title,
        field: 'task',
        before: null,
        after: 'added',
      })
      warnings.push('An outdoor event needs a wet-weather backup. One has been added.')
    }

    if (!goingOutdoors && backupTask) {
      nextTasks = nextTasks.filter((t) => t.id !== backupTask.id)
      changes.push({
        itemId: backupTask.id,
        label: backupTask.title,
        field: 'task',
        before: 'present',
        after: 'removed',
      })
    }

    // Moving indoors resolves the weather risk; moving out reopens it.
    nextRisks = nextRisks.map((risk) => {
      if (risk.kind !== 'weather') return risk
      const status = goingOutdoors ? 'open' : ('mitigated' as const)
      if (risk.status === status) return risk
      changes.push({
        itemId: risk.id,
        label: 'Weather risk',
        field: 'status',
        before: risk.status,
        after: status,
      })
      return Risk.parse({
        ...risk,
        status,
        mitigation: goingOutdoors
          ? 'Outdoors again — cost a canopy and decide before the week of the event.'
          : 'Moved indoors, so rain no longer affects the event.',
      })
    })
  }

  /* ------------------------------------------------------------ budget */

  if (delta.budgetINR !== undefined && delta.budgetINR !== before.budgetINR) {
    cascade.push({
      from: `Budget ${inr(before.budgetINR)} to ${inr(after.budgetINR)}`,
      to: DEPENDENCIES.budgetINR,
    })
    changes.push({
      itemId: 'event.budgetINR',
      label: 'Budget',
      field: 'budget',
      before: before.budgetINR,
      after: after.budgetINR,
      deltaINR: after.budgetINR - before.budgetINR,
    })

    // Re-split from scratch, then carry the recorded actuals back over so a
    // budget change never silently erases what has been spent.
    const rebuilt = buildBudget(after)
    const actuals = new Map(plan.budget.map((b) => [b.category, b.actualINR]))
    nextBudget = rebuilt.map((item) => {
      const prior = plan.budget.find((b) => b.category === item.category)
      const updated = { ...item, actualINR: actuals.get(item.category) ?? null }
      if (prior && prior.plannedINR !== updated.plannedINR) {
        changes.push({
          itemId: updated.id,
          label: CATEGORY_LABEL[updated.category],
          field: 'planned',
          before: prior.plannedINR,
          after: updated.plannedINR,
          deltaINR: updated.plannedINR - prior.plannedINR,
        })
      }
      return updated
    })
  }

  /* -------------------------------------------------------------- city */

  if (delta.city !== undefined && delta.city !== before.city) {
    cascade.push({ from: `${before.city} to ${after.city}`, to: DEPENDENCIES.city })
    changes.push({
      itemId: 'event.city',
      label: 'City',
      field: 'city',
      before: before.city,
      after: after.city,
    })
    warnings.push(
      `Research was done for ${before.city}. Venues and the forecast need running again.`,
    )
    nextRisks = nextRisks.map((risk) =>
      risk.kind === 'weather'
        ? Risk.parse({
            ...risk,
            status: 'unknown',
            mitigation: `The forecast was for ${before.city}. Re-run research for ${after.city}.`,
            evidence: { status: 'unknown' },
          })
        : risk,
    )
  }

  /* ------------------------------------------------------ rain scenario */

  if (delta.assumeRain) {
    cascade.push({ from: 'Rain on the day', to: ['Wet-weather backup', 'Weather risk'] })
    nextRisks = nextRisks.map((risk) =>
      risk.kind === 'weather'
        ? Risk.parse({
            ...risk,
            title: 'Rain assumed on the event date',
            severity: after.indoorOutdoor === 'indoor' ? 'low' : 'high',
            status: 'open',
            mitigation: 'Confirm a canopy or an indoor fallback.',
          })
        : risk,
    )
    if (after.indoorOutdoor !== 'indoor') {
      warnings.push('Rain assumed. An outdoor event needs a confirmed backup.')
    }
  }

  /* ------------------------------------------------- rebuild and score */

  // The run of show follows the event, not the levers.
  if (after.date !== before.date || after.time !== before.time) {
    nextSchedule = buildSchedule(after)
  }

  const nextPlan = Plan.parse({
    ...plan,
    event: after,
    budget: nextBudget,
    tasks: nextTasks,
    risks: nextRisks,
    schedule: nextSchedule,
  })

  const totalsBefore = budgetTotals(plan.budget, before.budgetINR)
  const totalsAfter = budgetTotals(nextBudget, after.budgetINR)

  if (totalsAfter.planned > after.budgetINR) {
    warnings.push(
      `The plan now needs ${inr(totalsAfter.planned)} against a ${inr(after.budgetINR)} budget — ${inr(totalsAfter.planned - after.budgetINR)} over.`,
    )
  }

  const result = ScenarioResult.parse({
    id: `sc_${randomUUID()}`,
    eventId: plan.event.id,
    delta,
    changes,
    warnings,
    totalBeforeINR: totalsBefore.planned,
    totalAfterINR: totalsAfter.planned,
    readinessBefore: scoreReadiness(plan).score,
    readinessAfter: scoreReadiness(nextPlan).score,
    cascade,
    createdAt: new Date().toISOString(),
  })

  return { result, nextPlan }
}

/* ----------------------------------------------------------------- utils */

function upsertRisk(
  risks: Risk[],
  eventId: string,
  partial: Pick<Risk, 'kind' | 'title' | 'severity' | 'status' | 'mitigation'>,
): Risk[] {
  const id = `rk_${eventId}_${partial.kind}_capacity`
  const next = Risk.parse({ ...partial, id, eventId, evidence: { status: 'estimate' } })
  const index = risks.findIndex((r) => r.id === id)
  if (index === -1) return [...risks, next]
  const copy = [...risks]
  copy[index] = next
  return copy
}

function shiftDate(dateYmd: string, days: number): string {
  const d = new Date(`${dateYmd}T00:00:00+05:30`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Ids of everything the scenario touched, for highlighting the diff. */
export function changedIds(result: ScenarioResult): Set<string> {
  return new Set(result.changes.map((c) => c.itemId))
}
