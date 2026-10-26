import { Building2, Cake, Flower2, PartyPopper, ShieldCheck, UtensilsCrossed } from 'lucide-react'

export const inr = (n: number) => `Rs ${n.toLocaleString('en-IN')}`
export const num = (n: number) => n.toLocaleString('en-IN')

const u = (id: string, w = 640, h = 480) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=75`

export const IMG = {
  hero: u('1621112904887-419379ce6824', 2000, 600),
  premium: u('1770140304066-6db58fe18543'),
  minimal: u('1551468220-0a25172193f9'),
  festive: u('1635424785729-c022fc1a61bd'),
  rustic: u('1792187761035-52df4c0afc26'),
  kids: u('1530103862676-de8c9debad1d'),
  venue: u('1563138216-8ff2e182ccbd', 480, 320),
  food: u('1555244162-803834f70033', 480, 320),
  decor: u('1781004889918-3d98c02f42ec', 480, 320),
  cake: u('1606983340126-99ab4feaa64a', 480, 320),
  rentals: u('1519167758481-83f550bb49b3', 480, 320),
}

export const EVENT = {
  title: "Aarav's 30th Birthday",
  city: 'Hyderabad',
  area: 'Jubilee Hills',
  date: 'Sat 1 Nov 2025',
  time: '7:00 PM',
  guests: 40,
  budget: 25000,
  spent: 18400,
  remaining: 6600,
  readiness: 72,
  tasksDone: 12,
  tasksTotal: 19,
  daysLeft: 6,
}

export type Cat = 'Venue' | 'Food' | 'Decor' | 'Cake' | 'Activities' | 'Contingency'

export const CATS: {
  name: Cat
  planned: number
  actual: number
  color: string
  icon: typeof Building2
}[] = [
  { name: 'Venue', planned: 6250, actual: 4000, color: '#2F6FBF', icon: Building2 },
  { name: 'Food', planned: 8750, actual: 10850, color: '#E0564A', icon: UtensilsCrossed },
  { name: 'Decor', planned: 3750, actual: 1950, color: '#1A7F55', icon: Flower2 },
  { name: 'Cake', planned: 2000, actual: 1200, color: '#B5761B', icon: Cake },
  { name: 'Activities', planned: 1750, actual: 400, color: '#6B7280', icon: PartyPopper },
  { name: 'Contingency', planned: 2500, actual: 0, color: '#111B33', icon: ShieldCheck },
]

export const catMeta = (c: Cat) => CATS.find((x) => x.name === c)!

export const VENDORS = {
  venue: { name: 'Olive Bistro Rooftop', domain: 'olivebistro.in' },
  food: { name: 'Sampoorna Caterers', domain: 'sampoornacaterers.in' },
  decor: { name: 'Bloom & Bough Decor', domain: 'bloomandbough.in' },
  cake: { name: 'The Cake Shoppe', domain: 'thecakeshoppe.in' },
  rentals: { name: 'Hyderabad Party Rentals', domain: 'hydpartyrentals.in' },
}
