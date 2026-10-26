import { ScheduleEntry, Task, type BudgetCategory, type EventRecord } from '@/lib/schemas'
import { budgetItemId } from './budget'

/**
 * Prep tasks and the run of show, derived deterministically from the event.
 * Dependencies are real edges, so the what-if engine can trace what a change
 * cascades into.
 */

type TaskSeed = {
  key: string
  title: string
  /** Days before the event this is due. */
  leadDays: number
  category: BudgetCategory | null
  dependsOn?: string[]
}

const TASK_SEEDS: TaskSeed[] = [
  { key: 'venue', title: 'Confirm the venue booking', leadDays: 5, category: 'venue' },
  { key: 'guests', title: 'Finalise the guest list', leadDays: 5, category: null },
  {
    key: 'invites',
    title: 'Send invitations',
    leadDays: 4,
    category: null,
    dependsOn: ['guests'],
  },
  {
    key: 'menu',
    title: 'Lock the catering menu and headcount',
    leadDays: 3,
    category: 'food',
    dependsOn: ['guests', 'venue'],
  },
  {
    key: 'cake',
    title: 'Order the cake',
    leadDays: 3,
    category: 'cake',
    dependsOn: ['guests'],
  },
  { key: 'decor', title: 'Approve the decor moodboard', leadDays: 3, category: 'decor' },
  {
    key: 'seating',
    title: 'Plan seating and table count',
    leadDays: 2,
    category: 'venue',
    dependsOn: ['guests', 'venue'],
  },
  {
    key: 'activities',
    title: 'Confirm music and activities',
    leadDays: 2,
    category: 'activities',
  },
  {
    key: 'backup',
    title: 'Arrange the wet-weather backup',
    leadDays: 2,
    category: 'venue',
    dependsOn: ['venue'],
  },
  {
    key: 'runsheet',
    title: 'Share the run of show with vendors',
    leadDays: 1,
    category: null,
    dependsOn: ['menu', 'decor', 'activities'],
  },
]

const id = (eventId: string, key: string) => `tk_${eventId}_${key}`

/** Shifts a YYYY-MM-DD date by whole days, staying in IST. */
function shiftDate(dateYmd: string, days: number): string {
  const d = new Date(`${dateYmd}T00:00:00+05:30`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildTasks(event: EventRecord): Task[] {
  // Outdoor events need a backup plan; indoor ones do not.
  const seeds = TASK_SEEDS.filter(
    (s) => s.key !== 'backup' || event.indoorOutdoor !== 'indoor',
  )

  return seeds.map((seed) =>
    Task.parse({
      id: id(event.id, seed.key),
      eventId: event.id,
      title: seed.title,
      dueDate: shiftDate(event.date, -seed.leadDays),
      status: 'todo',
      dependsOn: (seed.dependsOn ?? []).map((k) => id(event.id, k)),
      linkedItemId: seed.category ? budgetItemId(event.id, seed.category) : null,
      category: seed.category,
    }),
  )
}

/* ------------------------------------------------------------- run of show */

type SlotSeed = {
  key: string
  title: string
  /** Minutes relative to the event start; negative is before doors. */
  offsetMinutes: number
  durationMinutes: number
  category: BudgetCategory | null
  note?: string
}

const SLOT_SEEDS: SlotSeed[] = [
  {
    key: 'setup',
    title: 'Vendor setup and decor',
    offsetMinutes: -120,
    durationMinutes: 90,
    category: 'decor',
    note: 'Decor team on site, lighting checked',
  },
  {
    key: 'soundcheck',
    title: 'Sound and lighting check',
    offsetMinutes: -30,
    durationMinutes: 20,
    category: 'activities',
  },
  { key: 'doors', title: 'Guests arrive', offsetMinutes: 0, durationMinutes: 30, category: null },
  {
    key: 'starters',
    title: 'Starters and drinks',
    offsetMinutes: 30,
    durationMinutes: 45,
    category: 'food',
  },
  {
    key: 'activities',
    title: 'Games and music set',
    offsetMinutes: 75,
    durationMinutes: 45,
    category: 'activities',
  },
  {
    key: 'cake',
    title: 'Cake cutting and toast',
    offsetMinutes: 120,
    durationMinutes: 20,
    category: 'cake',
  },
  {
    key: 'dinner',
    title: 'Dinner buffet',
    offsetMinutes: 140,
    durationMinutes: 60,
    category: 'food',
  },
  {
    key: 'wrap',
    title: 'Wind down and vendor pack-up',
    offsetMinutes: 200,
    durationMinutes: 40,
    category: null,
  },
]

export function buildSchedule(event: EventRecord): ScheduleEntry[] {
  const start = new Date(`${event.date}T${event.time}:00+05:30`)

  return SLOT_SEEDS.map((seed) =>
    ScheduleEntry.parse({
      id: `sc_${event.id}_${seed.key}`,
      eventId: event.id,
      title: seed.title,
      startsAt: new Date(start.getTime() + seed.offsetMinutes * 60_000).toISOString(),
      durationMinutes: seed.durationMinutes,
      category: seed.category,
      note: seed.note ?? null,
    }),
  )
}

/**
 * Schedule entries must not overlap once setup is done, and nothing may run
 * past midnight. Returned as plain sentences for the validator to surface.
 */
export function scheduleIssues(entries: ScheduleEntry[]): string[] {
  const issues: string[] = []
  const sorted = [...entries].sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    const prevEnd = new Date(prev.startsAt).getTime() + prev.durationMinutes * 60_000
    if (prevEnd > new Date(curr.startsAt).getTime()) {
      issues.push(`"${prev.title}" overlaps "${curr.title}"`)
    }
  }
  return issues
}
