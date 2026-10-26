import type { Evidence, VendorCategory } from '@/lib/schemas'

/**
 * The offline dataset. Used only when a live source fails, and always behind
 * the "Sample data — not live" banner.
 *
 * Nothing here claims to be published and nothing carries a source URL,
 * because none of it was retrieved from one. These are illustrative figures
 * for a Hyderabad event, typed as estimates so the evidence model stays
 * truthful when the network is not available. Replace them with hand-verified
 * vendors and their real URLs before using this in front of anyone who might
 * act on the numbers.
 */

export type SampleVendor = {
  name: string
  category: VendorCategory
  priceINR: number | null
  capacity: number | null
  address: string
  fact: string
  evidence: Evidence
}

const estimate = (note: string): Evidence => ({ status: 'estimate', note })

export const SAMPLE_VENDORS: SampleVendor[] = [
  {
    name: 'Rooftop terrace (sample)',
    category: 'venue',
    priceINR: 6_000,
    capacity: 50,
    address: 'Jubilee Hills, Hyderabad',
    fact: 'Typical rooftop hire for four hours in this area',
    evidence: estimate('Illustrative rate for a Hyderabad rooftop, not a quote'),
  },
  {
    name: 'Community hall (sample)',
    category: 'venue',
    priceINR: 3_500,
    capacity: 80,
    address: 'Banjara Hills, Hyderabad',
    fact: 'Indoor hall, typically cheaper and weather-proof',
    evidence: estimate('Illustrative rate for a community hall'),
  },
  {
    name: 'Vegetarian buffet caterer (sample)',
    category: 'food',
    priceINR: 280,
    capacity: null,
    address: 'Hyderabad',
    fact: 'Per-head buffet rate, typical minimum of 30 covers',
    evidence: estimate('Illustrative per-head rate, not a quote'),
  },
  {
    name: 'Florals and lighting (sample)',
    category: 'decor',
    priceINR: 4_000,
    capacity: null,
    address: 'Hyderabad',
    fact: 'Backdrop, table florals and warm string lighting',
    evidence: estimate('Illustrative decor package'),
  },
  {
    name: 'Celebration cake (sample)',
    category: 'cake',
    priceINR: 650,
    capacity: null,
    address: 'Hyderabad',
    fact: 'Per kilogram, typically 48 hours notice',
    evidence: estimate('Illustrative per-kilogram rate'),
  },
  {
    name: 'Canopy and seating hire (sample)',
    category: 'rentals',
    priceINR: 3_200,
    capacity: null,
    address: 'Hyderabad',
    fact: 'Wet-weather canopy, the usual outdoor backup',
    evidence: estimate('Illustrative canopy hire'),
  },
]

export function sampleVendorsFor(categories: VendorCategory[]): SampleVendor[] {
  return SAMPLE_VENDORS.filter((v) => categories.includes(v.category))
}
