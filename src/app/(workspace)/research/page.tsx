import {
  CalendarClock,
  CircleHelp,
  CloudRain,
  MapPin,
  Search,
  Star,
  Sun,
  Wind,
} from 'lucide-react'
import { researchAction, toggleShortlist } from '@/app/actions'
import { Button } from '@/components/controls'
import { MapPanel, VenueLoader } from '@/components/research-client'
import { Card, EmptyState, EvidenceChip, Icon, Tag } from '@/components/ui'
import { getActivePlan } from '@/lib/active-event'
import { inr } from '@/lib/money'
import { holidaysNear } from '@/lib/sources/nager'
import { forecastForDate, withinForecastWindow } from '@/lib/sources/open-meteo'
import { getSearchProvider } from '@/lib/sources/search'
import { dayAndDate } from '@/lib/time'
import type { Vendor } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export default async function ResearchPage() {
  const plan = await getActivePlan()

  if (!plan) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState icon={Search} title="No plan to research yet">
          Fill in the brief first and the research room will have something to work on.
        </EmptyState>
      </div>
    )
  }

  const { event, vendors } = plan

  // Read the sources again for display. Both are cached, so this is cheap.
  const [weather, holidays] = await Promise.all([
    event.geo && withinForecastWindow(event.date)
      ? forecastForDate(event.geo, event.date)
      : Promise.resolve(null),
    holidaysNear(event.date),
  ])

  const searchAvailable = getSearchProvider().available
  const located = vendors.filter((v) => v.geo)
  const pins = located.map((v, i) => ({
    id: v.id,
    name: v.name,
    geo: v.geo!,
    number: i + 1,
    detail: v.address,
  }))

  const missing = buildGaps(vendors, searchAvailable, holidays.ok ? holidays.data.caveat : null)
  const hasVenues = vendors.some((v) => v.category === 'venue')

  return (
    <div className="flex flex-col gap-6 p-6 lg:grid lg:grid-cols-5 lg:items-start lg:gap-8 lg:p-8">
      {/* ------------------------------------------------------- left */}
      <div className="flex flex-col gap-6 lg:col-span-3">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-[28px]">Research Room</h2>
            <p className="mt-1 text-[16px] text-ink-muted">
              Real options for {event.city}, each carrying where it came from.
            </p>
          </div>
          <form action={researchAction}>
            <Button type="submit">
              <Icon icon={Search} />
              {vendors.length ? 'Run research again' : 'Run research'}
            </Button>
          </form>
        </header>

        <Card className="flex flex-col gap-3 p-6">
          <h3 className="text-[20px] font-semibold">Venues near {event.city}</h3>
          <VenueLoader autoStart={!hasVenues && Boolean(event.geo)} />
        </Card>

        {vendors.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nothing researched yet"
            action={
              <form action={researchAction}>
                <Button type="submit">
                  <Icon icon={Search} />
                  Run research
                </Button>
              </form>
            }
          >
            Research checks the forecast and public holidays, and looks for venues nearby. Prices
            need a search key; without one, options arrive without them.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {vendors.map((vendor, i) => (
              <li key={vendor.id}>
                <VendorCard vendor={vendor} number={located.includes(vendor) ? i + 1 : null} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ------------------------------------------------------ right */}
      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:col-span-2">
        <MapPanel centre={event.geo} pins={pins} />

        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-[20px] font-semibold">
            <Icon icon={CloudRain} />
            Weather on {dayAndDate(event.date)}
          </h3>
          {weather?.ok && weather.data ? (
            <>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-[14px]">
                <Stat icon={CloudRain} label="Rain" value={fmtPct(weather.data.rainChancePct)} />
                <Stat icon={Sun} label="High" value={fmtTemp(weather.data.tempMaxC)} />
                <Stat icon={Wind} label="Wind" value={fmtWind(weather.data.windMaxKph)} />
              </dl>
              <div className="mt-3">
                <EvidenceChip
                  evidence={{
                    status: 'published',
                    sourceUrl: 'https://open-meteo.com/',
                    sourceDomain: 'open-meteo.com',
                    fetchedAt: weather.fetchedAt,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <Tag tone="unknown" icon={CircleHelp} dashed>
                Weather risk unknown
              </Tag>
              <p className="text-[14px] text-ink-muted">
                {!event.geo
                  ? `${event.city} could not be placed on the map.`
                  : !withinForecastWindow(event.date)
                    ? 'The event date is beyond the 15-day forecast window, so this stays unknown rather than being guessed.'
                    : 'The forecast could not be retrieved.'}
              </p>
            </div>
          )}
        </Card>

        {holidays.ok && holidays.data.holidays.length > 0 && (
          <Card className="p-6">
            <h3 className="flex items-center gap-2 text-[20px] font-semibold">
              <Icon icon={CalendarClock} />
              Public holidays
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-[14px]">
              {holidays.data.holidays.map((h) => (
                <li key={h.date}>
                  <span className="font-semibold">{h.name}</span>{' '}
                  <span className="text-ink-muted">
                    ({h.offsetDays === 0
                      ? 'on the event date'
                      : `${Math.abs(h.offsetDays)} ${Math.abs(h.offsetDays) === 1 ? 'day' : 'days'} ${h.offsetDays > 0 ? 'after' : 'before'}`}
                    )
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="bg-sunk p-6">
          <h3 className="text-[20px] font-semibold">Missing information</h3>
          {missing.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-muted">Nothing outstanding.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {missing.map((gap) => (
                <li key={gap} className="flex items-start gap-2 text-[14px]">
                  <Icon icon={CircleHelp} size={16} className="mt-1 text-unknown" />
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <p className="text-[12px] text-ink-muted">
          Venue data © OpenStreetMap contributors (ODbL). Weather by Open-Meteo, CC BY 4.0.
        </p>
      </aside>
    </div>
  )
}

/* -------------------------------------------------------------- fragments */

function VendorCard({ vendor, number }: { vendor: Vendor; number: number | null }) {
  return (
    <Card
      className={`flex h-full flex-col gap-3 p-4 ${vendor.shortlisted ? 'border-l-[3px] border-l-accent' : ''}`}
    >
      <div className="flex items-start gap-2">
        {number !== null && (
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold text-white">
            {number}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-[16px] font-semibold">{vendor.name}</h4>
          <p className="text-[12px] uppercase tracking-wide text-ink-muted">{vendor.category}</p>
        </div>
        <form action={toggleShortlist.bind(null, vendor.id)}>
          <button
            type="submit"
            aria-pressed={vendor.shortlisted}
            className={`tx inline-flex size-11 items-center justify-center rounded-xl ${
              vendor.shortlisted ? 'text-accent' : 'text-ink-muted hover:bg-sunk'
            }`}
          >
            <Icon icon={Star} />
            <span className="sr-only">
              {vendor.shortlisted ? `Remove ${vendor.name} from shortlist` : `Add ${vendor.name} to shortlist`}
            </span>
          </button>
        </form>
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[14px]">
        <div className="flex gap-1">
          <dt className="text-ink-muted">Price</dt>
          <dd className={vendor.priceINR === null ? 'text-unknown' : 'font-semibold'}>
            {vendor.priceINR === null ? 'Unknown' : inr(vendor.priceINR)}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">Capacity</dt>
          <dd className={vendor.capacity === null ? 'text-unknown' : 'font-semibold'}>
            {vendor.capacity === null ? 'Unknown' : vendor.capacity}
          </dd>
        </div>
      </dl>

      {vendor.fact && <p className="text-[14px] text-ink-muted">{vendor.fact}</p>}

      {vendor.address && (
        <p className="flex items-center gap-1 text-[12px] text-ink-muted">
          <Icon icon={MapPin} size={16} />
          {vendor.address}
        </p>
      )}

      {/* Every card carries its provenance. This is the point of the product. */}
      <div className="mt-auto pt-1">
        <EvidenceChip evidence={vendor.evidence} />
      </div>
    </Card>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: typeof CloudRain
  label: string
  value: string
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[12px] text-ink-muted">
        <Icon icon={icon} size={16} />
        {label}
      </dt>
      <dd className="text-[20px] font-semibold">{value}</dd>
    </div>
  )
}

const fmtPct = (v: number | null) => (v === null ? '—' : `${v}%`)
const fmtTemp = (v: number | null) => (v === null ? '—' : `${Math.round(v)}°C`)
const fmtWind = (v: number | null) => (v === null ? '—' : `${Math.round(v)} km/h`)

function buildGaps(
  vendors: Vendor[],
  searchAvailable: boolean,
  holidayCaveat: string | null,
): string[] {
  const gaps: string[] = []

  const noCapacity = vendors.filter((v) => v.category === 'venue' && v.capacity === null).length
  if (noCapacity) {
    gaps.push(
      `Capacity unknown for ${noCapacity} ${noCapacity === 1 ? 'venue' : 'venues'} — OpenStreetMap does not record it. Call and add what you are told.`,
    )
  }

  const noPrice = vendors.filter((v) => v.priceINR === null).length
  if (noPrice) {
    gaps.push(`No published price for ${noPrice} of ${vendors.length} options.`)
  }

  if (!searchAvailable) {
    gaps.push('Web research is off. Add a SEARCH_API_KEY to look up published prices.')
  }

  if (holidayCaveat) gaps.push(holidayCaveat)

  return gaps
}
