import { z } from 'zod'

/**
 * Every schema in PlanPilot lives here. Agents return Zod-validated proposals;
 * the reducer validates and applies them. Nothing reaches the UI unparsed.
 */

/* ---------------------------------------------------------------- evidence */

/**
 * How much we trust a fact. An estimate is never presented as verified, and
 * `unknown` stays unknown rather than being guessed at.
 */
export const EvidenceStatus = z.enum(['published', 'user_quote', 'estimate', 'unknown'])
export type EvidenceStatus = z.infer<typeof EvidenceStatus>

/**
 * A source URL that is safe to render as an href. Zod's .url() accepts
 * javascript: and data:, which would be an injection route straight into the
 * evidence chip, so the protocol is checked explicitly.
 */
export const HttpUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const { protocol } = new URL(value)
        return protocol === 'http:' || protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'Source URLs must be http or https' },
  )

export const Evidence = z.object({
  status: EvidenceStatus,
  /** Absolute http(s) URL of the page the fact came from. */
  sourceUrl: HttpUrl.optional(),
  /** Host shown on the chip, e.g. "olivebistro.in". */
  sourceDomain: z.string().min(1).optional(),
  /** ISO timestamp of retrieval. */
  fetchedAt: z.string().datetime().optional(),
  /** The quoted fact, kept short — a price line or a policy sentence. */
  note: z.string().max(280).optional(),
})
  .superRefine((e, ctx) => {
    // A published fact without a source is indistinguishable from a guess.
    if (e.status === 'published' && !e.sourceUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceUrl'],
        message: 'Evidence marked "published" must carry a sourceUrl',
      })
    }
    if (e.sourceUrl && !e.fetchedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fetchedAt'],
        message: 'A sourced fact must record when it was fetched',
      })
    }
  })
export type Evidence = z.infer<typeof Evidence>

export const unknownEvidence = (): Evidence => ({ status: 'unknown' })

/* ------------------------------------------------------------------- event */

export const EventType = z.enum(['birthday', 'wedding', 'community', 'corporate'])
export type EventType = z.infer<typeof EventType>

export const IndoorOutdoor = z.enum(['indoor', 'outdoor', 'either'])
export type IndoorOutdoor = z.infer<typeof IndoorOutdoor>

export const EventStyle = z.enum(['premium', 'minimal', 'festive', 'rustic', 'kids'])
export type EventStyle = z.infer<typeof EventStyle>

export const Geo = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
})
export type Geo = z.infer<typeof Geo>

/** The shared structured record. Everything else hangs off this. */
export const EventRecord = z.object({
  id: z.string().min(1),
  type: EventType,
  title: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  geo: Geo.nullable().default(null),
  /** Event date as YYYY-MM-DD, local to the city. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  /** Start time as HH:mm, 24h. */
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:mm').default('19:00'),
  guestCount: z.number().int().min(1).max(5000),
  budgetINR: z.number().int().min(0),
  style: z.array(EventStyle).min(1),
  indoorOutdoor: IndoorOutdoor,
  constraints: z.string().max(1000).default(''),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type EventRecord = z.infer<typeof EventRecord>

/** What the intake form collects, before the record is built. */
export const EventDraft = EventRecord.omit({
  id: true,
  geo: true,
  createdAt: true,
  updatedAt: true,
}).partial({ time: true, constraints: true })
export type EventDraft = z.infer<typeof EventDraft>

/* ------------------------------------------------------------------ budget */

export const BudgetCategory = z.enum([
  'venue',
  'food',
  'decor',
  'cake',
  'activities',
  'contingency',
])
export type BudgetCategory = z.infer<typeof BudgetCategory>

export const BudgetItem = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  category: BudgetCategory,
  label: z.string().min(1).max(120),
  plannedINR: z.number().int().min(0),
  actualINR: z.number().int().min(0).nullable().default(null),
  /** Set when the cost scales with headcount — drives what-if recalculation. */
  perHead: z.number().min(0).nullable().default(null),
  evidence: Evidence,
})
export type BudgetItem = z.infer<typeof BudgetItem>

/* ------------------------------------------------------------------ vendor */

export const VendorCategory = z.enum(['venue', 'food', 'decor', 'cake', 'activities', 'rentals'])
export type VendorCategory = z.infer<typeof VendorCategory>

export const Vendor = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  name: z.string().min(1).max(160),
  category: VendorCategory,
  /** Null when the source is OSM, which has no page per venue. */
  sourceUrl: HttpUrl.nullable().default(null),
  fetchedAt: z.string().datetime(),
  /** OSM carries neither price nor capacity, so both stay nullable. */
  priceINR: z.number().int().min(0).nullable().default(null),
  capacity: z.number().int().min(0).nullable().default(null),
  geo: Geo.nullable().default(null),
  address: z.string().max(300).nullable().default(null),
  /** One extracted fact, shown on the card. */
  fact: z.string().max(280).nullable().default(null),
  evidence: Evidence,
  shortlisted: z.boolean().default(false),
  confirmed: z.boolean().default(false),
})
export type Vendor = z.infer<typeof Vendor>

/* -------------------------------------------------------------------- task */

export const TaskStatus = z.enum(['todo', 'doing', 'done'])
export type TaskStatus = z.infer<typeof TaskStatus>

export const Task = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1).max(160),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: TaskStatus.default('todo'),
  dependsOn: z.array(z.string()).default([]),
  linkedItemId: z.string().nullable().default(null),
  category: BudgetCategory.nullable().default(null),
})
export type Task = z.infer<typeof Task>

/* -------------------------------------------------------------------- risk */

export const RiskKind = z.enum([
  'weather',
  'capacity',
  'budget',
  'holiday',
  'vendor',
  'logistics',
])
export type RiskKind = z.infer<typeof RiskKind>

export const RiskSeverity = z.enum(['low', 'medium', 'high'])
export type RiskSeverity = z.infer<typeof RiskSeverity>

/** `unknown` is a first-class outcome: we could not determine the risk. */
export const RiskStatus = z.enum(['open', 'mitigated', 'unknown'])
export type RiskStatus = z.infer<typeof RiskStatus>

export const Risk = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  kind: RiskKind,
  title: z.string().min(1).max(160),
  severity: RiskSeverity,
  status: RiskStatus,
  mitigation: z.string().max(400).nullable().default(null),
  evidence: Evidence,
})
export type Risk = z.infer<typeof Risk>

/* ------------------------------------------------------------- run of show */

export const ScheduleEntry = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  title: z.string().min(1).max(160),
  /** ISO datetime for the start of this slot. */
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(24 * 60),
  category: BudgetCategory.nullable().default(null),
  note: z.string().max(280).nullable().default(null),
})
export type ScheduleEntry = z.infer<typeof ScheduleEntry>

/* --------------------------------------------------------------- readiness */

export const ReadinessDeduction = z.object({
  /** Points lost, always positive. */
  points: z.number().int().min(0),
  reason: z.string().min(1).max(200),
  /** The single next action that recovers these points. */
  fixNext: z.string().min(1).max(200),
})
export type ReadinessDeduction = z.infer<typeof ReadinessDeduction>

export const Readiness = z.object({
  score: z.number().int().min(0).max(100),
  deductions: z.array(ReadinessDeduction),
})
export type Readiness = z.infer<typeof Readiness>

/* -------------------------------------------------------------------- plan */

/**
 * The model's contribution, kept in one clearly labelled place so it is always
 * obvious which parts of a plan are prose and which are computed.
 */
export const PlanNarrative = z.object({
  summary: z.string().max(700),
  categoryNotes: z.array(z.object({ category: BudgetCategory, note: z.string().max(240) })),
  watchOut: z.string().max(300),
  /** Whether a model wrote this or the deterministic fallback did. */
  source: z.enum(['model', 'fallback']),
  considerations: z
    .array(
      z.object({
        label: z.string().max(80),
        detail: z.string().max(240),
        affects: BudgetCategory.nullable(),
      }),
    )
    .default([]),
})
export type PlanNarrative = z.infer<typeof PlanNarrative>

/** The full aggregate the UI renders. Assembled by the reducer, never by the LLM. */
export const Plan = z.object({
  event: EventRecord,
  budget: z.array(BudgetItem),
  vendors: z.array(Vendor),
  tasks: z.array(Task),
  risks: z.array(Risk),
  schedule: z.array(ScheduleEntry),
  narrative: PlanNarrative.nullable().default(null),
  /** True when any live source failed and sample data was substituted. */
  usingSampleData: z.boolean().default(false),
})
export type Plan = z.infer<typeof Plan>

/* ---------------------------------------------------------------- proposals */

/**
 * Agents never mutate the plan. They return proposals, which the reducer
 * validates against the event before applying.
 */
export const BudgetProposal = z.object({
  kind: z.literal('budget'),
  items: z.array(
    BudgetItem.omit({ id: true, eventId: true }).extend({
      actualINR: z.number().int().min(0).nullable().optional(),
      perHead: z.number().min(0).nullable().optional(),
    }),
  ),
  /** LLM-written prose. Explanation only — it carries no numbers of record. */
  rationale: z.string().max(1200).default(''),
})
export type BudgetProposal = z.infer<typeof BudgetProposal>

export const ResearchProposal = z.object({
  kind: z.literal('research'),
  vendors: z.array(Vendor.omit({ id: true, eventId: true })),
  /** Facts we could not find, surfaced as the missing-information list. */
  gaps: z.array(z.string().max(200)).default([]),
})
export type ResearchProposal = z.infer<typeof ResearchProposal>

export const ScheduleProposal = z.object({
  kind: z.literal('schedule'),
  entries: z.array(ScheduleEntry.omit({ id: true, eventId: true })),
  tasks: z.array(Task.omit({ id: true, eventId: true })),
})
export type ScheduleProposal = z.infer<typeof ScheduleProposal>

export const RiskProposal = z.object({
  kind: z.literal('risk'),
  risks: z.array(Risk.omit({ id: true, eventId: true })),
})
export type RiskProposal = z.infer<typeof RiskProposal>

export const Proposal = z.discriminatedUnion('kind', [
  BudgetProposal,
  ResearchProposal,
  ScheduleProposal,
  RiskProposal,
])
export type Proposal = z.infer<typeof Proposal>

/* ---------------------------------------------------------------- scenario */

/** A what-if lever. Only the fields present are changed. */
export const ScenarioDelta = z.object({
  guestCount: z.number().int().min(1).max(5000).optional(),
  budgetINR: z.number().int().min(0).optional(),
  city: z.string().min(1).max(80).optional(),
  indoorOutdoor: IndoorOutdoor.optional(),
  /** Forces the rain branch without waiting on the forecast. */
  assumeRain: z.boolean().optional(),
})
export type ScenarioDelta = z.infer<typeof ScenarioDelta>

export const ScenarioChange = z.object({
  itemId: z.string(),
  label: z.string(),
  field: z.string(),
  before: z.union([z.string(), z.number(), z.null()]),
  after: z.union([z.string(), z.number(), z.null()]),
  deltaINR: z.number().int().optional(),
})
export type ScenarioChange = z.infer<typeof ScenarioChange>

export const ScenarioResult = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  delta: ScenarioDelta,
  changes: z.array(ScenarioChange),
  warnings: z.array(z.string().max(240)),
  totalBeforeINR: z.number().int(),
  totalAfterINR: z.number().int(),
  readinessBefore: z.number().int().min(0).max(100),
  readinessAfter: z.number().int().min(0).max(100),
  /** Dependency trace: which lever cascaded into which items. */
  cascade: z.array(z.object({ from: z.string(), to: z.array(z.string()) })),
  createdAt: z.string().datetime(),
})
export type ScenarioResult = z.infer<typeof ScenarioResult>
