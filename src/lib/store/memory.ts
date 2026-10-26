import type {
  BudgetItem,
  EventRecord,
  Plan,
  Risk,
  PlanNarrative,
  ScenarioResult,
  ScheduleEntry,
  Task,
  Vendor,
} from '@/lib/schemas'
import type { Store } from './types'

type Tables = {
  events: Map<string, EventRecord>
  budget: Map<string, BudgetItem[]>
  vendors: Map<string, Vendor[]>
  tasks: Map<string, Task[]>
  risks: Map<string, Risk[]>
  schedule: Map<string, ScheduleEntry[]>
  scenarios: Map<string, ScenarioResult[]>
  narratives: Map<string, PlanNarrative | null>
}

const empty = (): Tables => ({
  events: new Map(),
  budget: new Map(),
  vendors: new Map(),
  tasks: new Map(),
  risks: new Map(),
  schedule: new Map(),
  scenarios: new Map(),
  narratives: new Map(),
})

/**
 * In-memory driver. Used on serverless hosts, where the filesystem is
 * read-only and each instance is short-lived — state survives for the life of
 * the process and no longer, which is enough for a single demo session.
 *
 * Held on globalThis so Next's dev-mode module reloading does not wipe it on
 * every edit.
 */
const globalForStore = globalThis as unknown as { __planpilot?: Tables }
const db: Tables = (globalForStore.__planpilot ??= empty())

/** Defensive copy so callers cannot mutate what is held in the map. */
const clone = <T>(v: T): T => structuredClone(v)

export class MemoryStore implements Store {
  readonly driver = 'memory' as const
  readonly location = null

  async listEvents(): Promise<EventRecord[]> {
    return [...db.events.values()]
      .map(clone)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async getEvent(id: string): Promise<EventRecord | null> {
    const e = db.events.get(id)
    return e ? clone(e) : null
  }

  async putEvent(event: EventRecord): Promise<void> {
    db.events.set(event.id, clone(event))
  }

  async deleteEvent(id: string): Promise<void> {
    db.events.delete(id)
    db.budget.delete(id)
    db.vendors.delete(id)
    db.tasks.delete(id)
    db.risks.delete(id)
    db.schedule.delete(id)
    db.scenarios.delete(id)
    db.narratives.delete(id)
  }

  async putBudget(eventId: string, items: BudgetItem[]): Promise<void> {
    db.budget.set(eventId, clone(items))
  }

  async putVendors(eventId: string, vendors: Vendor[]): Promise<void> {
    db.vendors.set(eventId, clone(vendors))
  }

  async putTasks(eventId: string, tasks: Task[]): Promise<void> {
    db.tasks.set(eventId, clone(tasks))
  }

  async putRisks(eventId: string, risks: Risk[]): Promise<void> {
    db.risks.set(eventId, clone(risks))
  }

  async putSchedule(eventId: string, entries: ScheduleEntry[]): Promise<void> {
    db.schedule.set(eventId, clone(entries))
  }

  async getPlan(eventId: string): Promise<Plan | null> {
    const event = db.events.get(eventId)
    if (!event) return null
    return clone({
      event,
      budget: db.budget.get(eventId) ?? [],
      vendors: db.vendors.get(eventId) ?? [],
      tasks: db.tasks.get(eventId) ?? [],
      risks: db.risks.get(eventId) ?? [],
      schedule: db.schedule.get(eventId) ?? [],
      narrative: db.narratives.get(eventId) ?? null,
      usingSampleData: false,
    })
  }

  async putPlan(plan: Plan): Promise<void> {
    const id = plan.event.id
    await this.putEvent(plan.event)
    await this.putBudget(id, plan.budget)
    await this.putVendors(id, plan.vendors)
    await this.putTasks(id, plan.tasks)
    await this.putRisks(id, plan.risks)
    await this.putSchedule(id, plan.schedule)
    db.narratives.set(id, plan.narrative ? clone(plan.narrative) : null)
  }

  async putScenario(scenario: ScenarioResult): Promise<void> {
    const list = db.scenarios.get(scenario.eventId) ?? []
    db.scenarios.set(scenario.eventId, [clone(scenario), ...list])
  }

  async listScenarios(eventId: string): Promise<ScenarioResult[]> {
    return (db.scenarios.get(eventId) ?? []).map(clone)
  }

  async reset(): Promise<void> {
    for (const table of Object.values(db)) table.clear()
  }
}
