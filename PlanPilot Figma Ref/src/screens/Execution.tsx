import { useEffect, useState, type ReactElement } from 'react'
import {
  CalendarPlus,
  Check,
  CircleCheck,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Printer,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { DesktopShell } from '../chrome'
import { CATS, EVENT, IMG, inr, num } from '../data'
import { Button, Card, EvidenceChip, Icon, Label, ProgressBar, inputCls, type EvidenceKind } from '../ui'

type Status = 'idle' | 'busy' | 'done'
type FileDef = { id: string; icon: LucideIcon; title: string; desc: string; meta: string; cta: string; init: Status; pct?: number }

const FILES: FileDef[] = [
  { id: 'ros', icon: FileText, title: 'Run-of-show PDF', desc: 'Hour-by-hour schedule for Saturday 1 November with vendor contacts.', meta: 'PDF · 1.2 MB', cta: 'Download PDF', init: 'idle' },
  { id: 'chk', icon: ListChecks, title: 'Vendor and task checklist', desc: 'All 19 tasks and 5 vendors with due dates and linked budget lines.', meta: 'PDF · 184 KB', cta: 'Download checklist', init: 'busy', pct: 64 },
  { id: 'csv', icon: FileSpreadsheet, title: 'Budget CSV', desc: 'Planned against actual for six categories, with a source for each figure.', meta: 'CSV · 6 KB', cta: 'Download CSV', init: 'done' },
  { id: 'ics', icon: CalendarPlus, title: 'Calendar .ics', desc: 'Prep milestones and the event day as entries for any calendar app.', meta: 'ICS · 4 KB', cta: 'Download .ics', init: 'idle' },
]

function DownloadCard({ f }: { f: FileDef }) {
  const [status, setStatus] = useState<Status>(f.init)
  const [pct, setPct] = useState(f.pct ?? 0)
  const [auto, setAuto] = useState(false)

  useEffect(() => {
    if (!auto || status !== 'busy') return
    const t = setInterval(() => {
      setPct((p) => {
        if (p >= 100) return 100
        return Math.min(100, p + 14)
      })
    }, 350)
    return () => clearInterval(t)
  }, [auto, status])
  useEffect(() => {
    if (auto && pct >= 100) setStatus('done')
  }, [auto, pct])

  const start = () => {
    setPct(0)
    setAuto(true)
    setStatus('busy')
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Icon icon={f.icon} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[20px] font-semibold leading-snug">{f.title}</h3>
          <p className="mt-1 text-[14px] text-ink-muted">{f.desc}</p>
        </div>
      </div>
      <p className="text-[14px] font-medium">{f.meta}</p>
      {status === 'idle' && (
        <Button full icon={Download} onClick={start}>
          {f.cta}
        </Button>
      )}
      {status === 'busy' && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <ProgressBar value={pct} fill="bg-accent" label={`${f.title} download progress`} />
          <Button full variant="outline" disabled className="opacity-100">
            Preparing file · {pct}%
          </Button>
        </div>
      )}
      {status === 'done' && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ok">
            <Icon icon={CircleCheck} />
            Download complete
          </p>
          <Button full variant="outline" icon={Download} onClick={start}>
            Download again
          </Button>
        </div>
      )}
    </Card>
  )
}

function Qr() {
  const N = 25
  let seed = 11
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const cells: ReactElement[] = []
  const ring = (lx: number, ly: number) =>
    lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let on: boolean
      if (x < 8 && y < 8) on = x < 7 && y < 7 && ring(x, y)
      else if (x >= N - 8 && y < 8) on = x >= N - 7 && y < 7 && ring(x - (N - 7), y)
      else if (x < 8 && y >= N - 8) on = x < 7 && y >= N - 7 && ring(x, y - (N - 7))
      else on = rnd() > 0.5
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />)
    }
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} role="img" aria-label="QR code for the read-only plan link" className="size-36 fill-ink" shapeRendering="crispEdges">
      {cells}
    </svg>
  )
}

function Share() {
  const [copied, setCopied] = useState(false)
  const link = 'https://planpilot.app/p/aarav-30th-k7m2x9'
  return (
    <Card className="flex items-center gap-8 p-6">
      <div className="flex-1">
        <h3 className="text-[20px] font-semibold">Share the plan</h3>
        <div className="mt-4">
          <Label htmlFor="share-link">Read-only link</Label>
          <div className="flex gap-2">
            <input id="share-link" readOnly value={link} className={inputCls} onFocus={(e) => e.currentTarget.select()} />
            <Button
              variant="outline"
              icon={copied ? Check : Copy}
              onClick={() => {
                navigator.clipboard?.writeText(link).catch(() => {})
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="mt-2 text-[14px] text-ink-muted" aria-live="polite">
            Anyone with this link can view. They cannot edit.
          </p>
        </div>
      </div>
      <figure className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-3">
        <Qr />
        <figcaption className="text-[14px] text-ink-muted">Scan to open on a phone</figcaption>
      </figure>
    </Card>
  )
}

const RUN = [
  ['4:00 PM', 'Venue access and setup', 'Olive Bistro Rooftop'],
  ['5:30 PM', 'Decor and lighting walkthrough', 'Bloom & Bough Decor'],
  ['6:30 PM', 'Live counters start', 'Sampoorna Caterers'],
  ['7:00 PM', 'Guests arrive, welcome drinks', 'Host'],
  ['8:00 PM', 'Dinner service', 'Sampoorna Caterers'],
  ['9:00 PM', 'Cake cutting', 'The Cake Shoppe'],
  ['10:30 PM', 'Wrap-up and pack-down', 'Hyderabad Party Rentals'],
]

const SOURCES: Record<string, { kind: EvidenceKind; domain: string; fetched: string } | null> = {
  Venue: { kind: 'published', domain: 'olivebistro.in', fetched: '2 min ago' },
  Food: { kind: 'estimate', domain: 'sampoornacaterers.in', fetched: '6 min ago' },
  Decor: { kind: 'published', domain: 'bloomandbough.in', fetched: '3 min ago' },
  Cake: { kind: 'quote', domain: 'thecakeshoppe.in', fetched: '12 min ago' },
  Activities: { kind: 'estimate', domain: 'hydpartyrentals.in', fetched: '9 min ago' },
  Contingency: null,
}

const VENDORS = [
  ['Olive Bistro Rooftop', 'Venue', 'olivebistro.in', false],
  ['Sampoorna Caterers', 'Food', 'sampoornacaterers.in', true],
  ['Bloom & Bough Decor', 'Decor', 'bloomandbough.in', true],
  ['The Cake Shoppe', 'Cake', 'thecakeshoppe.in', true],
  ['Hyderabad Party Rentals', 'Rentals', 'hydpartyrentals.in', true],
] as const

const th = 'border-b-2 border-ink px-2 py-2 font-semibold'
const td = 'border-b border-line px-2 py-2 align-top'

function Preview() {
  return (
    <section aria-label="Plan preview" className="border border-line bg-white p-8 shadow-none">
      <div className="flex items-start justify-between gap-6 border-b-2 border-ink pb-4">
        <div>
          <h2 className="display text-[28px]">{EVENT.title}</h2>
          <p className="text-[14px] text-ink-muted">
            {EVENT.city}, {EVENT.area} · Saturday, 1 November 2025, {EVENT.time} · {EVENT.guests} guests
          </p>
        </div>
        <div className="shrink-0 border border-ink px-4 py-2 text-center">
          <p className="text-[14px] font-medium">Readiness</p>
          <p className="display text-[40px]">
            {EVENT.readiness}
            <span className="text-[16px] font-normal text-ink-muted"> / 100</span>
          </p>
        </div>
      </div>

      <h3 className="mt-6 text-[20px] font-semibold">Run of show</h3>
      <table className="mt-2 w-full text-left text-[14px]">
        <thead>
          <tr>
            <th className={th}>Time</th>
            <th className={th}>What happens</th>
            <th className={th}>Owner</th>
          </tr>
        </thead>
        <tbody>
          {RUN.map(([t, w, o]) => (
            <tr key={t}>
              <td className={`${td} w-28 font-medium`}>{t}</td>
              <td className={td}>{w}</td>
              <td className={td}>{o}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-8 text-[20px] font-semibold">Budget</h3>
      <table className="mt-2 w-full text-left text-[14px]">
        <thead>
          <tr>
            <th className={th}>Category</th>
            <th className={`${th} text-right`}>Planned</th>
            <th className={`${th} text-right`}>Actual</th>
            <th className={th}>Source</th>
          </tr>
        </thead>
        <tbody>
          {CATS.map((c) => {
            const s = SOURCES[c.name]
            return (
              <tr key={c.name}>
                <td className={`${td} font-medium`}>{c.name}</td>
                <td className={`${td} text-right`}>{inr(c.planned)}</td>
                <td className={`${td} text-right`}>{inr(c.actual)}</td>
                <td className={td}>
                  {s ? <EvidenceChip kind={s.kind} domain={s.domain} fetched={s.fetched} /> : <span className="text-ink-muted">Internal allocation, no web source</span>}
                </td>
              </tr>
            )
          })}
          <tr>
            <td className="px-2 py-2 font-semibold">Total</td>
            <td className="px-2 py-2 text-right font-semibold">{inr(EVENT.budget)}</td>
            <td className="px-2 py-2 text-right font-semibold">{inr(EVENT.spent)}</td>
            <td className="px-2 py-2 text-ink-muted">{inr(EVENT.remaining)} remaining</td>
          </tr>
        </tbody>
      </table>

      <h3 className="mt-8 text-[20px] font-semibold">Vendors</h3>
      <ul className="mt-2">
        {VENDORS.map(([n, role, d, ok]) => (
          <li key={n} className="grid grid-cols-[1.4fr_1fr_1.4fr_1fr] items-center gap-4 border-b border-line px-2 py-2 text-[14px]">
            <span className="font-medium">{n}</span>
            <span className="text-ink-muted">{role}</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="w-fit text-info underline">
              {d}
            </a>
            <span className={`flex items-center gap-1 font-semibold ${ok ? 'text-ok' : 'text-warn'}`}>
              <Icon icon={ok ? CircleCheck : TriangleAlert} size={16} />
              {ok ? 'Confirmed' : 'Awaiting confirmation'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[14px] text-ink-muted">
        Prices marked Estimate come from vendor menus and should be confirmed in writing. Total across {num(CATS.length)} budget
        categories is {inr(EVENT.budget)}.
      </p>
    </section>
  )
}

export default function Execution() {
  return (
    <DesktopShell current="execution">
      <div className="relative h-60 overflow-hidden bg-ink">
        <img src={IMG.hero} alt="Friends gathered at an outdoor dinner party at night" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative flex h-full flex-col justify-end px-8 pb-6 text-white">
          <h2 className="display text-[40px]">Your plan is ready</h2>
          <p className="text-[16px]">
            {EVENT.title} · {EVENT.city} · Sat 1 Nov, {EVENT.time} · {EVENT.guests} guests
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-6 px-8 py-8">
        <div className="grid grid-cols-2 gap-4">
          {FILES.map((f) => (
            <DownloadCard key={f.id} f={f} />
          ))}
        </div>
        <Share />
        <div className="mt-6 flex items-center justify-between">
          <h2 className="display text-[28px]">Plan preview</h2>
          <Button variant="outline" icon={Printer}>
            Print plan
          </Button>
        </div>
        <Preview />
      </div>
    </DesktopShell>
  )
}
