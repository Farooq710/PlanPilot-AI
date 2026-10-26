import { Shell } from '@/components/chrome'
import { getActiveEventId } from '@/lib/active-event'
import { DEMO_EVENT_ID, assertDemoPlan, demoPlan } from '@/lib/demo'
import { inr } from '@/lib/money'
import { getStore } from '@/lib/store'
import { dayAndDate } from '@/lib/time'

// The store is process state, so these routes are always rendered per request.
export const dynamic = 'force-dynamic'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  assertDemoPlan()

  const store = await getStore()
  const activeId = await getActiveEventId()

  let plan = await store.getPlan(activeId)
  if (!plan) {
    // Nothing built yet, so the shell shows the seeded demo until the brief
    // writes a real event and points the cookie at it.
    plan = (await store.getPlan(DEMO_EVENT_ID)) ?? demoPlan
    if (!(await store.getEvent(DEMO_EVENT_ID))) await store.putPlan(demoPlan)
  }

  const spent = plan.budget.reduce((sum, item) => sum + (item.actualINR ?? 0), 0)

  return (
    <Shell
      event={{
        title: plan.event.title,
        dateLabel: `${dayAndDate(plan.event.date)}, ${plan.event.time}`,
        city: plan.event.city,
        guests: plan.event.guestCount,
        remainingLabel: inr(plan.event.budgetINR - spent),
      }}
      sampleData={plan.usingSampleData}
    >
      {children}
    </Shell>
  )
}
