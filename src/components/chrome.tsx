'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Check,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  PackageCheck,
  Search,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Icon } from './ui'
import { IconButton } from './controls'

/**
 * Ported from the reference's chrome.tsx. The reference shipped separate
 * DesktopShell and MobileShell components because it rendered fixed-size
 * frames; here one responsive shell swaps the left rail for a bottom tab bar
 * below the lg breakpoint.
 */

export type StepId = 'brief' | 'research' | 'command' | 'whatif' | 'execution'

const STEPS: { id: StepId; label: string; short: string; href: string; icon: LucideIcon }[] = [
  { id: 'brief', label: 'Brief', short: 'Brief', href: '/brief', icon: ClipboardList },
  { id: 'research', label: 'Research', short: 'Research', href: '/research', icon: Search },
  {
    id: 'command',
    label: 'Command Center',
    short: 'Command',
    href: '/command',
    icon: LayoutDashboard,
  },
  { id: 'whatif', label: 'What-If', short: 'What-If', href: '/whatif', icon: FlaskConical },
  {
    id: 'execution',
    label: 'Execution Pack',
    short: 'Pack',
    href: '/execution',
    icon: PackageCheck,
  },
]

function useCurrentStep(): number {
  const pathname = usePathname()
  const i = STEPS.findIndex((s) => pathname.startsWith(s.href))
  return i === -1 ? 0 : i
}

export type EventSummary = {
  title: string
  dateLabel: string
  city: string
  guests: number
  remainingLabel: string
  draft?: boolean
}

/* ----------------------------------------------------------------- pieces */

function Rail({ current }: { current: number }) {
  return (
    <nav
      aria-label="Planning steps"
      className="hidden h-full w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex"
    >
      <div className="flex h-16 items-center gap-2 border-b border-line px-6">
        <span className="grid size-8 place-items-center rounded-lg bg-ink text-[14px] font-semibold text-white">
          PP
        </span>
        <span className="text-[16px] font-semibold tracking-tight">PlanPilot AI</span>
      </div>
      <ol className="flex flex-col gap-1 p-3">
        {STEPS.map((s, i) => {
          const done = i < current
          const on = i === current
          return (
            <li key={s.id}>
              <Link
                href={s.href}
                aria-current={on ? 'step' : undefined}
                className={`tx relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] ${
                  on ? 'bg-accent-soft font-semibold text-accent' : 'text-ink hover:bg-sunk'
                }`}
              >
                {on && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-accent" />}
                <Icon icon={s.icon} />
                <span className="flex-1">{s.label}</span>
                {done && (
                  <span className="grid size-5 place-items-center rounded-full bg-ok text-white">
                    <Check size={16} strokeWidth={2} aria-hidden />
                    <span className="sr-only">Done</span>
                  </span>
                )}
                {on && <span className="sr-only">Current step</span>}
              </Link>
            </li>
          )
        })}
      </ol>
      <p className="mt-auto border-t border-line p-6 text-[14px] text-ink-muted">
        Step {current + 1} of 5 · {STEPS[current].label}
      </p>
    </nav>
  )
}

function BottomNav({ current }: { current: number }) {
  return (
    <nav
      aria-label="Planning steps"
      className="shrink-0 border-t border-line bg-surface pb-[max(8px,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ol className="flex">
        {STEPS.map((s, i) => {
          const on = i === current
          return (
            <li key={s.id} className="flex-1">
              <Link
                href={s.href}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[12px] ${
                  on ? 'font-semibold text-accent' : 'text-ink-muted'
                }`}
              >
                {on && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-accent" />}
                <Icon icon={s.icon} />
                {s.short}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function TopBar({ event }: { event: EventSummary }) {
  return (
    <header className="shrink-0 border-b border-line bg-surface px-4 py-3 lg:flex lg:h-16 lg:items-center lg:gap-6 lg:px-8 lg:py-0">
      <h1 className="text-[16px] font-semibold">
        {event.draft ? 'New event (draft)' : event.title}
      </h1>
      {/* Stacked summary line on small screens, inline stats from lg up. */}
      <p className="text-[14px] text-ink-muted lg:hidden">
        {event.dateLabel} · {event.city} · {event.guests} guests ·{' '}
        <span className="font-semibold text-ink">{event.remainingLabel} left</span>
      </p>
      <dl className="hidden items-center gap-6 text-[14px] text-ink-muted lg:flex">
        <Stat k="Date" v={event.dateLabel} />
        <Stat k="City" v={event.city} />
        <Stat k="Guests" v={String(event.guests)} />
        <Stat k="Remaining" v={event.remainingLabel} strong />
      </dl>
    </header>
  )
}

function Stat({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt>{k}</dt>
      <dd className={strong ? 'font-semibold text-ink' : 'text-ink'}>{v}</dd>
    </div>
  )
}

export function OfflineBanner() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-3 border-b border-warn-fill bg-warn-fill/15 pl-4 text-[14px] font-medium text-warn lg:px-8"
    >
      <Icon icon={WifiOff} />
      <span className="flex-1 py-2">Sample data — not live</span>
      <IconButton
        icon={X}
        label="Dismiss sample data notice"
        onClick={() => setOpen(false)}
        className="text-warn"
      />
    </div>
  )
}

/* ------------------------------------------------------------------ shell */

export function Shell({
  event,
  sampleData,
  children,
}: {
  event: EventSummary
  sampleData?: boolean
  children: ReactNode
}) {
  const current = useCurrentStep()
  return (
    <div className="flex min-h-dvh bg-canvas">
      <Rail current={current} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar event={event} />
        {sampleData && <OfflineBanner />}
        <main id="main" className="min-h-0 flex-1">
          {children}
        </main>
        <BottomNav current={current} />
      </div>
    </div>
  )
}
