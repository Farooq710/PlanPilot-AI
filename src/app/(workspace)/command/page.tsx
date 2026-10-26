import { AlertTriangle, CircleAlert, Info, Sparkles } from 'lucide-react'
import { Card, EvidenceChip, Icon, Tag } from '@/components/ui'
import { getActiveEventId } from '@/lib/active-event'
import { CATEGORY_LABEL, budgetTotals, proposeTradeOffs } from '@/lib/engines/budget'
import { validatePlan, type IssueSeverity } from '@/lib/engines/validate'
import { inr } from '@/lib/money'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

/**
 * M2 shows what the pipeline produced: the computed allocation, the model's
 * description of it, and what the validator found. The full dashboard — donut,
 * timeline, task board, readiness score — lands in M4.
 */
export default async function CommandPage() {
  const store = await getStore()
  const plan = await store.getPlan(await getActiveEventId())

  if (!plan) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-prose p-6">
          <h2 className="display text-[28px]">No plan yet</h2>
          <p className="mt-2 text-ink-muted">Fill in the brief and it will appear here.</p>
        </Card>
      </div>
    )
  }

  const totals = budgetTotals(plan.budget, plan.event.budgetINR)
  const { issues } = validatePlan(plan)
  const tradeOffs = proposeTradeOffs(plan.budget, plan.event, totals.overBy)

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <header>
        <h2 className="display text-[28px]">Command Center</h2>
        <p className="mt-1 text-[16px] text-ink-muted">
          {plan.event.guestCount} guests in {plan.event.city} · {inr(plan.event.budgetINR)} budget ·{' '}
          {inr(totals.planned)} allocated
        </p>
      </header>

      {plan.narrative && (
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Icon icon={Sparkles} className="text-accent" />
            <h3 className="text-[20px] font-semibold">How this plan is shaped</h3>
            {/* Always say whose words these are. */}
            <span className="ml-auto text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
              {plan.narrative.source === 'model' ? 'Written by Gemini' : 'No model key — plain summary'}
            </span>
          </div>
          <p className="mt-3 max-w-prose text-[16px]">{plan.narrative.summary}</p>
          <p className="mt-3 max-w-prose text-[14px] text-warn">
            <strong className="font-semibold">Watch out:</strong> {plan.narrative.watchOut}
          </p>

          {plan.narrative.considerations.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {plan.narrative.considerations.map((c) => (
                <li key={c.label} className="text-[14px]">
                  <span className="font-semibold">{c.label}:</span>{' '}
                  <span className="text-ink-muted">{c.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <h3 className="border-b border-line px-6 py-4 text-[20px] font-semibold">Budget</h3>
        <table className="w-full text-[14px]">
          <caption className="sr-only">
            Planned allocation by category, with the evidence behind each figure
          </caption>
          <thead className="bg-sunk text-left text-ink-muted">
            <tr>
              <th scope="col" className="px-6 py-2 font-medium">Category</th>
              <th scope="col" className="px-6 py-2 text-right font-medium">Planned</th>
              <th scope="col" className="px-6 py-2 text-right font-medium">Per head</th>
              <th scope="col" className="px-6 py-2 font-medium">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {plan.budget.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <th scope="row" className="px-6 py-3 text-left font-medium">
                  {CATEGORY_LABEL[item.category]}
                  <span className="block font-normal text-ink-muted">{item.label}</span>
                </th>
                <td className="px-6 py-3 text-right font-semibold">{inr(item.plannedINR)}</td>
                <td className="px-6 py-3 text-right text-ink-muted">
                  {item.perHead ? inr(item.perHead) : '—'}
                </td>
                <td className="px-6 py-3">
                  <EvidenceChip evidence={item.evidence} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-sunk">
              <th scope="row" className="px-6 py-3 text-left font-semibold">Total allocated</th>
              <td className="px-6 py-3 text-right font-semibold">{inr(totals.planned)}</td>
              <td colSpan={2} className="px-6 py-3 text-ink-muted">
                of {inr(plan.event.budgetINR)} budget
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {tradeOffs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-[20px] font-semibold">Trade-offs</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {tradeOffs.map((t) => (
              <li key={t.category} className="flex items-baseline gap-3 text-[14px]">
                <span className="font-semibold text-ok">−{inr(t.saveINR)}</span>
                <span>{t.action}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-[20px] font-semibold">Validator</h3>
        <p className="mt-1 text-[14px] text-ink-muted">
          Re-checked after the plan was assembled: totals, evidence, schedule and open risks.
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
                  {issue.fix && (
                    <span className="block text-ink-muted">Fix next: {issue.fix}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
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
