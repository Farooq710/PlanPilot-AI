import type {
  BudgetItem,
  EventRecord,
  Plan,
  Risk,
  ScenarioResult,
  ScheduleEntry,
  Task,
  Vendor,
} from '@/lib/schemas'

/** Which driver is backing the store, surfaced so the UI can warn about it. */
export type StoreDriver = 'sqlite' | 'memory'

/**
 * The persistence surface. Two drivers implement it: `node:sqlite` for local
 * development, and an in-memory map for serverless hosts with a read-only
 * filesystem. Everything is async so the two stay interchangeable.
 */
export interface Store {
  readonly driver: StoreDriver

  /** Where the data lives — a file path for sqlite, null for memory. */
  readonly location: string | null

  listEvents(): Promise<EventRecord[]>
  getEvent(id: string): Promise<EventRecord | null>
  putEvent(event: EventRecord): Promise<void>
  deleteEvent(id: string): Promise<void>

  /** Whole-collection replacement — the reducer always rewrites a full set. */
  putBudget(eventId: string, items: BudgetItem[]): Promise<void>
  putVendors(eventId: string, vendors: Vendor[]): Promise<void>
  putTasks(eventId: string, tasks: Task[]): Promise<void>
  putRisks(eventId: string, risks: Risk[]): Promise<void>
  putSchedule(eventId: string, entries: ScheduleEntry[]): Promise<void>

  /** Assembles the aggregate. Returns null when the event does not exist. */
  getPlan(eventId: string): Promise<Plan | null>
  putPlan(plan: Plan): Promise<void>

  putScenario(scenario: ScenarioResult): Promise<void>
  listScenarios(eventId: string): Promise<ScenarioResult[]>

  /** Drops everything. Used by tests and the demo reset. */
  reset(): Promise<void>
}
