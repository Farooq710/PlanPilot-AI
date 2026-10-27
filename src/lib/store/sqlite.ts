import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  BudgetItem,
  EventRecord,
  PlanNarrative,
  Risk,
  ScenarioResult,
  ScheduleEntry,
  Task,
  Vendor,
  type Plan,
} from '@/lib/schemas'
import type { Store } from './types'

/**
 * Minimal shape of the `node:sqlite` API we rely on. Declared locally so the
 * module type-checks on Node versions whose typings predate it.
 */
type Statement = {
  run(...params: unknown[]): unknown
  get(...params: unknown[]): Record<string, unknown> | undefined
  all(...params: unknown[]): Record<string, unknown>[]
}
type Database = {
  exec(sql: string): void
  prepare(sql: string): Statement
  close(): void
}

/**
 * Each row keeps its id and event id as real columns so we can query and
 * cascade by event, with the validated record itself stored as JSON. Mapping
 * forty-odd columns by hand would buy nothing here: Zod already owns the shape,
 * and every read is re-parsed through it.
 */
const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
  id         TEXT PRIMARY KEY,
  updated_at TEXT NOT NULL,
  json       TEXT NOT NULL,
  narrative  TEXT,
  sample_data INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_items (
  id       TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  json     TEXT NOT NULL,
  PRIMARY KEY (id, event_id)
);

CREATE TABLE IF NOT EXISTS vendors (
  id       TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  json     TEXT NOT NULL,
  PRIMARY KEY (id, event_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id       TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  json     TEXT NOT NULL,
  PRIMARY KEY (id, event_id)
);

CREATE TABLE IF NOT EXISTS risks (
  id       TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  json     TEXT NOT NULL,
  PRIMARY KEY (id, event_id)
);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id       TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  json     TEXT NOT NULL,
  PRIMARY KEY (id, event_id)
);

CREATE TABLE IF NOT EXISTS scenarios (
  id         TEXT PRIMARY KEY,
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  json       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_event   ON budget_items(event_id);
CREATE INDEX IF NOT EXISTS idx_vendors_event  ON vendors(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event    ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_risks_event    ON risks(event_id);
CREATE INDEX IF NOT EXISTS idx_schedule_event ON schedule_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_event ON scenarios(event_id);
`

/** Child collections, each replaced wholesale by the reducer. */
const COLLECTIONS = {
  budget: 'budget_items',
  vendors: 'vendors',
  tasks: 'tasks',
  risks: 'risks',
  schedule: 'schedule_entries',
} as const

export class SqliteStore implements Store {
  readonly driver = 'sqlite' as const
  readonly location: string

  private db: Database

  constructor(db: Database, location: string) {
    this.db = db
    this.location = location
    this.db.exec(SCHEMA)
    this.migrate()
  }

  /**
   * Forward migrations for databases created by an earlier build. SQLite has
   * no "ADD COLUMN IF NOT EXISTS", so the duplicate-column error is the signal
   * that the column is already there.
   */
  private migrate(): void {
    for (const statement of [
      'ALTER TABLE events ADD COLUMN narrative TEXT',
      'ALTER TABLE events ADD COLUMN sample_data INTEGER NOT NULL DEFAULT 0',
    ]) {
      try {
        this.db.exec(statement)
      } catch {
        // Column already present.
      }
    }
  }

  /**
   * Opens the database, or returns null when `node:sqlite` is unavailable or
   * the path cannot be written. Callers fall back to the memory driver.
   */
  static async open(file: string): Promise<SqliteStore | null> {
    try {
      mkdirSync(dirname(file), { recursive: true })
      const { DatabaseSync } = (await import('node:sqlite')) as unknown as {
        DatabaseSync: new (path: string) => Database
      }
      return new SqliteStore(new DatabaseSync(file), file)
    } catch {
      return null
    }
  }

  private replace(table: string, eventId: string, rows: { id: string }[]): void {
    this.db.prepare(`DELETE FROM ${table} WHERE event_id = ?`).run(eventId)
    const insert = this.db.prepare(
      `INSERT INTO ${table} (id, event_id, json) VALUES (?, ?, ?)`,
    )
    for (const row of rows) insert.run(row.id, eventId, JSON.stringify(row))
  }

  private readAll<T>(table: string, eventId: string, parse: (v: unknown) => T): T[] {
    return this.db
      .prepare(`SELECT json FROM ${table} WHERE event_id = ?`)
      .all(eventId)
      .map((r) => parse(JSON.parse(String(r.json))))
  }

  async listEvents(): Promise<EventRecord[]> {
    return this.db
      .prepare('SELECT json FROM events ORDER BY updated_at DESC')
      .all()
      .map((r) => EventRecord.parse(JSON.parse(String(r.json))))
  }

  async getEvent(id: string): Promise<EventRecord | null> {
    const row = this.db.prepare('SELECT json FROM events WHERE id = ?').get(id)
    return row ? EventRecord.parse(JSON.parse(String(row.json))) : null
  }

  async putEvent(event: EventRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO events (id, updated_at, json) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, json = excluded.json`,
      )
      .run(event.id, event.updatedAt, JSON.stringify(event))
  }

  async deleteEvent(id: string): Promise<void> {
    // Child rows go with it via ON DELETE CASCADE.
    this.db.prepare('DELETE FROM events WHERE id = ?').run(id)
  }

  async putBudget(eventId: string, items: BudgetItem[]): Promise<void> {
    this.replace(COLLECTIONS.budget, eventId, items)
  }

  async putVendors(eventId: string, vendors: Vendor[]): Promise<void> {
    this.replace(COLLECTIONS.vendors, eventId, vendors)
  }

  async putTasks(eventId: string, tasks: Task[]): Promise<void> {
    this.replace(COLLECTIONS.tasks, eventId, tasks)
  }

  async putRisks(eventId: string, risks: Risk[]): Promise<void> {
    this.replace(COLLECTIONS.risks, eventId, risks)
  }

  async putSchedule(eventId: string, entries: ScheduleEntry[]): Promise<void> {
    this.replace(COLLECTIONS.schedule, eventId, entries)
  }

  async getPlan(eventId: string): Promise<Plan | null> {
    const event = await this.getEvent(eventId)
    if (!event) return null

    const row = this.db
      .prepare('SELECT narrative, sample_data FROM events WHERE id = ?')
      .get(eventId)
    const narrative = row?.narrative
      ? PlanNarrative.parse(JSON.parse(String(row.narrative)))
      : null

    return {
      event,
      narrative,
      budget: this.readAll(COLLECTIONS.budget, eventId, (v) => BudgetItem.parse(v)),
      vendors: this.readAll(COLLECTIONS.vendors, eventId, (v) => Vendor.parse(v)),
      tasks: this.readAll(COLLECTIONS.tasks, eventId, (v) => Task.parse(v)),
      risks: this.readAll(COLLECTIONS.risks, eventId, (v) => Risk.parse(v)),
      schedule: this.readAll(COLLECTIONS.schedule, eventId, (v) => ScheduleEntry.parse(v)),
      usingSampleData: Boolean(row?.sample_data),
    }
  }

  async putPlan(plan: Plan): Promise<void> {
    const id = plan.event.id
    await this.putEvent(plan.event)
    await this.putBudget(id, plan.budget)
    await this.putVendors(id, plan.vendors)
    await this.putTasks(id, plan.tasks)
    await this.putRisks(id, plan.risks)
    await this.putSchedule(id, plan.schedule)
    this.db
      .prepare('UPDATE events SET narrative = ?, sample_data = ? WHERE id = ?')
      .run(plan.narrative ? JSON.stringify(plan.narrative) : null, plan.usingSampleData ? 1 : 0, id)
  }

  async putScenario(scenario: ScenarioResult): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO scenarios (id, event_id, created_at, json) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET json = excluded.json`,
      )
      .run(scenario.id, scenario.eventId, scenario.createdAt, JSON.stringify(scenario))
  }

  async listScenarios(eventId: string): Promise<ScenarioResult[]> {
    return this.db
      .prepare('SELECT json FROM scenarios WHERE event_id = ? ORDER BY created_at DESC')
      .all(eventId)
      .map((r) => ScenarioResult.parse(JSON.parse(String(r.json))))
  }

  async reset(): Promise<void> {
    this.db.exec('DELETE FROM events')
  }
}
