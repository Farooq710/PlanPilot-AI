import { notFound } from 'next/navigation'
import { CATEGORY_LABEL, budgetTotals } from '@/lib/engines/budget'
import { scoreReadiness } from '@/lib/engines/readiness'
import { EvidenceChip } from '@/components/ui'
import { inr } from '@/lib/money'
import { getStore } from '@/lib/store'
import { clockTime, shortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'

/**
 * The shareable, read-only plan. Deliberately outside the workspace layout:
 * no navigation, no actions, nothing that writes. It takes the id from the
 * URL rather than the session cookie, so a link works for someone else — and
 * because it can only read, an unguessable id is the whole access model.
 */
export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const store = await getStore()
  const plan = await store.getPlan(id)

  if (!plan) notFound()

  const { event } = plan
  const totals = budgetTotals(plan.budget, event.budgetINR)
  const readiness = scoreReadiness(plan)
  const confirmed = plan.vendors.filter((v) => v.confirmed)

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {plan.usingSampleData && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-warn-fill bg-warn-fill/15 px-4 py-2 text-[14px] font-medium text-warn"
        >
          Sample data — not live
        </p>
      )}

      <header className="border-b border-line pb-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
          Shared plan · read only
        </p>
        <h1 className="display mt-1 text-[40px]">{event.title}</h1>
        <p className="mt-2 text-[16px] text-ink-muted">
          {shortDate(`${event.date}T00:00:00+05:30`)} · {event.city} · {event.guestCount} guests
        </p>
        <dl className="mt-4 flex flex-wrap gap-6 text-[14px]">
          <div>
            <dt className="text-ink-muted">Budget</dt>
            <dd className="text-[20px] font-semibold">{inr(event.budgetINR)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Allocated</dt>
            <dd className="text-[20px] font-semibold">{inr(totals.planned)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Readiness</dt>
            <dd className="text-[20px] font-semibold">{readiness.score}/100</dd>
          </div>
        </dl>
      </header>

      <section className="mt-8">
        <h2 className="text-[20px] font-semibold">Run of show</h2>
        {plan.schedule.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">Not recorded.</p>
        ) : (
          <ol className="mt-3 flex flex-col">
            {[...plan.schedule]
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .map((slot) => (
                <li key={slot.id} className="flex gap-4 border-b border-line py-2 text-[14px]">
                  <span className="w-20 shrink-0 font-semibold tabular-nums">
                    {clockTime(slot.startsAt)}
                  </span>
                  <span className="flex-1">{slot.title}</span>
                  <span className="text-ink-muted tabular-nums">{slot.durationMinutes} min</span>
                </li>
              ))}
          </ol>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[20px] font-semibold">Budget</h2>
        <table className="mt-3 w-full text-[14px]">
          <caption className="sr-only">Budget by category, with the evidence for each figure</caption>
          <thead className="text-left text-ink-muted">
            <tr>
              <th scope="col" className="border-b border-line py-2 font-medium">Category</th>
              <th scope="col" className="border-b border-line py-2 text-right font-medium">Planned</th>
              <th scope="col" className="border-b border-line py-2 font-medium">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {plan.budget.map((item) => (
              <tr key={item.id}>
                <th scope="row" className="border-b border-line py-2 text-left font-normal">
                  {CATEGORY_LABEL[item.category]}
                </th>
                <td className="border-b border-line py-2 text-right tabular-nums">
                  {inr(item.plannedINR)}
                </td>
                <td className="border-b border-line py-2">
                  <EvidenceChip evidence={item.evidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {confirmed.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[20px] font-semibold">Confirmed suppliers</h2>
          <ul className="mt-3 flex flex-col gap-3 text-[14px]">
            {confirmed.map((vendor) => (
              <li key={vendor.id} className="border-b border-line pb-3">
                <p className="font-medium">{vendor.name}</p>
                <p className="text-ink-muted">
                  {vendor.category} ·{' '}
                  {vendor.priceINR === null ? 'price unknown' : inr(vendor.priceINR)}
                </p>
                <div className="mt-1">
                  <EvidenceChip evidence={vendor.evidence} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-10 border-t border-line pt-4 text-[12px] text-ink-muted">
        <p>
          An estimate is not a quote. Each figure carries the evidence it was derived from.
        </p>
        <p className="mt-1">
          Venue data © OpenStreetMap contributors (ODbL). Weather by Open-Meteo, CC BY 4.0.
        </p>
      </footer>
    </main>
  )
}
