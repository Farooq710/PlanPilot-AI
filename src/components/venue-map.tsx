'use client'

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Geo } from '@/lib/schemas'

/**
 * OpenStreetMap tiles with a pin per located vendor. Uses CircleMarker rather
 * than the default marker so there are no icon assets to ship, and it inherits
 * the accent colour directly.
 *
 * Loaded through a dynamic import with ssr disabled — Leaflet reaches for
 * `window` at module scope and cannot be rendered on the server.
 */

export type MapPin = {
  id: string
  name: string
  geo: Geo
  /** Index shown on the pin, matching the numbered source cards. */
  number: number
  detail: string | null
}

export default function VenueMap({
  centre,
  pins,
}: {
  centre: Geo
  pins: MapPin[]
}) {
  return (
    <MapContainer
      center={[centre.lat, centre.lon]}
      zoom={12}
      scrollWheelZoom={false}
      className="h-full w-full rounded-xl"
      // Leaflet's own attribution control covers the ODbL requirement.
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {pins.map((pin) => (
        <CircleMarker
          key={pin.id}
          center={[pin.geo.lat, pin.geo.lon]}
          radius={9}
          pathOptions={{
            color: '#b8372b',
            fillColor: '#b8372b',
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <strong>
              {pin.number}. {pin.name}
            </strong>
            {pin.detail && <div>{pin.detail}</div>}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
