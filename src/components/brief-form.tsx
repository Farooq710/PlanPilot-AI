'use client'

import { useActionState, useState } from 'react'
import {
  Building2,
  CalendarDays,
  Cake,
  MapPin,
  Pencil,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react'
import { createPlan, type CreatePlanState } from '@/app/actions'
import { Button, Segmented, Stepper } from '@/components/controls'
import { Card, Icon, Label, inputCls } from '@/components/ui'
import { inr } from '@/lib/money'
import { nextWeekday } from '@/lib/time'
import type { EventStyle, EventType, IndoorOutdoor } from '@/lib/schemas'

/**
 * Conversational intake: one group of questions at a time, with answered
 * groups collapsing into editable summary rows. The whole thing posts as one
 * form, so it degrades to a plain multi-field submit without JavaScript.
 */

const TYPES: { value: EventType; label: string }[] = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'community', label: 'Community' },
  { value: 'corporate', label: 'Corporate' },
]

const STYLES: { value: EventStyle; label: string }[] = [
  { value: 'premium', label: 'Premium' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'festive', label: 'Festive' },
  { value: 'rustic', label: 'Rustic' },
  { value: 'kids', label: 'Kids' },
]

const BUDGET_CHIPS = [25_000, 50_000, 100_000]

const DEMO = {
  type: 'birthday' as EventType,
  title: "Aarav's 30th Birthday",
  city: 'Hyderabad',
  guestCount: 40,
  budgetINR: 25_000,
  style: ['premium'] as EventStyle[],
  indoorOutdoor: 'outdoor' as IndoorOutdoor,
  constraints: 'Vegetarian options for 15 guests. Parking needed.',
}

const GROUP_COUNT = 3

export function BriefForm() {
  const [state, formAction, pending] = useActionState<CreatePlanState, FormData>(createPlan, {
    status: 'idle',
  })

  const [step, setStep] = useState(0)
  const [type, setType] = useState<EventType>('birthday')
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const [guestCount, setGuests] = useState(40)
  const [budgetINR, setBudget] = useState(25_000)
  const [indoorOutdoor, setPlace] = useState<IndoorOutdoor>('outdoor')
  const [style, setStyle] = useState<EventStyle[]>(['premium'])
  const [constraints, setConstraints] = useState('')

  const errors = state.status === 'error' ? state.fieldErrors : {}

  function useDemo() {
    setType(DEMO.type)
    setTitle(DEMO.title)
    setCity(DEMO.city)
    setDate(nextWeekday(6))
    setGuests(DEMO.guestCount)
    setBudget(DEMO.budgetINR)
    setStyle(DEMO.style)
    setPlace(DEMO.indoorOutdoor)
    setConstraints(DEMO.constraints)
    setStep(GROUP_COUNT - 1)
  }

  const toggleStyle = (value: EventStyle) =>
    setStyle((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    )

  // Group 0 needs a name, a city and a date before it can collapse.
  const groupOneReady = Boolean(title.trim() && city.trim() && date)

  return (
    <form action={formAction} className="mx-auto w-full max-w-[720px] p-6 lg:p-8">
      <h2 className="display text-[40px]">Let&rsquo;s plan your celebration.</h2>
      <p className="mt-2 text-[16px] text-ink-muted">
        A few questions at a time. You can change any answer later, and the plan recalculates.
      </p>

      {/* Values live in state; these carry them to the server action. */}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="guestCount" value={guestCount} />
      <input type="hidden" name="budgetINR" value={budgetINR} />
      <input type="hidden" name="indoorOutdoor" value={indoorOutdoor} />
      <input type="hidden" name="constraints" value={constraints} />
      {style.map((s) => (
        <input key={s} type="hidden" name="style" value={s} />
      ))}

      <ol className="mt-6 flex flex-col gap-3">
        {/* ---------------------------------------------------- group one */}
        {step > 0 ? (
          <SummaryRow
            icon={CalendarDays}
            label={`${TYPES.find((t) => t.value === type)?.label} · ${title || 'Untitled'} · ${city} · ${date}`}
            onEdit={() => setStep(0)}
          />
        ) : (
          <GroupCard step={1} heading="What are we planning?">
            <Field label="Event type">
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <Pill
                    key={t.value}
                    on={type === t.value}
                    onClick={() => setType(t.value)}
                    role="radio"
                  >
                    {t.label}
                  </Pill>
                ))}
              </div>
            </Field>

            <Field label="What is the occasion called?" htmlFor="title" error={errors.title}>
              <input
                id="title"
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Aarav's 30th Birthday"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" htmlFor="city" error={errors.city}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                    <Icon icon={MapPin} />
                  </span>
                  <input
                    id="city"
                    className={`${inputCls} pl-10`}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Hyderabad"
                  />
                </div>
              </Field>

              <Field label="Date" htmlFor="date" error={errors.date}>
                <input
                  id="date"
                  type="date"
                  className={inputCls}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setDate(nextWeekday(6))}
                  className="tx mt-2 inline-flex min-h-11 items-center rounded-xl border border-line px-3 text-[14px] font-medium hover:bg-sunk"
                >
                  Next Saturday
                </button>
              </Field>
            </div>

            <Button onClick={() => setStep(1)} disabled={!groupOneReady} full>
              Continue
            </Button>
          </GroupCard>
        )}

        {/* ---------------------------------------------------- group two */}
        {step > 1 ? (
          <SummaryRow
            icon={Users}
            label={`${guestCount} guests · ${inr(budgetINR)} · ${indoorOutdoor}`}
            onEdit={() => setStep(1)}
          />
        ) : step === 1 ? (
          <GroupCard step={2} heading="How big, and how much?">
            <Field label="Guest count" error={errors.guestCount}>
              <Stepper value={guestCount} onChange={setGuests} min={1} max={5000} noun="guests" />
            </Field>

            <Field label="Budget" htmlFor="budget" error={errors.budgetINR}>
              <input
                id="budget"
                inputMode="numeric"
                className={inputCls}
                value={budgetINR ? budgetINR.toLocaleString('en-IN') : ''}
                onChange={(e) => setBudget(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {BUDGET_CHIPS.map((amount) => (
                  <Pill key={amount} on={budgetINR === amount} onClick={() => setBudget(amount)}>
                    {inr(amount)}
                  </Pill>
                ))}
              </div>
            </Field>

            <Field label="Indoor or outdoor">
              <Segmented
                label="Indoor or outdoor"
                value={indoorOutdoor}
                onChange={setPlace}
                options={[
                  { value: 'indoor', label: 'Indoor', icon: Building2 },
                  { value: 'outdoor', label: 'Outdoor', icon: Sun },
                  { value: 'either', label: 'Either', icon: Sparkles },
                ]}
              />
            </Field>

            <Button onClick={() => setStep(2)} disabled={budgetINR <= 0} full>
              Continue
            </Button>
          </GroupCard>
        ) : null}

        {/* -------------------------------------------------- group three */}
        {step === 2 && (
          <GroupCard step={3} heading="What should it feel like?">
            <Field label="Style" error={errors.style}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Style">
                {STYLES.map((s) => (
                  <Pill key={s.value} on={style.includes(s.value)} onClick={() => toggleStyle(s.value)}>
                    {s.label}
                  </Pill>
                ))}
              </div>
            </Field>

            <Field
              label="Anything we must work around?"
              htmlFor="constraints"
              hint="For example: vegetarian only, no alcohol, parking needed."
            >
              <textarea
                id="constraints"
                rows={3}
                className={`${inputCls} min-h-24 py-2`}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
              />
            </Field>

            <Button type="submit" disabled={pending || style.length === 0} full icon={Cake}>
              {pending ? 'Building your plan…' : 'Build my event plan'}
            </Button>
          </GroupCard>
        )}
      </ol>

      {state.status === 'error' && (
        <p role="alert" className="mt-4 text-[14px] font-medium text-danger">
          {state.message}
        </p>
      )}

      <p className="mt-4 text-center">
        <button
          type="button"
          onClick={useDemo}
          className="tx min-h-11 rounded-xl px-3 text-[14px] font-semibold text-accent hover:bg-accent-soft"
        >
          Use the demo brief
        </button>
      </p>
    </form>
  )
}

/* ------------------------------------------------------------- fragments */

function GroupCard({
  step,
  heading,
  children,
}: {
  step: number
  heading: string
  children: React.ReactNode
}) {
  return (
    <li className="rise">
      <Card className="p-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
          Step {step} of {GROUP_COUNT}
        </p>
        <h3 className="mt-1 text-[20px] font-semibold">{heading}</h3>
        <div className="mt-4 flex flex-col gap-4">{children}</div>
      </Card>
    </li>
  )
}

function SummaryRow({
  icon,
  label,
  onEdit,
}: {
  icon: typeof Users
  label: string
  onEdit: () => void
}) {
  return (
    <li>
      <div className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-sunk px-3 py-2">
        <Icon icon={icon} className="text-ink-muted" />
        <span className="flex-1 truncate text-[14px]">{label}</span>
        <button
          type="button"
          onClick={onEdit}
          className="tx inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-[14px] font-medium text-accent hover:bg-accent-soft"
        >
          <Icon icon={Pencil} size={16} />
          Edit
        </button>
      </div>
    </li>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-[14px] text-ink-muted">{hint}</p>}
      {/* Errors sit under the field they belong to, never collected at the top. */}
      {error && (
        <p role="alert" className="mt-1 text-[14px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function Pill({
  on,
  onClick,
  role,
  children,
}: {
  on: boolean
  onClick: () => void
  role?: 'radio'
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role={role}
      aria-pressed={role ? undefined : on}
      aria-checked={role ? on : undefined}
      onClick={onClick}
      className={`tx inline-flex min-h-11 items-center rounded-xl border px-4 text-[14px] font-semibold ${
        on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:bg-sunk'
      }`}
    >
      {children}
    </button>
  )
}
