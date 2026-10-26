import { useState } from 'react'
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  CloudRain,
  Loader,
  RotateCcw,
  Star,
  Sun,
  TriangleAlert,
} from 'lucide-react'
import { DesktopShell } from '../chrome'
import { CATS, IMG, inr, type Cat } from '../data'
import { Button, Card, EvidenceChip, Icon, IconButton, ProgressBar, Skeleton, Tag, type EvidenceKind } from '../ui'

type Src = {
  n: number
  name: string
  cat: Cat
  img: string
  price: number | null
  capacity: string
  fact: string
  kind: EvidenceKind
  domain: string
  fetched: string
  quote?: { kind: EvidenceKind; domain: string; fetched: string }
}

const SOURCES: Src[] = [
  {
    n: 1,
    name: 'Olive Bistro Rooftop',
    cat: 'Venue',
    img: IMG.venue,
    price: 12000,
    capacity: 'Seats 50',
    fact: 'Open-air terrace with a covered bar, Jubilee Hills.',
    kind: 'published',
    domain: 'olivebistro.in',
    fetched: '2 min ago',
    quote: { kind: 'quote', domain: 'maps.google.com', fetched: '2 min ago' },
  },
  {
    n: 2,
    name: 'Sampoorna Caterers',
    cat: 'Food',
    img: IMG.food,
    price: 10850,
    capacity: 'Serves 25 to 150',
    fact: 'Veg and non-veg menus with a live dosa counter.',
    kind: 'estimate',
    domain: 'sampoornacaterers.in',
    fetched: '6 min ago',
  },
  {
    n: 3,
    name: 'Bloom & Bough Decor',
    cat: 'Decor',
    img: IMG.decor,
    price: 1950,
    capacity: 'Up to 80 guests',
    fact: 'Marigold and fairy-light packages for terraces.',
    kind: 'published',
    domain: 'bloomandbough.in',
    fetched: '3 min ago',
  },
  {
    n: 4,
    name: 'The Cake Shoppe',
    cat: 'Cake',
    img: IMG.cake,
    price: null,
    capacity: 'Up to 5 kg',
    fact: 'Eggless and dark chocolate truffle options listed.',
    kind: 'unknown',
    domain: 'thecakeshoppe.in',
    fetched: '12 min ago',
  },
  {
    n: 5,
    name: 'Hyderabad Party Rentals',
    cat: 'Decor',
    img: IMG.rentals,
    price: 1850,
    capacity: 'Seats up to 60',
    fact: 'Chairs, high tables and heaters with setup included.',
    kind: 'estimate',
    domain: 'hydpartyrentals.in',
    fetched: '9 min ago',
  },
]

const PINS: Record<number, [number, number]> = {
  1: [44, 38],
  2: [64, 26],
  3: [28, 54],
  4: [72, 60],
  5: [50, 74],
}

const ROWS = [
  { cat: 'Venue' as Cat, count: 9, pct: 100, state: 'done' },
  { cat: 'Food' as Cat, count: 7, pct: 100, state: 'done' },
  { cat: 'Decor' as Cat, count: 4, pct: 60, state: 'searching' },
  { cat: 'Cake' as Cat, count: 6, pct: 100, state: 'done' },
  { cat: 'Activities' as Cat, count: 0, pct: 30, state: 'failed' },
]

function CategoryRow({ r }: { r: (typeof ROWS)[number] }) {
  const meta = CATS.find((c) => c.name === r.cat)!
  return (
    <li className="py-3">
      <div className="flex items-center gap-4">
        <span className="flex w-32 items-center gap-2 text-[14px] font-medium">
          <Icon icon={meta.icon} />
          {r.cat}
        </span>
        <div className="w-28 shrink-0 sm:w-36">
          <ProgressBar
            label={`${r.cat} research progress`}
            value={r.pct}
            fill={r.state === 'failed' ? 'bg-danger' : r.state === 'done' ? 'bg-ok' : 'bg-warn-fill'}
          />
        </div>
        <span className="flex-1 text-[14px] text-ink-muted">{r.count} sources checked</span>
        {r.state === 'done' && (
          <Tag tone="ok" icon={CircleCheck}>
            Done
          </Tag>
        )}
        {r.state === 'searching' && (
          <Tag tone="warn" icon={Loader}>
            Searching
          </Tag>
        )}
        {r.state === 'failed' && (
          <Tag tone="danger" icon={CircleAlert}>
            Failed
          </Tag>
        )}
      </div>
      {r.state === 'failed' && (
        <div className="mt-1 flex items-center justify-between gap-4 pl-36 text-[14px] text-danger">
          <span>Overpass timed out. Activities near Jubilee Hills were not loaded.</span>
          <Button variant="outline" icon={RotateCcw}>
            Retry
          </Button>
        </div>
      )}
    </li>
  )
}

function SourceCard({
  s,
  on,
  toggle,
  setHot,
}: {
  s: Src
  on: boolean
  toggle: () => void
  setHot: (n: number | null) => void
}) {
  return (
    <article
      onMouseEnter={() => setHot(s.n)}
      onMouseLeave={() => setHot(null)}
      onFocus={() => setHot(s.n)}
      onBlur={() => setHot(null)}
      className={`tx mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-line bg-surface shadow-card ${on ? 'border-l-[3px] border-l-accent' : ''}`}
    >
      <div className="relative h-28 bg-sunk">
        <img src={s.img} alt={`${s.name}, ${s.cat.toLowerCase()} option`} className="size-full object-cover" />
        <span className="absolute left-2 top-2 grid size-8 place-items-center rounded-full bg-accent text-[14px] font-semibold text-white">
          {s.n}
        </span>
        <IconButton
          icon={Star}
          label={on ? `Remove ${s.name} from shortlist` : `Add ${s.name} to shortlist`}
          aria-pressed={on}
          onClick={toggle}
          className={`absolute right-1 top-1 !text-ink ${on ? '[&_svg]:fill-accent [&_svg]:text-accent' : ''}`}
        />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-semibold leading-snug">{s.name}</h3>
          <span className="shrink-0 rounded-[999px] border border-line bg-sunk px-2 py-1 text-[12px] font-medium leading-4">
            {s.cat}
          </span>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-3 text-[14px]">
          {s.price ? (
            <span className="text-[16px] font-semibold">{inr(s.price)}</span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-unknown">
              <Icon icon={CircleQuestionMark} />
              Price unknown
            </span>
          )}
          <span className="text-ink-muted">{s.capacity}</span>
        </p>
        <EvidenceChip kind={s.kind} domain={s.domain} fetched={s.fetched} />
        <p className="text-[14px]">{s.fact}</p>
        {s.quote && <EvidenceChip kind={s.quote.kind} domain={s.quote.domain} fetched={s.quote.fetched} />}
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-line bg-surface" aria-hidden>
      <Skeleton className="h-28 rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-6 w-full rounded-[999px]" />
        <Skeleton className="h-5 w-5/6" />
      </div>
    </div>
  )
}

const TILES = [11759, 11760, 11761]
const ROWS_Y = [7389, 7390, 7391]

export default function Research() {
  const [hot, setHot] = useState<number | null>(null)
  const [saved, setSaved] = useState<number[]>([1, 2, 3])
  const toggle = (n: number) => setSaved((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))

  return (
    <DesktopShell current="research">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 className="display text-[28px]">Research Room</h2>
            <p className="text-[14px] text-ink-muted">26 sources checked for Jubilee Hills, Hyderabad</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex min-h-11 items-center gap-2 rounded-[999px] border border-line bg-surface px-4 text-[14px] font-semibold">
              <Icon icon={Star} />
              Shortlist · {2 + saved.length}
            </span>
            <Button icon={ArrowRight}>Go to Command Center</Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[3fr_2fr] items-start gap-6">
          <div>
            <Card className="px-6 py-3">
              <ul className="divide-y divide-line">
                {ROWS.map((r) => (
                  <CategoryRow key={r.cat} r={r} />
                ))}
              </ul>
            </Card>
            <div className="mt-4 columns-2 gap-4">
              {SOURCES.map((s) => (
                <SourceCard key={s.n} s={s} on={saved.includes(s.n)} toggle={() => toggle(s.n)} setHot={setHot} />
              ))}
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>

          <aside className="sticky top-6 flex flex-col gap-4">
            <div className="relative h-80 overflow-hidden rounded-2xl border border-line bg-sunk">
              <div
                className="absolute left-1/2 top-1/2 grid grid-cols-3"
                style={{ width: 768, height: 768, transform: 'translate(-50%,-50%)' }}
              >
                {ROWS_Y.flatMap((y) =>
                  TILES.map((x) => (
                    <img key={`${x}-${y}`} src={`https://tile.openstreetmap.org/14/${x}/${y}.png`} alt="" className="size-64" />
                  )),
                )}
              </div>
              {SOURCES.map((s) => (
                <span
                  key={s.n}
                  role="img"
                  aria-label={`Map pin ${s.n}: ${s.name}`}
                  style={{ left: `${PINS[s.n][0]}%`, top: `${PINS[s.n][1]}%` }}
                  className={`tx absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-accent text-[14px] font-semibold text-white shadow-raised ${hot === s.n ? 'z-10 scale-125 ring-2 ring-ink' : ''}`}
                >
                  {s.n}
                </span>
              ))}
              <a
                href="https://www.openstreetmap.org/copyright"
                className="absolute bottom-2 right-2 rounded bg-surface px-2 py-1 text-[12px] text-info underline"
              >
                © OpenStreetMap contributors
              </a>
            </div>

            <section className="rounded-2xl bg-sunk p-4">
              <h3 className="text-[16px] font-semibold">Missing information</h3>
              <ul className="mt-1">
                {[
                  'Capacity unknown for 4 venues',
                  'Price missing for The Cake Shoppe',
                  'Parking not stated for Olive Bistro Rooftop',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-[14px]">
                    <Icon icon={CircleQuestionMark} className="text-unknown" />
                    <span className="flex-1">{t}</span>
                    <Button variant="text" className="!px-2">
                      Add it yourself
                    </Button>
                  </li>
                ))}
              </ul>
            </section>

            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[16px] font-semibold">Sat 1 Nov, Hyderabad</h3>
                <span className="flex items-center gap-4 text-[14px]">
                  <span className="flex items-center gap-1">
                    <Icon icon={Sun} />
                    31°C
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon icon={CloudRain} />
                    Rain 35%
                  </span>
                </span>
              </div>
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-warn-fill/15 px-3 py-3 text-[14px] font-semibold text-warn">
                <Icon icon={TriangleAlert} />
                Weather risk: unresolved
              </p>
              <div className="mt-3">
                <EvidenceChip kind="estimate" domain="open-meteo.com" fetched="4 min ago" />
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </DesktopShell>
  )
}
