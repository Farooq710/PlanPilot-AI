import { Shell } from '@/components/chrome'
import { DEMO_EVENT_ID, assertDemoPlan, demoPlan } from '@/lib/demo'
import { inr } from '@/lib/money'
import { getStore } from '@/lib/store'
import { dayAndDate } from '@/lib/time'

// The store is process state, so these routes are always rendered per request.
export const dynamic = 'force-dynamic'

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  assertDemoPlan()

  const store = await getStore()
  // M1 seeds the demo event so the shell has something real to show. From M2
  // the brief writes the event and this becomes a lookup by id.
  let plan = await store.getPlan(DEMO_EVENT_ID)
  if (!plan) {
    await store.putPlan(demoPlan)
    plan = demoPlan
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
