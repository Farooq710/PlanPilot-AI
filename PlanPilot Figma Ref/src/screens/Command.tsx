import { useState, type ReactNode } from 'react'
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  GripVertical,
  Link2,
  ListChecks,
  OctagonAlert,
  Search,
  Timer,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { DesktopShell, MobileShell } from '../chrome'
import { CATS, EVENT, catMeta, inr, num, type Cat } from '../data'
import { Button, Card, EvidenceChip, Icon, ProgressBar, Segmented, Switch, Tag } from '../ui'

const H = ({ children }: { children: ReactNode }) => <h3 className="text-[20px] font-semibold">{children}</h3>

/* ---------- Readiness ---------- */
function Gauge({ v }: { v: number }) {
  const R = 90
  const pt = (val: number, r: number) => {
    const t = Math.PI * (1 - val / 100)
    return [110 + r * Math.cos(t), 110 - r * Math.sin(t)]
  }
  const fill = v < 50 ? 'var(--color-danger)' : v < 75 ? 'var(--color-warn-fill)' : 'var(--color-ok)'
  const word = v < 50 ? 'Blocked' : v < 75 ? 'At risk' : 'On track'
  return (
    <div className="relative mx-auto w-64">
      <svg viewBox="0 0 220 120" role="img" aria-label={`Readiness ${v} out of 100, ${word}`}>
        <path d="M 20 110 A 90 90 0 0 1 200 110" pathLength={100} fill="none" stroke="var(--color-line)" strokeWidth={22} />
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          pathLength={100}
          fill="none"
          stroke={fill}
          strokeWidth={22}
          strokeDasharray={`${v} 100`}
        />
        {[50, 75].map((t) => {
          const [x1, y1] = pt(t, R - 14)
          const [x2, y2] = pt(t, R + 14)
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-surface)" strokeWidth={3} />
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center leading-none">
        <span className="display text-[40px]">{v}</span>
      </div>
      <div className="mt-2 flex flex-col items-center gap-2">
        <span className="text-[14px] font-medium text-ink-muted">Readiness</span>
        <Tag tone="warn" icon={TriangleAlert}>
          {word} · amber from 50 to 74
        </Tag>
      </div>
    </div>
  )
}

const DEDUCT = [
  ['-15', 'Weather risk unresolved'],
  ['-8', 'Venue not confirmed'],
  ['-5', '4 tasks overdue'],
]

function Readiness() {
  return (
    <Card className="p-6">
      <Gauge v={EVENT.readiness} />
      <ul className="mt-4 divide-y divide-line">
        {DEDUCT.map(([d, t]) => (
          <li key={t} className="flex items-center gap-3 py-1">
            <span className="w-10 text-[14px] font-semibold text-danger">{d}</span>
            <span className="flex-1 text-[14px]">{t}</span>
            <Button variant="outline" className="!border-accent !text-accent">
              Fix next
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Kpi({
  icon,
  label,
  value,
  sub,
  pct,
}: {
  icon: typeof Wallet
  label: string
  value: ReactNode
  sub: string
  pct?: number
}) {
  return (
    <Card className="flex flex-1 flex-col justify-center gap-2 p-6">
      <div className="flex items-center gap-2 text-[14px] font-medium text-ink-muted">
        <Icon icon={icon} />
        {label}
      </div>
      <div className="display text-[28px]">{value}</div>
      {pct !== undefined && <ProgressBar label={label} value={pct} />}
      <p className="text-[14px] text-ink-muted">{sub}</p>
    </Card>
  )
}

function Kpis() {
  return (
    <div className="flex h-full flex-col gap-4">
      <Kpi
        icon={Wallet}
        label="Budget used"
        value={
          <>
            {inr(EVENT.spent)} <span className="text-[16px] font-normal text-ink-muted">of {inr(EVENT.budget)}</span>
          </>
        }
        pct={(EVENT.spent / EVENT.budget) * 100}
        sub="74% used · Rs 6,600 left"
      />
      <Kpi
        icon={ListChecks}
        label="Tasks"
        value={
          <>
            {EVENT.tasksDone} <span className="text-[16px] font-normal text-ink-muted">of {EVENT.tasksTotal}</span>
          </>
        }
        pct={(EVENT.tasksDone / EVENT.tasksTotal) * 100}
        sub="7 remaining · 4 overdue"
      />
      <Kpi icon={Timer} label="Days to event" value={EVENT.daysLeft} sub="Sat 1 Nov 2025, 7:00 PM" />
    </div>
  )
}

/* ---------- Budget ---------- */
function Donut({ hidden }: { hidden: Cat[] }) {
  const vis = CATS.filter((c) => !hidden.includes(c.name))
  const total = vis.reduce((a, c) => a + c.planned, 0)
  const r = 62
  const C = 2 * Math.PI * r
  let acc = 0
  const segs = vis.map((c) => {
    const len = (c.planned / total) * C
    const s = { c, len, off: acc, mid: (acc + len / 2) / C }
    acc += len
    return s
  })
  return (
    <div className="relative h-60 w-64 shrink-0" role="img" aria-label={`Planned budget split, total ${inr(total)}`}>
      <svg viewBox="0 0 256 240" className="size-full">
        <g transform="rotate(-90 128 120)">
          {segs.map(({ c, len, off }) => (
            <circle
              key={c.name}
              cx={128}
              cy={120}
              r={r}
              fill="none"
              stroke={c.color}
              strokeWidth={22}
              strokeDasharray={`${Math.max(len - 2, 0)} ${C}`}
              strokeDashoffset={-off}
            />
          ))}
        </g>
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-[120px] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-tight">
        <span className="text-[14px] text-ink-muted">Rs</span>
        <span className="display text-[28px]">{num(total)}</span>
      </div>
      {segs.map(({ c, mid }) => {
        const a = mid * 2 * Math.PI
        return (
          <span
            key={c.name}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 text-[14px] font-semibold"
            style={{ left: 128 + 94 * Math.sin(a), top: 120 - 94 * Math.cos(a) }}
          >
            <Icon icon={c.icon} size={16} />
            {num(c.planned)}
          </span>
        )
      })}
    </div>
  )
}

function Budget({ m }: { m: boolean }) {
  const [hidden, setHidden] = useState<Cat[]>([])
  const [table, setTable] = useState(false)
  const toggle = (n: Cat) => setHidden((h) => (h.includes(n) ? h.filter((x) => x !== n) : [...h, n]))
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-2">
        <H>Budget</H>
        <Switch checked={table} onChange={setTable} label="View as table" />
      </div>
      <p className="text-[14px] text-ink-muted">Planned split of {inr(EVENT.budget)}</p>
      <div className={`mt-2 flex items-center gap-2 ${m ? 'flex-col' : ''}`}>
        <Donut hidden={hidden} />
        <ul className={`grid gap-1 ${m ? 'w-full grid-cols-2' : 'flex-1'}`}>
          {CATS.map((c) => {
            const off = hidden.includes(c.name)
            return (
              <li key={c.name}>
                <button
                  type="button"
                  aria-pressed={!off}
                  onClick={() => toggle(c.name)}
                  className="tx flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left hover:bg-sunk"
                >
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-md border-2 text-white"
                    style={{ background: off ? 'transparent' : c.color, borderColor: c.color }}
                  >
                    {!off && <Icon icon={c.icon} size={16} />}
                  </span>
                  <span className={`text-[14px] leading-tight ${off ? 'line-through opacity-70' : ''}`}>
                    <span className="block font-medium">{c.name}</span>
                    <span className="block text-ink-muted">{num(c.planned)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <h4 className="mb-2 mt-4 text-[16px] font-semibold">Planned vs actual</h4>
      {table ? (
        <table className="w-full text-left text-[14px]">
          <thead className="bg-sunk text-ink-muted">
            <tr>
              <th className="px-2 py-2 font-medium">Category</th>
              <th className="px-2 py-2 text-right font-medium">Planned</th>
              <th className="px-2 py-2 text-right font-medium">Actual</th>
              <th className="px-2 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {CATS.map((c) => {
              const over = c.actual - c.planned
              return (
                <tr key={c.name}>
                  <td className="px-2 py-2">{c.name}</td>
                  <td className="px-2 py-2 text-right">{num(c.planned)}</td>
                  <td className="px-2 py-2 text-right">{num(c.actual)}</td>
                  <td className="px-2 py-2">
                    {over > 0 ? (
                      <Tag tone="danger" icon={TrendingUp}>
                        {inr(over)} over
                      </Tag>
                    ) : (
                      <Tag tone="ok" icon={CircleCheck}>
                        On budget
                      </Tag>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <ul className="flex flex-col gap-3">
          {CATS.map((c) => {
            const over = c.actual - c.planned
            const max = 12000
            return (
              <li key={c.name}>
                <div className="flex flex-wrap items-center justify-between gap-x-2 text-[14px]">
                  <span className="flex items-center gap-2 font-medium">
                    <Icon icon={c.icon} />
                    {c.name}
                  </span>
                  <span className="text-ink-muted">
                    <span className="font-semibold text-ink">{inr(c.actual)}</span> of {inr(c.planned)}
                  </span>
                </div>
                <div className="mt-1 flex flex-col gap-1" aria-hidden>
                  <div className="h-2 overflow-hidden rounded-full bg-sunk">
                    <div className="h-full origin-left bg-ink-muted/50" style={{ transform: `scaleX(${c.planned / max})` }} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sunk">
                    <div
                      className={`h-full origin-left ${over > 0 ? 'bg-danger' : 'bg-ink'}`}
                      style={{ transform: `scaleX(${c.actual / max})` }}
                    />
                  </div>
                </div>
                {over > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="danger" icon={TrendingUp}>
                      {inr(over)} over
                    </Tag>
                    <Button variant="text" className="!px-2">
                      See trade-offs
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-2 flex items-center gap-4 text-[14px] text-ink-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-4 rounded-full bg-ink-muted/50" /> Planned
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-4 rounded-full bg-ink" /> Actual
        </span>
      </p>
    </Card>
  )
}

/* ---------- Timeline ---------- */
type Ev = { t: string; time: string; cat: Cat }
const WEEK: { d: string; n: string; ev: Ev[]; today?: boolean; event?: boolean }[] = [
  { d: 'Sun', n: '26 Oct', today: true, ev: [{ t: 'Send invites to 40 guests', time: '10:00 AM', cat: 'Activities' }] },
  { d: 'Mon', n: '27 Oct', ev: [{ t: 'Sign Olive Bistro contract', time: '4:00 PM', cat: 'Venue' }] },
  { d: 'Tue', n: '28 Oct', ev: [{ t: 'Pay cake advance', time: '11:00 AM', cat: 'Cake' }] },
  {
    d: 'Wed',
    n: '29 Oct',
    ev: [
      { t: 'Final menu tasting', time: '1:00 PM', cat: 'Food' },
      { t: 'Decor walkthrough', time: '5:00 PM', cat: 'Decor' },
    ],
  },
  { d: 'Thu', n: '30 Oct', ev: [{ t: 'Rain plan decision', time: '12:00 PM', cat: 'Contingency' }] },
  { d: 'Fri', n: '31 Oct', ev: [{ t: 'Rentals delivery slot', time: '6:00 PM', cat: 'Decor' }] },
  {
    d: 'Sat',
    n: '1 Nov',
    event: true,
    ev: [
      { t: 'Venue setup', time: '4:00 PM', cat: 'Venue' },
      { t: 'Live counters start', time: '6:30 PM', cat: 'Food' },
      { t: 'Guests arrive', time: '7:00 PM', cat: 'Activities' },
      { t: 'Cake cutting', time: '9:00 PM', cat: 'Cake' },
    ],
  },
]

function Timeline() {
  return (
    <Card className="p-6">
      <H>Week to event</H>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
        {CATS.map((c) => (
          <li key={c.name} className="flex items-center gap-1">
            <span className="size-3 rounded-sm" style={{ background: c.color }} aria-hidden />
            <Icon icon={c.icon} size={16} />
            {c.name}
          </li>
        ))}
      </ul>
      <ol className="mt-4 flex flex-col gap-2">
        {WEEK.map((w) => (
          <li
            key={w.n}
            className={`relative flex gap-4 rounded-xl border px-4 py-2 ${w.event ? 'border-accent bg-accent-soft' : 'border-line'}`}
          >
            {w.event && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-accent" />}
            <div className="w-16 shrink-0 text-[14px]">
              <p className="font-semibold">{w.d}</p>
              <p className="text-ink-muted">{w.n}</p>
              {w.today && <p className="font-medium text-info">Today</p>}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {w.event && (
                <Tag tone="accent" icon={CalendarCheck}>
                  Event day
                </Tag>
              )}
              {w.ev.map((e) => {
                const meta = catMeta(e.cat)
                return (
                  <span
                    key={e.t}
                    className="flex items-center gap-2 rounded-lg border border-line border-l-4 bg-surface px-2 py-1 text-[14px]"
                    style={{ borderLeftColor: meta.color }}
                  >
                    <Icon icon={meta.icon} size={16} />
                    <span>{e.t}</span>
                    <span className="text-[12px] text-ink-muted">{e.time}</span>
                  </span>
                )
              })}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/* ---------- Kanban ---------- */
type Col = 'To do' | 'Doing' | 'Done'
type Task = { id: string; title: string; due: string; dep?: string; item: Cat; col: Col; overdue?: boolean }
const TASKS: Task[] = [
  { id: 'a', title: 'Confirm Olive Bistro booking', due: 'Sat 25 Oct', dep: 'after: Shortlist venue', item: 'Venue', col: 'To do', overdue: true },
  { id: 'b', title: 'Send invites to 40 guests', due: 'Fri 24 Oct', item: 'Activities', col: 'To do', overdue: true },
  { id: 'c', title: 'Finalise rain plan', due: 'Thu 30 Oct', dep: 'after: Weather check', item: 'Contingency', col: 'To do' },
  { id: 'd', title: 'Pay cake advance', due: 'Tue 28 Oct', dep: 'after: Pick flavour', item: 'Cake', col: 'Doing' },
  { id: 'e', title: 'Book sound system', due: 'Sat 25 Oct', item: 'Activities', col: 'Doing', overdue: true },
  { id: 'f', title: 'Collect decor sample', due: 'Fri 24 Oct', dep: 'after: Book decor', item: 'Decor', col: 'Doing', overdue: true },
  { id: 'g', title: 'Set budget and split', due: 'Mon 20 Oct', item: 'Contingency', col: 'Done' },
  { id: 'h', title: 'Book Bloom & Bough Decor', due: 'Wed 22 Oct', item: 'Decor', col: 'Done' },
  { id: 'i', title: 'Confirm Sampoorna Caterers', due: 'Thu 23 Oct', item: 'Food', col: 'Done' },
]
const COLS: Col[] = ['To do', 'Doing', 'Done']
const EXTRA: Record<Col, number> = { 'To do': 1, Doing: 0, Done: 9 }

function TaskCard({ t, move }: { t: Task; move: (id: string, c: Col) => void }) {
  const [open, setOpen] = useState(false)
  const meta = catMeta(t.item)
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
      className="relative rounded-xl border border-line bg-surface p-3 shadow-card"
    >
      <p className="text-[14px] font-semibold leading-snug">{t.title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-ink-muted">
        <span className="flex items-center gap-1">
          <Icon icon={CalendarDays} size={16} />
          {t.due}
        </span>
        {t.overdue && t.col !== 'Done' && (
          <Tag tone="danger" icon={CircleAlert}>
            Overdue
          </Tag>
        )}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {t.dep && (
          <span className="inline-flex items-center gap-1 rounded-[999px] border border-line bg-sunk px-2 py-1 text-[12px] leading-4">
            <Icon icon={Link2} size={16} />
            {t.dep}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-[999px] border border-line px-2 py-1 text-[12px] leading-4">
          <Icon icon={meta.icon} size={16} />
          Budget: {t.item}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-1">
        <span className="inline-flex size-11 cursor-grab items-center justify-center text-ink-muted" title="Drag to move">
          <Icon icon={GripVertical} />
          <span className="sr-only">Drag handle for {t.title}</span>
        </span>
        <div className="relative">
          <Button variant="ghost" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className="!px-2">
            Move to
            <Icon icon={ChevronDown} size={16} />
          </Button>
          {open && (
            <ul role="menu" className="absolute bottom-full right-0 z-30 mb-1 w-32 rounded-xl border border-line bg-surface p-1 shadow-raised">
              {COLS.map((c) => (
                <li key={c} role="none">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      move(t.id, c)
                      setOpen(false)
                    }}
                    className="tx flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-[14px] hover:bg-sunk"
                  >
                    {c}
                    {c === t.col && <Icon icon={Check} size={16} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Kanban({ m }: { m: boolean }) {
  const [tasks, setTasks] = useState(TASKS)
  const [tab, setTab] = useState<Col>('To do')
  const move = (id: string, col: Col) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, col } : t)))
  const cols = m ? [tab] : COLS
  const counts: Record<Col, number> = {
    'To do': tasks.filter((t) => t.col === 'To do').length + EXTRA['To do'],
    Doing: tasks.filter((t) => t.col === 'Doing').length,
    Done: tasks.filter((t) => t.col === 'Done').length + EXTRA.Done,
  }
  return (
    <Card className="p-6">
      <H>Tasks</H>
      <p className="text-[14px] text-ink-muted">
        {EVENT.tasksDone} of {EVENT.tasksTotal} done. Drag by the grip, or use Move to.
      </p>
      {m && (
        <Segmented
          label="Task column"
          className="mt-4"
          value={tab}
          onChange={setTab}
          options={COLS.map((c) => ({ value: c, label: `${c} ${counts[c]}` }))}
        />
      )}
      <div className={`mt-4 grid gap-3 ${m ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {cols.map((c) => (
          <section
            key={c}
            aria-label={c}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => move(e.dataTransfer.getData('text/plain'), c)}
            className="flex flex-col gap-2 rounded-xl bg-sunk p-2"
          >
            {!m && (
              <h4 className="px-1 pt-1 text-[14px] font-semibold">
                {c} <span className="font-normal text-ink-muted">· {counts[c]}</span>
              </h4>
            )}
            {tasks
              .filter((t) => t.col === c)
              .map((t) => (
                <TaskCard key={t.id} t={t} move={move} />
              ))}
            {EXTRA[c] > 0 && <p className="px-1 py-2 text-[14px] text-ink-muted">+{EXTRA[c]} more {c === 'Done' ? 'completed' : 'queued'}</p>}
          </section>
        ))}
      </div>
    </Card>
  )
}

/* ---------- Right stack ---------- */
function Shortlist() {
  return (
    <Card className="p-6">
      <H>Shortlist</H>
      <ul className="mt-2 divide-y divide-line">
        <li className="flex flex-col gap-2 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px]">
              <span className="font-semibold">Olive Bistro Rooftop</span> · {inr(12000)}
            </p>
            <Button>Confirm booking</Button>
          </div>
          <EvidenceChip kind="published" domain="olivebistro.in" fetched="2 min ago" />
        </li>
        <li className="flex flex-col gap-2 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px]">
              <span className="font-semibold">Sampoorna Caterers</span> · {inr(10850)}
            </p>
            <Tag tone="ok" icon={CircleCheck}>
              Confirmed
            </Tag>
          </div>
          <EvidenceChip kind="estimate" domain="sampoornacaterers.in" fetched="6 min ago" />
        </li>
        <li className="flex flex-col gap-2 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px]">
              <span className="font-semibold">Bloom & Bough Decor</span> · {inr(1950)}
            </p>
            <Tag tone="ok" icon={CircleCheck}>
              Confirmed
            </Tag>
          </div>
          <EvidenceChip kind="published" domain="bloomandbough.in" fetched="3 min ago" />
        </li>
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-sunk p-3">
        <p className="text-[14px]">No activities shortlisted yet. Search nearby options.</p>
        <Button variant="outline" icon={Search}>
          Search
        </Button>
      </div>
    </Card>
  )
}

const RISKS = [
  { sev: 'High', dot: 'bg-danger', name: 'Rain on the day', status: 'open', fix: 'Reserve the covered bar section and get a tent quote.' },
  { sev: 'Medium', dot: 'bg-warn-fill', name: 'Venue contract unsigned', status: 'open', fix: 'Sign by Mon 27 Oct to hold the terrace.' },
  { sev: 'Low', dot: 'bg-unknown', name: 'Caterer price is an estimate', status: 'unknown', fix: 'Ask for a written quote before the advance.' },
  { sev: 'Medium', dot: 'bg-warn-fill', name: 'Guest count above 45', status: 'mitigated', fix: 'Cap RSVPs at 45; venue seats 50.' },
]

function Risks() {
  return (
    <Card className="p-6">
      <H>Risks</H>
      <ul className="mt-2 divide-y divide-line">
        {RISKS.map((r) => (
          <li key={r.name} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 text-[14px] font-semibold">
                <span className={`size-3 rounded-full ${r.dot}`} aria-hidden />
                {r.sev}
              </span>
              <span className="flex-1 text-[14px]">{r.name}</span>
              {r.status === 'open' && (
                <Tag tone="warn" icon={OctagonAlert}>
                  Open
                </Tag>
              )}
              {r.status === 'mitigated' && (
                <Tag tone="ok" icon={CircleCheck}>
                  Mitigated
                </Tag>
              )}
              {r.status === 'unknown' && (
                <Tag tone="unknown" icon={CircleQuestionMark} dashed>
                  Unknown
                </Tag>
              )}
            </div>
            <p className="mt-1 text-[14px] text-ink-muted">{r.fix}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Activity() {
  const items = [
    ['Budget rebalanced after guest change', '2m ago'],
    ['Sampoorna Caterers marked Confirmed', '1h ago'],
    ['Cake advance task moved to Doing', '3h ago'],
    ['Weather refreshed from open-meteo.com', '4h ago'],
  ]
  return (
    <Card className="p-6">
      <H>Activity</H>
      <ul className="mt-2 divide-y divide-line">
        {items.map(([t, ago]) => (
          <li key={t} className="flex items-center justify-between gap-2 py-2 text-[14px]">
            <span>{t}</span>
            <span className="shrink-0 text-[12px] text-ink-muted">{ago}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Command({ mobile = false }: { mobile?: boolean }) {
  if (mobile)
    return (
      <MobileShell current="command" banner>
        <div className="flex flex-col gap-4 p-4">
          <h2 className="display text-[28px]">Command Center</h2>
          <Readiness />
          <Kpis />
          <Budget m />
          <Timeline />
          <Kanban m />
          <Shortlist />
          <Risks />
          <Activity />
        </div>
      </MobileShell>
    )
  return (
    <DesktopShell current="command" banner>
      <div className="grid grid-cols-12 gap-6 px-8 py-6">
        <h2 className="display col-span-12 text-[28px]">Command Center</h2>
        <div className="col-span-5">
          <Readiness />
        </div>
        <div className="col-span-7">
          <Kpis />
        </div>
        <div className="col-span-5">
          <Budget m={false} />
        </div>
        <div className="col-span-7">
          <Timeline />
        </div>
        <div className="col-span-7">
          <Kanban m={false} />
        </div>
        <div className="col-span-5 flex flex-col gap-6">
          <Shortlist />
          <Risks />
          <Activity />
        </div>
      </div>
    </DesktopShell>
  )
}
