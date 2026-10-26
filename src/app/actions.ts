'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { setActiveEventId } from '@/lib/active-event'
import { buildPlanFromDraft } from '@/lib/engines/plan'
import { EventDraft } from '@/lib/schemas'
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
