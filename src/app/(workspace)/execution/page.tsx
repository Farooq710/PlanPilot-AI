import {
  CalendarDays,
  CircleCheck,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Share2,
} from 'lucide-react'
import Link from 'next/link'
import { Card, EmptyState, EvidenceChip, Icon } from '@/components/ui'
import { getActiveEventId } from '@/lib/active-event'
import { CATEGORY_LABEL, budgetTotals } from '@/lib/engines/budget'
import { scoreReadiness } from '@/lib/engines/readiness'
import { inr } from '@/lib/money'
import { getStore } from '@/lib/store'
import { clockTime, shortDate } from '@/lib/time'

export const dynamic = 'force-dynamic'

const DOWNLOADS = [
  {
    kind: 'run-of-show',
    icon: FileText,
    title: 'Run of show',
    detail: 'Timings, budget, suppliers and open risks, as Markdown.',
    ext: '.md',
  },
  {
    kind: 'checklist',
    icon: ListChecks,
    title: 'Task checklist',
    detail: 'Every task with its due date, status and dependencies.',
    ext: '.csv',
  },
  {
    kind: 'budget',
    icon: FileSpreadsheet,
    title: 'Budget',
    detail: 'Planned against actual, with the evidence label on each line.',
    ext: '.csv',
  },
  {
    kind: 'calendar',
    icon: CalendarDays,
    title: 'Calendar',
    detail: 'The event, each run-of-show slot and every open task.',
    ext: '.ics',
  },
] as const

export default async function ExecutionPage() {
  const store = await getStore()
  const plan = await store.getPlan(await getActiveEventId())

  if (!plan) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState icon={FileText} title="Nothing to export yet">
          Build a plan in the brief and the execution pack will fill in here.
        </EmptyState>
      </div>
    )
  }

  const { event } = plan
  const totals = budgetTotals(plan.budget, event.budgetINR)
  const readiness = scoreReadiness(plan)
  const confirmed = plan.vendors.filter((v) => v.confirmed)

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <header>
        <h2 className="display text-[28px]">Your plan is ready</h2>
        <p className="mt-1 text-[16px] text-ink-muted">
          {event.title} · {event.city} · {shortDate(`${event.date}T00:00:00+05:30`)} ·{' '}
          {event.guestCount} guests · readiness {readiness.score}/100
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {DOWNLOADS.map((download) => (
          <li key={download.kind}>
            <Card className="flex h-full flex-col gap-3 p-6">
              <Icon icon={download.icon} size={24} className="text-accent" />
              <div>
                <h3 className="text-[20px] font-semibold">{download.title}</h3>
                <p className="mt-1 text-[14px] text-ink-muted">{download.detail}</p>
              </div>
              {/* A plain link, so the browser downloads it without JavaScript. */}
              <a
                href={`/api/export/${download.kind}`}
                download
                className="tx mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-semibold text-white hover:opacity-90"
              >
                Download {download.ext}
              </a>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="p-6">
        <h3 className="flex items-center gap-2 text-[20px] font-semibold">
          <Icon icon={Share2} />
          Share a read-only plan
        </h3>
        <p className="mt-1 text-[14px] text-ink-muted">
          Anyone with this link can view the plan. They cannot edit it.
        </p>
        <p className="mt-3">
          <Link
            href={`/plan/${event.id}`}
            className="tx inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-sunk"
          >
            Open the shareable plan
          </Link>
        </p>
      </Card>

      {/* ------------------------------------------------ printable summary */}
      <Card className="p-6 print:border-0 print:shadow-none">
        <h3 className="text-[20px] font-semibold">Plan summary</h3>
        <p className="mt-1 text-[14px] text-ink-muted">
          Styled for print: white background, hairline rules, no shadows.
        </p>

        <h4 className="mt-6 text-[16px] font-semibold">Run of show</h4>
        {plan.schedule.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">No run of show recorded.</p>
        ) : (
          <table className="mt-2 w-full text-[14px]">
            <caption className="sr-only">Run of show, in time order</caption>
            <thead className="text-left text-ink-muted">
              <tr>
                <th scope="col" className="border-b border-line py-2 font-medium">Time</th>
                <th scope="col" className="border-b border-line py-2 font-medium">Item</th>
                <th scope="col" className="border-b border-line py-2 text-right font-medium">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {[...plan.schedule]
                .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                .map((slot) => (
                  <tr key={slot.id}>
                    <td className="border-b border-line py-2 tabular-nums">
                      {clockTime(slot.startsAt)}
                    </td>
                    <td className="border-b border-line py-2">{slot.title}</td>
                    <td className="border-b border-line py-2 text-right tabular-nums">
                      {slot.durationMinutes} min
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        <h4 className="mt-6 text-[16px] font-semibold">Budget</h4>
        <table className="mt-2 w-full text-[14px]">
          <caption className="sr-only">Budget by category with its evidence</caption>
          <thead className="text-left text-ink-muted">
            <tr>
              <th scope="col" className="border-b border-line py-2 font-medium">Category</th>
              <th scope="col" className="border-b border-line py-2 text-right font-medium">Planned</th>
              <th scope="col" className="border-b border-line py-2 text-right font-medium">Actual</th>
              <th scope="col" className="border-b border-line py-2 font-medium">Source</th>
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
                <td className="border-b border-line py-2 text-right tabular-nums">
                  {inr(item.actualINR ?? 0)}
                </td>
                <td className="border-b border-line py-2">
                  {/* Evidence survives into the export, not just the dashboard. */}
                  <EvidenceChip evidence={item.evidence} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="py-2 text-left font-semibold">Total</th>
              <td className="py-2 text-right font-semibold tabular-nums">{inr(totals.planned)}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{inr(totals.actual)}</td>
              <td className="py-2 text-ink-muted">of {inr(event.budgetINR)}</td>
            </tr>
          </tfoot>
        </table>

        <h4 className="mt-6 text-[16px] font-semibold">Confirmed suppliers</h4>
        {confirmed.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">Nothing confirmed yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 text-[14px]">
            {confirmed.map((vendor) => (
              <li key={vendor.id} className="flex flex-wrap items-center gap-2">
                <Icon icon={CircleCheck} size={16} className="text-ok" />
                <span className="font-medium">{vendor.name}</span>
                <span className="text-ink-muted">
                  {vendor.priceINR === null ? 'price unknown' : inr(vendor.priceINR)}
                </span>
                <EvidenceChip evidence={vendor.evidence} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
