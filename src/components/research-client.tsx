'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/controls'
import { Icon, ProgressBar, Skeleton } from '@/components/ui'
import type { Geo } from '@/lib/schemas'
import type { MapPin } from './venue-map'

// Leaflet touches `window` at module scope, so it never renders on the server.
const VenueMap = dynamic(() => import('./venue-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
})

export function MapPanel({ centre, pins }: { centre: Geo | null; pins: MapPin[] }) {
  if (!centre) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-sunk p-6 text-center text-[14px] text-ink-muted">
        The city could not be placed on the map, so venue pins are unavailable.
      </div>
    )
  }
  return (
    <div className="h-72 overflow-hidden rounded-xl border border-line lg:h-96">
      <VenueMap centre={centre} pins={pins} />
    </div>
  )
}

/* ------------------------------------------------------------ venue loader */

type VenueState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; found: number }
  | { phase: 'failed'; error: string }

/**
 * Fetches venue candidates after the page has painted. Overpass regularly
 * takes thirty to fifty seconds, so this shows its own progress and failure
 * rather than holding up everything else.
 */
export function VenueLoader({ autoStart }: { autoStart: boolean }) {
  const [state, setState] = useState<VenueState>({ phase: 'idle' })
  const [, startTransition] = useTransition()
  const router = useRouter()
  const started = useRef(false)

  async function load() {
    setState({ phase: 'loading' })
    try {
      const response = await fetch('/api/research/venues', { method: 'POST' })
      const body = await response.json()
      if (body.ok) {
        setState({ phase: 'done', found: body.found ?? 0 })
        // Pull the newly stored vendors into the server-rendered list.
        startTransition(() => router.refresh())
      } else {
        setState({ phase: 'failed', error: body.status?.error ?? 'Overpass did not respond' })
      }
    } catch (error) {
      setState({
        phase: 'failed',
        error: error instanceof Error ? error.message : 'Request failed',
      })
    }
  }

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true
      void load()
    }
    // Only ever auto-starts once per mount.

  }, [autoStart])

  if (state.phase === 'done') {
    return (
      <p className="text-[14px] text-ok" role="status">
        {state.found} venue {state.found === 1 ? 'candidate' : 'candidates'} from OpenStreetMap.
      </p>
    )
  }

  if (state.phase === 'loading') {
    return (
      <div role="status" className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[14px] text-ink-muted">
          <Icon icon={Search} size={16} />
          Searching OpenStreetMap — this can take up to a minute.
        </div>
        {/* Indeterminate: Overpass gives no progress, so we do not fake one. */}
        <ProgressBar value={40} label="Searching OpenStreetMap" fill="bg-ink-muted" />
      </div>
    )
  }

  if (state.phase === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-3" role="alert">
        <span className="flex items-center gap-2 text-[14px] text-warn">
          <Icon icon={TriangleAlert} size={16} />
          {state.error}
        </span>
        <Button variant="outline" icon={RefreshCw} onClick={load}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" icon={Search} onClick={load}>
      Find nearby venues
    </Button>
  )
}
