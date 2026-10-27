import { ArrowRight, CornerDownRight, FlaskConical, TriangleAlert } from 'lucide-react'
import { acceptScenario } from '@/app/actions'
import { Button } from '@/components/controls'
import { Card, EmptyState, Icon } from '@/components/ui'
import { getActivePlan } from '@/lib/active-event'
import { applyScenario } from '@/lib/engines/scenario'
import { readinessTone } from '@/lib/engines/readiness'
import { delta as fmtDelta, inr } from '@/lib/money'
import { ScenarioDelta, type ScenarioChange } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/**
 * The levers live in the query string, so the whole screen stays a server
 * component: the scenario is recomputed on the server for every combination,
 * the result is shareable as a link, and there is no client-side copy of the
 * plan that could drift from it.
 */
type Search = Promise<Record<string, string | string[] | undefined>>

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function WhatIfPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams
  const plan = await getActivePlan()

  if (!plan) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState icon={FlaskConical} title="Nothing to simulate yet">
          Build a plan in the brief first, then come back and change something.
        </EmptyState>
      </div>
    )
  }

  const { event } = plan

  // Levers default to the current plan, so an untouched form is a no-op.
  const guests = Number(one(params.guests) ?? event.guestCount)
  const budget = Number(one(params.budget) ?? event.budgetINR)
  const setting = (one(params.setting) ?? event.indoorOutdoor) as typeof event.indoorOutdoor
  const city = one(params.city) ?? event.city
  const rain = one(params.rain) === 'on'
  const onlyChanges = one(params.only) === 'on'

  const parsedDelta = ScenarioDelta.safeParse({
    guestCount: Number.isFinite(guests) ? guests : undefined,
    budgetINR: Number.isFinite(budget) ? budget : undefined,
    indoorOutdoor: setting,
    city,
    assumeRain: rain || undefined,
  })

  const applied = parsedDelta.success ? applyScenario(plan, parsedDelta.data) : null
  const result = applied?.result
  const hasChanges = Boolean(result && result.changes.length > 0)

  const costDelta = result ? result.totalAfterINR - result.totalBeforeINR : 0
  const readinessDelta = result ? result.readinessAfter - result.readinessBefore : 0

  return (
    <div className="flex flex-col gap-6 p-6 pb-28 lg:p-8 lg:pb-28">
      <header>
        <h2 className="display text-[28px]">What-If Lab</h2>
        <p className="mt-1 text-[16px] text-ink-muted">
          Change one input and see exactly what moves — and what does not.
        </p>
      </header>

      {/* ------------------------------------------------------- levers */}
      <Card className="bg-sunk p-6">
        <form method="get" className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Guests" htmlFor="guests">
              <input
                id="guests"
                name="guests"
                type="number"
                min={1}
                max={5000}
                defaultValue={guests}
                className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[16px]"
              />
            </Field>

            <Field label="Budget (₹)" htmlFor="budget">
              <input
                id="budget"
                name="budget"
                type="number"
                min={0}
                step={500}
                defaultValue={budget}
                className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[16px]"
              />
            </Field>

            <Field label="Setting" htmlFor="setting">
              <select
                id="setting"
                name="setting"
                defaultValue={setting}
                className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[16px]"
              >
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="either">Either</option>
              </select>
            </Field>

            <Field label="City" htmlFor="city">
              <input
                id="city"
                name="city"
                defaultValue={city}
                className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[16px]"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium">
              <input type="checkbox" name="rain" defaultChecked={rain} className="size-4" />
              Assume rain on the day
            </label>
            <label className="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium">
              <input type="checkbox" name="only" defaultChecked={onlyChanges} className="size-4" />
              Show only changes
            </label>
            <Button type="submit" variant="outline" className="ml-auto">
              Run scenario
            </Button>
          </div>

          <p className="text-[14px] text-ink-muted">
            Presets:{' '}
            <a className="text-accent underline" href={`?guests=${event.guestCount + 15}`}>
              +15 guests
            </a>{' '}
            ·{' '}
            <a className="text-accent underline" href="?rain=on&setting=outdoor">
              Rain on the day
            </a>{' '}
            ·{' '}
            <a
              className="text-accent underline"
              href={`?budget=${Math.round(event.budgetINR * 0.8)}`}
            >
              Cut budget 20%
            </a>
          </p>
        </form>
      </Card>

      {!hasChanges ? (
        <EmptyState icon={FlaskConical} title="Nothing changed yet">
          Adjust a lever above, or pick a preset. The current plan is shown unchanged.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {/* -------------------------------------------------- diff */}
          <Card className="overflow-hidden lg:col-span-2">
            {/* Below sm each row stacks and labels its own halves, so the
                column headings would be misleading there. */}
            <div className="hidden grid-cols-2 border-b border-line bg-sunk text-[12px] font-semibold uppercase tracking-wide text-ink-muted sm:grid">
              <span className="px-4 py-2">Current plan</span>
              <span className="border-l border-line px-4 py-2">Proposed plan</span>
            </div>

            <ul>
              {result!.changes.map((change) => (
                <DiffRow key={`${change.itemId}-${change.field}`} change={change} />
              ))}

              {/* Showing what held still is the point: an unrelated line that
                  moved would mean the engine is wrong. */}
              {!onlyChanges &&
                plan.budget
                  .filter((item) => !result!.changes.some((c) => c.itemId === item.id))
                  .map((item) => (
                    <li
                      key={item.id}
                      className="grid border-b border-line text-[14px] text-ink-muted last:border-0 sm:grid-cols-2"
                    >
                      <span className="px-4 pt-3 sm:py-3">
                        {item.label}
                        <span className="ml-2 tabular-nums">{inr(item.plannedINR)}</span>
                      </span>
                      <span className="px-4 pb-3 sm:border-l sm:border-line sm:py-3">
                        Unchanged
                      </span>
                    </li>
                  ))}
            </ul>
          </Card>

          {/* ------------------------------------------------- impact */}
          <aside className="flex flex-col gap-6">
            <Card className="p-6">
              <h3 className="text-[20px] font-semibold">What this cascades into</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {result!.cascade.map((step) => (
                  <li key={step.from}>
                    <p className="text-[14px] font-semibold">{step.from}</p>
                    <ul className="mt-1 flex flex-col gap-1 border-l-2 border-accent pl-3">
                      {step.to.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-1 text-[14px] text-ink-muted"
                        >
                          <Icon icon={CornerDownRight} size={16} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Card>

            {result!.warnings.length > 0 && (
              <Card className="border-warn-fill p-6">
                <h3 className="flex items-center gap-2 text-[20px] font-semibold text-warn">
                  <Icon icon={TriangleAlert} />
                  Warnings
                </h3>
                <ul className="mt-3 flex flex-col gap-2 text-[14px]">
                  {result!.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="p-6">
              <h3 className="text-[20px] font-semibold">Readiness</h3>
              <p className="mt-2 flex items-center gap-3">
                <span className="display text-[28px] text-ink-muted">
                  {result!.readinessBefore}
                </span>
                <Icon icon={ArrowRight} className="text-ink-muted" />
                {/* Written out rather than interpolated: Tailwind only emits
                    classes it can see literally in the source. */}
                <span className={`display text-[40px] ${TONE_TEXT[readinessTone(result!.readinessAfter)]}`}>
                  {result!.readinessAfter}
                </span>
                <span
                  className={`text-[14px] font-semibold ${readinessDelta < 0 ? 'text-danger' : 'text-ok'}`}
                >
                  {readinessDelta > 0 ? '+' : ''}
                  {readinessDelta}
                </span>
              </p>
            </Card>
          </aside>
        </div>
      )}

      {/* --------------------------------------------------- sticky footer */}
      {hasChanges && (
        // Clears the mobile bottom tab bar, which is about 72px tall. From lg
        // the rail is a sidebar instead, so the footer sits flush.
        <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-line bg-surface px-6 py-3 shadow-raised lg:bottom-0 lg:left-60">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-[14px]">
              <span className="text-ink-muted">Total</span>{' '}
              <span className="tabular-nums line-through">{inr(result!.totalBeforeINR)}</span>{' '}
              <Icon icon={ArrowRight} size={16} className="inline text-ink-muted" />{' '}
              <span className="font-semibold tabular-nums">{inr(result!.totalAfterINR)}</span>{' '}
              <span className={costDelta > 0 ? 'text-danger' : 'text-ok'}>
                ({fmtDelta(costDelta)})
              </span>
            </p>
            <div className="ml-auto flex gap-2">
              <a
                href="/whatif"
                className="tx inline-flex min-h-11 items-center rounded-xl px-4 text-[14px] font-semibold hover:bg-sunk"
              >
                Reject
              </a>
              <form action={acceptScenario.bind(null, parsedDelta.success ? parsedDelta.data : {})}>
                <Button type="submit">Accept changes</Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TONE_TEXT = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
} as const

/* -------------------------------------------------------------- fragments */

function DiffRow({ change }: { change: ScenarioChange }) {
  const money = change.deltaINR !== undefined
  return (
    <li className="grid border-b border-line border-l-[3px] border-l-accent bg-accent-soft text-[14px] last:border-b-0 sm:grid-cols-2">
      <span className="px-4 pt-3 sm:py-3">
        {/* The column headings are hidden below sm, so each half names itself. */}
        <span className="mr-2 text-[12px] uppercase tracking-wide text-ink-muted sm:hidden">
          Now
        </span>
        {change.label}
        <span className="ml-2 tabular-nums text-ink-muted">
          {money ? inr(Number(change.before ?? 0)) : String(change.before ?? '—')}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:border-l sm:border-line sm:py-3">
        <span className="text-[12px] uppercase tracking-wide text-ink-muted sm:hidden">
          Proposed
        </span>
        <span className="font-semibold tabular-nums">
          {money ? inr(Number(change.after ?? 0)) : String(change.after ?? '—')}
        </span>
        {money && change.deltaINR !== 0 && (
          <span
            className={`rounded-[999px] px-2 py-1 text-[12px] font-semibold ${
              change.deltaINR! > 0 ? 'bg-danger text-white' : 'bg-ok text-white'
            }`}
          >
            {fmtDelta(change.deltaINR!)}
          </span>
        )}
      </span>
    </li>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-[14px] font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}
