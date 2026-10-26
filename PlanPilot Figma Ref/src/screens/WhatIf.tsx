import { useState } from 'react'
import {
  Armchair,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Cake,
  Equal,
  MailOpen,
  Armchair as Seat,
  OctagonAlert,
  Trees,
  TriangleAlert,
  UtensilsCrossed,
  Users,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import { DesktopShell, MobileShell } from '../chrome'
import { inr, num } from '../data'
import { Button, Card, Icon, Label, Segmented, Stepper, Switch, inputCls } from '../ui'

type Row = { label: string; sub?: string; cur: number | string; next?: number | string; money?: boolean }

const ROWS: Row[] = [
  { label: 'Venue choice', cur: 'Olive Bistro Rooftop' },
  { label: 'Venue booking', cur: 4000, money: true },
  { label: 'Catering', sub: '40 to 55 plates', cur: 8950, next: 12150, money: true },
  { label: 'Beverages', sub: 'Bulk pack pricing', cur: 1900, next: 1000, money: true },
  { label: 'Decor package', cur: 1500, money: true },
  { label: 'Colour palette', cur: 'Ivory and marigold' },
  { label: 'Cake size', sub: '1.5 kg to 2.5 kg', cur: 1200, next: 2000, money: true },
  { label: 'Cake flavour', cur: 'Dark chocolate truffle' },
  { label: 'Rentals and seating', sub: 'Chairs and tables for 55', cur: 450, next: 1850, money: true },
  { label: 'Invitations', sub: '40 to 55 invites', cur: 400, next: 1200, money: true },
]

const fmt = (v: number | string, money?: boolean) => (money && typeof v === 'number' ? inr(v) : String(v))

function Delta({ d }: { d: number }) {
  const up = d > 0
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[999px] border bg-surface px-2 py-1 text-[12px] font-semibold leading-4 ${up ? 'border-danger text-danger' : 'border-ok text-ok'}`}
    >
      <Icon icon={up ? ArrowUp : ArrowDown} size={16} />
      {up ? '+' : '-'}
      {inr(Math.abs(d))}
    </span>
  )
}

function Levers({ guests, setGuests, mobile }: { guests: number; setGuests: (n: number) => void; mobile: boolean }) {
  const [budget, setBudget] = useState(25000)
  const [setting, setSetting] = useState<'Indoor' | 'Outdoor'>('Outdoor')
  const [rain, setRain] = useState(false)
  const preset = (on: boolean, onClick: () => void, text: string) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`tx inline-flex min-h-11 items-center rounded-[999px] border px-4 text-[14px] font-semibold ${on ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:bg-canvas'}`}
    >
      {text}
    </button>
  )
  return (
    <div className={`border-b border-line bg-sunk ${mobile ? 'px-4 py-4' : 'px-8 py-4'}`}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <Label>Guests</Label>
          <div className="flex items-center gap-2">
            <span className="min-w-8 text-center text-[16px] text-ink-muted">40</span>
            <Icon icon={ArrowRight} className="text-ink-muted" />
            <Stepper value={guests} onChange={setGuests} noun="guests" />
          </div>
        </div>
        {!mobile && (
          <>
            <div className="w-40">
              <Label htmlFor="lever-budget">Budget</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-[10px] text-ink-muted">Rs</span>
                <input
                  id="lever-budget"
                  inputMode="numeric"
                  className={`${inputCls} pl-10`}
                  value={num(budget)}
                  onChange={(e) => setBudget(Number(e.target.value.replace(/\D/g, '')) || 0)}
                />
              </div>
            </div>
            <div className="w-44">
              <Label htmlFor="lever-city">City</Label>
              <select id="lever-city" className={inputCls} defaultValue="Hyderabad">
                {['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Pune'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="w-56">
              <Label>Setting</Label>
              <Segmented
                label="Indoor or outdoor"
                value={setting}
                onChange={setSetting}
                options={[
                  { value: 'Indoor', label: 'Indoor', icon: Armchair },
                  { value: 'Outdoor', label: 'Outdoor', icon: Trees },
                ]}
              />
            </div>
          </>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-[14px] font-medium">Presets</span>
        {preset(guests === 55, () => setGuests(55), '+15 guests')}
        {preset(rain, () => setRain(!rain), 'Rain on the day')}
        {preset(budget === 20000, () => setBudget(20000), 'Cut budget 20%')}
      </div>
    </div>
  )
}

function Trace({ guests }: { guests: number }) {
  const kids: [LucideIcon, string, string][] = [
    [UtensilsCrossed, 'Catering', '+Rs 3,200'],
    [Seat, 'Seating', '+Rs 1,400'],
    [Cake, 'Cake size', '+Rs 800'],
    [MailOpen, 'Invitations', '+Rs 800'],
  ]
  return (
    <Card className="p-6">
      <h3 className="text-[16px] font-semibold">Dependency trace</h3>
      <p className="mt-2 flex items-center gap-2 text-[14px] font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon icon={Users} />
        </span>
        Guests 40 to {guests}
      </p>
      <ul className="ml-4 mt-1 border-l-2 border-accent">
        {kids.map(([ic, t, d]) => (
          <li
            key={t}
            className="relative flex items-center gap-2 py-2 pl-8 text-[14px] before:absolute before:left-0 before:top-1/2 before:h-0.5 before:w-6 before:bg-accent"
          >
            <Icon icon={ic} size={16} className="text-ink-muted" />
            <span className="flex-1">{t}</span>
            <span className="font-semibold">{d}</span>
          </li>
        ))}
        <li className="relative flex items-center gap-2 py-2 pl-8 text-[14px] before:absolute before:left-0 before:top-1/2 before:h-0.5 before:w-6 before:bg-accent">
          <Icon icon={Building2} size={16} className="text-ink-muted" />
          <span className="flex-1">Venue capacity</span>
          <span className="flex items-center gap-1 font-semibold text-danger">
            <Icon icon={OctagonAlert} size={16} />
            Exceeded
          </span>
        </li>
      </ul>
    </Card>
  )
}

function Impact({ guests }: { guests: number }) {
  return (
    <div className="flex flex-col gap-4">
      <Trace guests={guests} />
      <Card className="p-6">
        <h3 className="text-[16px] font-semibold">Warnings</h3>
        <ul className="mt-2 flex flex-col gap-2">
          <li className="rounded-xl border border-line border-l-4 border-l-danger p-3 text-[14px]">
            <p className="flex items-center gap-1 font-semibold text-danger">
              <Icon icon={OctagonAlert} size={16} />
              Blocker
            </p>
            <p>Venue capacity is 50 — now exceeded by {Math.max(0, guests - 50)}.</p>
          </li>
          <li className="rounded-xl border border-line border-l-4 border-l-warn-fill p-3 text-[14px]">
            <p className="flex items-center gap-1 font-semibold text-warn">
              <Icon icon={TriangleAlert} size={16} />
              Warning
            </p>
            <p>Seating for {guests} needs 4 more tables. Rentals must confirm by Thu 30 Oct.</p>
          </li>
        </ul>
      </Card>
      <Card className="p-6">
        <h3 className="text-[16px] font-semibold">Readiness</h3>
        <div className="mt-2 flex items-center gap-4">
          <span className="display text-[40px] text-ink-muted">72</span>
          <Icon icon={ArrowDown} size={24} className="text-danger" />
          <span className="display text-[40px]">65</span>
          <span className="text-[14px] font-semibold text-danger">Down 7</span>
        </div>
      </Card>
    </div>
  )
}

function CompareRow({ r }: { r: Row }) {
  const changed = r.next !== undefined
  const d = changed && typeof r.next === 'number' && typeof r.cur === 'number' ? r.next - r.cur : 0
  return (
    <li
      className={`relative grid grid-cols-[1.1fr_1fr_1.5fr] items-center gap-4 px-4 py-3 ${changed ? 'bg-accent-soft' : 'bg-surface text-ink-muted'}`}
    >
      {changed && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
      <div className="text-[14px]">
        <p className={changed ? 'font-semibold text-ink' : 'font-medium'}>{r.label}</p>
        {r.sub && <p className="text-ink-muted">{r.sub}</p>}
      </div>
      <p className="text-[14px]">{fmt(r.cur, r.money)}</p>
      {changed ? (
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <Icon icon={ArrowRight} className="text-accent" />
          <span className="font-semibold text-ink">{fmt(r.next!, r.money)}</span>
          <Delta d={d} />
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[14px]">
          <Icon icon={Equal} />
          {fmt(r.cur, r.money)} · Unchanged
        </p>
      )}
    </li>
  )
}

function Footer({ mobile }: { mobile: boolean }) {
  return (
    <div
      className={`sticky z-20 flex items-center justify-between gap-4 border-t border-line bg-surface ${mobile ? 'bottom-16 flex-wrap px-4 py-3' : 'bottom-0 px-8 py-3'}`}
    >
      <p className="text-[14px] text-ink-muted">
        Total before <span className="font-semibold text-ink">{inr(18400)}</span>
        <span className="mx-2">→</span>
        after <span className="font-semibold text-ink">{inr(23700)}</span>
        <span className="ml-2 font-semibold text-danger">+{inr(5300)}</span>
      </p>
      <div className={`flex gap-2 ${mobile ? 'w-full' : ''}`}>
        <Button variant="ghost" className={mobile ? 'flex-1' : ''}>
          Reject
        </Button>
        <Button className={mobile ? 'flex-1' : ''}>Accept changes</Button>
      </div>
    </div>
  )
}

export default function WhatIf({ mobile = false }: { mobile?: boolean }) {
  const [guests, setGuests] = useState(55)
  const [only, setOnly] = useState(false)
  const [view, setView] = useState<'Current' | 'Proposed'>('Proposed')
  const rows = only ? ROWS.filter((r) => r.next !== undefined) : ROWS

  if (mobile)
    return (
      <MobileShell current="whatif">
        <Levers guests={guests} setGuests={setGuests} mobile />
        <div className="sticky top-0 z-10 flex flex-col gap-1 border-b border-line bg-canvas px-4 py-2">
          <Segmented
            label="Plan view"
            value={view}
            onChange={setView}
            options={[
              { value: 'Current', label: 'Current' },
              { value: 'Proposed', label: 'Proposed' },
            ]}
          />
          <Switch checked={only} onChange={setOnly} label="Only changes" />
        </div>
        <ul className="flex flex-col gap-2 p-4">
          {rows.map((r) => {
            const changed = r.next !== undefined
            const d = changed && typeof r.next === 'number' && typeof r.cur === 'number' ? r.next - r.cur : 0
            const shown = view === 'Proposed' && changed ? r.next! : r.cur
            return (
              <li
                key={r.label}
                className={`relative rounded-xl border p-3 text-[14px] ${changed ? 'border-accent/30 bg-accent-soft' : 'border-line bg-surface text-ink-muted'}`}
              >
                {changed && <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl bg-accent" />}
                <div className="flex items-center justify-between gap-2">
                  <p className={changed ? 'font-semibold text-ink' : 'font-medium'}>{r.label}</p>
                  {changed ? (
                    <span className="font-semibold text-ink">{fmt(shown, r.money)}</span>
                  ) : (
                    <span>{fmt(shown, r.money)}</span>
                  )}
                </div>
                {changed && view === 'Proposed' && (
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-ink-muted">was {fmt(r.cur, r.money)}</span>
                    <Icon icon={ArrowRight} size={16} className="text-accent" />
                    <Delta d={d} />
                  </p>
                )}
                {changed && view === 'Current' && r.sub && <p className="text-ink-muted">Changes: {r.sub}</p>}
                {!changed && (
                  <p className="mt-1 flex items-center gap-1">
                    <Icon icon={Equal} size={16} />
                    Unchanged
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        <div className="px-4 pb-4">
          <Impact guests={guests} />
        </div>
        <Footer mobile />
      </MobileShell>
    )

  return (
    <DesktopShell current="whatif">
      <div className="sticky top-0 z-10">
        <Levers guests={guests} setGuests={setGuests} mobile={false} />
      </div>
      <div className="grid grid-cols-[1fr_360px] items-start gap-6 px-8 py-6">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-6 pb-3">
            <div>
              <h2 className="display text-[28px]">What-If Lab</h2>
              <p className="text-[14px] text-ink-muted">5 lines changed · 5 lines untouched</p>
            </div>
            <Switch checked={only} onChange={setOnly} label="Only changes" />
          </div>
          <div className="grid grid-cols-[1.1fr_1fr_1.5fr] gap-4 border-y border-line bg-sunk px-4 py-2 text-[14px] font-medium text-ink-muted">
            <span>Line item</span>
            <span>Current plan</span>
            <span>Proposed plan</span>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <CompareRow key={r.label} r={r} />
            ))}
          </ul>
        </Card>
        <Impact guests={guests} />
      </div>
      <Footer mobile={false} />
    </DesktopShell>
  )
}
