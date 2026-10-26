import { useState, type ReactNode } from 'react'
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
import { EVENT, inr } from './data'
import { Icon, IconButton } from './ui'

export type StepId = 'brief' | 'research' | 'command' | 'whatif' | 'execution'

const STEPS: { id: StepId; label: string; short: string; icon: LucideIcon }[] = [
  { id: 'brief', label: 'Brief', short: 'Brief', icon: ClipboardList },
  { id: 'research', label: 'Research', short: 'Research', icon: Search },
  { id: 'command', label: 'Command Center', short: 'Command', icon: LayoutDashboard },
  { id: 'whatif', label: 'What-If', short: 'What-If', icon: FlaskConical },
  { id: 'execution', label: 'Execution Pack', short: 'Pack', icon: PackageCheck },
]

const FRAME: Record<StepId, { d: string; m?: string }> = {
  brief: { d: '01-brief-desktop', m: '06-brief-mobile' },
  research: { d: '02-research-desktop' },
  command: { d: '03-command-desktop', m: '07-command-mobile' },
  whatif: { d: '04-whatif-desktop', m: '08-whatif-mobile' },
  execution: { d: '05-execution-desktop' },
}

const idx = (s: StepId) => STEPS.findIndex((x) => x.id === s)

export function Rail({ current }: { current: StepId }) {
  const ci = idx(current)
  return (
    <nav aria-label="Planning steps" className="flex h-full w-60 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-16 items-center gap-2 border-b border-line px-6">
        <span className="grid size-8 place-items-center rounded-lg bg-ink text-[14px] font-semibold text-white">
          PP
        </span>
        <span className="text-[16px] font-semibold tracking-tight">PlanPilot AI</span>
      </div>
      <ol className="flex flex-col gap-1 p-3">
        {STEPS.map((s, i) => {
          const done = i < ci
          const on = i === ci
          return (
            <li key={s.id}>
              <a
                href={`#${FRAME[s.id].d}`}
                aria-current={on ? 'step' : undefined}
                className={`tx relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] ${on ? 'bg-accent-soft font-semibold text-accent' : 'text-ink hover:bg-sunk'}`}
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
              </a>
            </li>
          )
        })}
      </ol>
      <p className="mt-auto border-t border-line p-6 text-[14px] text-ink-muted">
        Step {ci + 1} of 5 · {STEPS[ci].label}
      </p>
    </nav>
  )
}

export function TopBar({ draft }: { draft?: boolean }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-6 border-b border-line bg-surface px-8">
      <h1 className="text-[16px] font-semibold">{draft ? 'New event (draft)' : EVENT.title}</h1>
      <dl className="flex items-center gap-6 text-[14px] text-ink-muted">
        <Stat k="Date" v={`${EVENT.date}, ${EVENT.time}`} />
        <Stat k="City" v={EVENT.city} />
        <Stat k="Guests" v={String(EVENT.guests)} />
        <Stat k="Remaining" v={draft ? inr(EVENT.budget) : inr(EVENT.remaining)} strong />
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
      className="flex shrink-0 items-center gap-3 border-b border-warn-fill bg-warn-fill/15 px-8 text-[14px] font-medium text-warn"
    >
      <Icon icon={WifiOff} />
      <span className="flex-1 py-2">Sample data — not live</span>
      <IconButton icon={X} label="Dismiss offline notice" onClick={() => setOpen(false)} className="text-warn" />
    </div>
  )
}

export function DesktopShell({
  current,
  banner,
  draft,
  children,
}: {
  current: StepId
  banner?: boolean
  draft?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex h-full bg-canvas">
      <Rail current={current} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar draft={draft} />
        {banner && <OfflineBanner />}
        <main className="no-sb relative min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

export function MobileShell({
  current,
  banner,
  draft,
  children,
}: {
  current: StepId
  banner?: boolean
  draft?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const ci = idx(current)
  return (
    <div className="relative flex h-full flex-col bg-canvas">
      <header className="shrink-0 border-b border-line bg-surface px-4 py-3">
        <h1 className="text-[16px] font-semibold">{draft ? 'New event (draft)' : EVENT.title}</h1>
        <p className="text-[14px] text-ink-muted">
          {EVENT.date} · {EVENT.city} · {EVENT.guests} guests ·{' '}
          <span className="font-semibold text-ink">{draft ? inr(EVENT.budget) : inr(EVENT.remaining)} left</span>
        </p>
      </header>
      {banner && open && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-2 border-b border-warn-fill bg-warn-fill/15 pl-4 text-[14px] font-medium text-warn"
        >
          <Icon icon={WifiOff} />
          <span className="flex-1">Sample data — not live</span>
          <IconButton icon={X} label="Dismiss offline notice" onClick={() => setOpen(false)} className="text-warn" />
        </div>
      )}
      <main className="no-sb min-h-0 flex-1 overflow-y-auto pb-24">{children}</main>
      <nav
        aria-label="Planning steps"
        className="absolute inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[max(8px,env(safe-area-inset-bottom))]"
      >
        <ol className="flex">
          {STEPS.map((s, i) => {
            const on = i === ci
            return (
              <li key={s.id} className="flex-1">
                <a
                  href={FRAME[s.id].m ? `#${FRAME[s.id].m}` : '#'}
                  aria-current={on ? 'page' : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[12px] ${on ? 'font-semibold text-accent' : 'text-ink-muted'}`}
                >
                  {on && <span className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-accent" />}
                  <Icon icon={s.icon} />
                  {s.short}
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
