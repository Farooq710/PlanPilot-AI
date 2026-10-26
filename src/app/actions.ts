'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getActiveEventId, setActiveEventId } from '@/lib/active-event'
import { buildPlanFromDraft } from '@/lib/engines/plan'
import { runResearch } from '@/lib/engines/research'
import { applyScenario } from '@/lib/engines/scenario'
import { EventDraft, ScenarioDelta, type TaskStatus } from '@/lib/schemas'
import { getStore } from '@/lib/store'

export type CreatePlanState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors: Record<string, string> }

/**
 * The brief's submit handler. Validates the draft, builds and persists the
 * plan, then sends the user to the Command Center.
 */
export async function createPlan(
  _prev: CreatePlanState,
  formData: FormData,
): Promise<CreatePlanState> {
  const styles = formData.getAll('style').map(String).filter(Boolean)

  const parsed = EventDraft.safeParse({
    type: formData.get('type'),
    title: String(formData.get('title') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    date: formData.get('date'),
    time: formData.get('time') || '19:00',
    guestCount: Number(formData.get('guestCount')),
    budgetINR: Number(formData.get('budgetINR')),
    style: styles,
    indoorOutdoor: formData.get('indoorOutdoor'),
    constraints: String(formData.get('constraints') ?? ''),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      fieldErrors[key] ??= issue.message
    }
    return {
      status: 'error',
      message: 'Some answers need another look.',
      fieldErrors,
    }
  }

  // A budget that cannot cover a meal is a planning error, not a schema error,
  // so it is checked here where we know the headcount.
  const perHead = parsed.data.budgetINR / parsed.data.guestCount
  if (perHead < 150) {
    return {
      status: 'error',
      message: 'That budget will not stretch to this many guests.',
      fieldErrors: {
        budgetINR: `${Math.round(perHead)} rupees per guest is below what a basic plan needs. Try raising the budget or lowering the guest count.`,
      },
    }
  }

  const built = await buildPlanFromDraft(parsed.data)

  const store = await getStore()
  await store.putPlan(built.plan)
  await setActiveEventId(built.plan.event.id)

  revalidatePath('/', 'layout')
  redirect('/command')
}

/**
 * Runs the fast research sources — weather, holidays, and web search when a
 * key is configured — and saves what they returned. Venue candidates come
 * separately, because Overpass regularly takes the better part of a minute.
 */
export async function researchAction(): Promise<void> {
  const store = await getStore()
  const eventId = await getActiveEventId()
  const plan = await store.getPlan(eventId)
  if (!plan) return

  const report = await runResearch(plan)
  await store.putPlan(report.plan)

  revalidatePath('/research')
  revalidatePath('/command')
}

/** Toggles a vendor on or off the shortlist. */
export async function toggleShortlist(vendorId: string): Promise<void> {
  const store = await getStore()
  const eventId = await getActiveEventId()
  const plan = await store.getPlan(eventId)
  if (!plan) return

  await store.putVendors(
    eventId,
    plan.vendors.map((v) => (v.id === vendorId ? { ...v, shortlisted: !v.shortlisted } : v)),
  )
  revalidatePath('/research')
  revalidatePath('/command')
}

/** Moves a task between board columns. */
export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const store = await getStore()
  const eventId = await getActiveEventId()
  const plan = await store.getPlan(eventId)
  if (!plan) return

  await store.putTasks(
    eventId,
    plan.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
  )
  revalidatePath('/command')
}

/**
 * Confirms or unconfirms a booking. Confirming is what moves the readiness
 * score most, so it is a deliberate action rather than a side effect of
 * shortlisting.
 */
export async function toggleConfirmed(vendorId: string): Promise<void> {
  const store = await getStore()
  const eventId = await getActiveEventId()
  const plan = await store.getPlan(eventId)
  if (!plan) return

  await store.putVendors(
    eventId,
    plan.vendors.map((v) =>
      v.id === vendorId
        ? // Confirming implies shortlisting; it cannot be confirmed but unlisted.
          { ...v, confirmed: !v.confirmed, shortlisted: !v.confirmed ? true : v.shortlisted }
        : v,
    ),
  )
  revalidatePath('/command')
  revalidatePath('/research')
}

/** Marks a risk as mitigated, or reopens it. */
export async function toggleRiskMitigated(riskId: string): Promise<void> {
  const store = await getStore()
  const eventId = await getActiveEventId()
  const plan = await store.getPlan(eventId)
  if (!plan) return

  await store.putRisks(
    eventId,
    plan.risks.map((r) =>
      r.id === riskId
        ? { ...r, status: r.status === 'mitigated' ? 'open' : 'mitigated' }
        : r,
    ),
  )
  revalidatePath('/command')
}

/**
 * Applies a scenario the user accepted. The scenario is recomputed here rather
 * than trusting anything posted from the browser, then stored alongside the
 * new plan so the change has a record.
 */
export async function acceptScenario(delta: ScenarioDelta): Promise<void> {
  const store = await getStore()
  const eventId = await getActiveEventId()
  const plan = await store.getPlan(eventId)
  if (!plan) return

  const parsed = ScenarioDelta.safeParse(delta)
  if (!parsed.success) return

  const { result, nextPlan } = applyScenario(plan, parsed.data)
  await store.putPlan(nextPlan)
  await store.putScenario(result)

  revalidatePath('/', 'layout')
  redirect('/command')
}
