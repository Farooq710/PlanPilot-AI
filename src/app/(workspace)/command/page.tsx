import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Clock,
  Info,
  ListChecks,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { toggleConfirmed, toggleRiskMitigated } from '@/app/actions'
import { TaskBoard } from '@/components/board'
import { BudgetDonut, BudgetTable, PlannedVsActual, ReadinessGauge } from '@/components/charts'
import { Card, EmptyState, EvidenceChip, Icon, Tag } from '@/components/ui'
import { getActivePlan } from '@/lib/active-event'
import { budgetTotals, proposeTradeOffs } from '@/lib/engines/budget'
import { scoreReadiness } from '@/lib/engines/readiness'
import { validatePlan, type IssueSeverity } from '@/lib/engines/validate'
import { inr } from '@/lib/money'
import type { Plan, RiskStatus } from '@/lib/schemas'
import { clockTime, daysUntil, stamp } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function CommandPage() {
  const plan = await getActivePlan()

  if (!plan) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState icon={ListChecks} title="No plan yet">
          Fill in the brief and your command center will appear here.
        </EmptyState>
      </div>
    )
  }

  const { event, budget, vendors, tasks, risks, schedule } = plan
  const totals = budgetTotals(budget, event.budgetINR)
  const readiness = scoreReadiness(plan)
  const { issues } = validatePlan(plan)
  const tradeOffs = proposeTradeOffs(budget, event, Math.max(0, -totals.remaining))

  const tasksDone = tasks.filter((t) => t.status === 'done').length
  const days = daysUntil(event.date)
  const shortlist = vendors.filter((v) => v.shortlisted || v.confirmed)

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <header>
        <h2 className="display text-[28px]">Command Center</h2>
        <p className="mt-1 text-[16px] text-ink-muted">
          {event.guestCount} guests in {event.city} ·{' '}
          {days >= 0 ? `${days} ${days === 1 ? 'day' : 'days'} to go` : 'past'}
        </p>
      </header>

      {/* ---------------------------------------------------- hero row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-[20px] font-semibold">Readiness</h3>
          <div className="mt-2 flex justify-center">
            <ReadinessGauge score={readiness.score} />
          </div>

          {readiness.deductions.length === 0 ? (
            <p className="mt-2 text-[14px] text-ok">Everything accounted for.</p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-line">
              {readiness.deductions.map((d) => (
                <li key={d.reason} className="flex flex-wrap items-baseline gap-x-2 py-2">
                  <span className="font-semibold text-danger">−{d.points}</span>
                  <span className="flex-1 text-[14px]">{d.reason}</span>
                  {/* Every deduction names the one action that recovers it. */}
                  <span className="w-full text-[12px] text-ink-muted">
                    Fix next: {d.fixNext}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2 lg:content-start">
          <Kpi
            icon={Wallet}
            label="Budget used"
            value={inr(totals.actual)}
            sub={`of ${inr(event.budgetINR)}`}
            tone={totals.remaining < 0 ? 'danger' : 'ok'}
          />
          <Kpi
            icon={ListChecks}
            label="Tasks done"
            value={`${tasksDone} of ${tasks.length}`}
            sub={tasks.length ? `${Math.round((tasksDone / tasks.length) * 100)}% complete` : 'none yet'}
          />
          <Kpi
            icon={CalendarCheck}
            label="Days to event"
            value={days >= 0 ? String(days) : '—'}
            sub={event.date}
          />

          <Card className="p-6 sm:col-span-3">
            <h3 className="text-[20px] font-semibold">Budget</h3>
            <div className="mt-4">
              <BudgetDonut items={budget} budgetINR={event.budgetINR} />
            </div>
            <BudgetTable items={budget} />
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------ planned v actual */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-[20px] font-semibold">Planned against actual</h3>
          <div className="mt-4">
            <PlannedVsActual items={budget} />
          </div>
          {tradeOffs.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <h4 className="text-[14px] font-semibold">Trade-offs</h4>
              <ul className="mt-2 flex flex-col gap-2">
                {tradeOffs.slice(0, 3).map((t) => (
                  <li key={t.category} className="flex items-baseline gap-2 text-[14px]">
                    <span className="font-semibold text-ok">−{inr(t.saveINR)}</span>
                    <span className="flex-1">{t.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-[20px] font-semibold">Run of show</h3>
          {schedule.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-muted">No run of show yet.</p>
          ) : (
            <ol className="mt-4 flex flex-col">
              {[...schedule]
                .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
                .map((slot) => (
                  <li key={slot.id} className="flex gap-4 border-l-2 border-line pl-4 pb-4 last:pb-0">
                    <span className="w-20 shrink-0 text-[14px] font-semibold tabular-nums">
                      {clockTime(slot.startsAt)}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[14px] font-medium">{slot.title}</span>
                      <span className="block text-[12px] text-ink-muted">
                        {slot.durationMinutes} min{slot.note ? ` · ${slot.note}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
            </ol>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------ task board */}
      <Card className="p-6">
        <h3 className="text-[20px] font-semibold">Tasks</h3>
        {tasks.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-muted">No tasks yet.</p>
        ) : (
          <div className="mt-4">
            <TaskBoard tasks={tasks} />
          </div>
        )}
      </Card>

      {/* ------------------------------------------ shortlist, risks, feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="text-[20px] font-semibold">Shortlist</h3>
          {shortlist.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-muted">
              Star options in the Research Room and they appear here.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {shortlist.map((vendor) => (
                <li key={vendor.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{vendor.name}</p>
                      <p className="text-[12px] text-ink-muted">
                        {vendor.category} ·{' '}
                        {vendor.priceINR === null ? 'price unknown' : inr(vendor.priceINR)}
                      </p>
                    </div>
                    <form action={toggleConfirmed.bind(null, vendor.id)}>
                      <button
                        type="submit"
                        className={`tx inline-flex min-h-11 items-center gap-1 rounded-xl border px-3 text-[12px] font-semibold ${
                          vendor.confirmed
                            ? 'border-ok bg-surface text-ok'
                            : 'border-line hover:bg-sunk'
                        }`}
                      >
                        <Icon icon={CheckCircle2} size={16} />
                        {vendor.confirmed ? 'Confirmed' : 'Confirm'}
                      </button>
                    </form>
                  </div>
                  <div className="mt-2">
                    <EvidenceChip evidence={vendor.evidence} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-[20px] font-semibold">Risks</h3>
          {risks.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-muted">None recorded.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {risks.map((risk) => (
                <li key={risk.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskStatusTag status={risk.status} />
                    <span className="text-[12px] uppercase tracking-wide text-ink-muted">
                      {risk.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] font-medium">{risk.title}</p>
                  {risk.mitigation && (
                    <p className="text-[12px] text-ink-muted">{risk.mitigation}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <EvidenceChip evidence={risk.evidence} />
                    {risk.status !== 'unknown' && (
                      <form action={toggleRiskMitigated.bind(null, risk.id)}>
                        <button
                          type="submit"
                          className="tx min-h-11 rounded-xl px-3 text-[12px] font-semibold text-accent hover:bg-accent-soft"
                        >
                          {risk.status === 'mitigated' ? 'Reopen' : 'Mark mitigated'}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-[20px] font-semibold">Activity</h3>
          <ActivityFeed plan={plan} />
        </Card>
      </div>

      {/* -------------------------------------------------------- narrative */}
      {plan.narrative && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Icon icon={Sparkles} className="text-accent" />
            <h3 className="text-[20px] font-semibold">How this plan is shaped</h3>
            <span className="ml-auto text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
              {plan.narrative.source === 'model' ? 'Written by the model' : 'No model key — plain summary'}
            </span>
          </div>
          <p className="mt-3 max-w-prose text-[16px]">{plan.narrative.summary}</p>
          <p className="mt-3 max-w-prose text-[14px] text-warn">
            <strong className="font-semibold">Watch out:</strong> {plan.narrative.watchOut}
          </p>
        </Card>
      )}

      {/* -------------------------------------------------------- validator */}
      <Card className="p-6">
        <h3 className="text-[20px] font-semibold">Validator</h3>
        <p className="mt-1 text-[14px] text-ink-muted">
          Re-checked after assembly: totals, evidence, schedule, capacity and open risks.
        </p>
        {issues.length === 0 ? (
          <p className="mt-3 text-[14px] text-ok">Nothing outstanding.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {issues.map((issue, i) => (
              <li key={`${issue.area}-${i}`} className="flex flex-wrap items-start gap-2">
                <Tag tone={TONE[issue.severity]} icon={ICON[issue.severity]}>
                  {issue.severity}
                </Tag>
                <span className="flex-1 text-[14px]">
                  {issue.message}
                  {issue.fix && <span className="block text-ink-muted">Fix next: {issue.fix}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------- fragments */

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Wallet
  label: string
  value: string
  sub: string
  tone?: 'ok' | 'danger'
}) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1 text-[12px] uppercase tracking-wide text-ink-muted">
        <Icon icon={icon} size={16} />
        {label}
      </p>
      <p
        className={`display mt-1 text-[28px] ${tone === 'danger' ? 'text-danger' : 'text-ink'}`}
      >
        {value}
      </p>
      <p className="text-[12px] text-ink-muted">{sub}</p>
    </Card>
  )
}

function RiskStatusTag({ status }: { status: RiskStatus }) {
  if (status === 'mitigated') {
    return (
      <Tag tone="ok" icon={CheckCircle2}>
        mitigated
      </Tag>
    )
  }
  if (status === 'unknown') {
    return (
      <Tag tone="unknown" icon={CircleHelp} dashed>
        unknown
      </Tag>
    )
  }
  return (
    <Tag tone="warn" icon={AlertTriangle}>
      open
    </Tag>
  )
}

/**
 * Derived from timestamps the plan actually carries, rather than an invented
 * event log. There is no activity table, so this reports what is known instead
 * of making up a history.
 */
function ActivityFeed({ plan }: { plan: Plan }) {
  const entries: { at: string; text: string }[] = [
    { at: plan.event.createdAt, text: 'Brief captured and plan built' },
  ]

  if (plan.event.updatedAt !== plan.event.createdAt) {
    entries.push({ at: plan.event.updatedAt, text: 'Event details updated' })
  }

  const researched = plan.vendors
    .map((v) => v.fetchedAt)
    .sort()
    .at(-1)
  if (researched) {
    entries.push({
      at: researched,
      text: `${plan.vendors.length} ${plan.vendors.length === 1 ? 'option' : 'options'} researched`,
    })
  }

  const confirmed = plan.vendors.filter((v) => v.confirmed).length
  if (confirmed) {
    entries.push({
      at: researched ?? plan.event.updatedAt,
      text: `${confirmed} booking${confirmed === 1 ? '' : 's'} confirmed`,
    })
  }

  const sorted = entries.sort((a, b) => b.at.localeCompare(a.at))

  return (
    <ul className="mt-3 flex flex-col gap-3">
      {sorted.map((entry, i) => (
        <li key={`${entry.at}-${i}`} className="flex gap-2 text-[14px]">
          <Icon icon={Clock} size={16} className="mt-1 text-ink-muted" />
          <span className="flex-1">
            {entry.text}
            <span className="block text-[12px] text-ink-muted">{stamp(entry.at)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

const TONE: Record<IssueSeverity, 'danger' | 'warn' | 'info'> = {
  blocker: 'danger',
  warning: 'warn',
  info: 'info',
}

const ICON = {
  blocker: CircleAlert,
  warning: AlertTriangle,
  info: Info,
}
