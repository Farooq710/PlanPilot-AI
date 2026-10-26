import { fetchJson } from './http'

/**
 * Web research behind an interface, so the provider is swappable and the
 * absence of a key is a first-class state rather than a crash.
 *
 * We do not crawl. The provider fetches public pages under its own terms and
 * returns snippets; we read those and keep the URL. That keeps us clear of
 * robots.txt and rate-limit obligations we would otherwise be taking on, and
 * well clear of the directories and map platforms the brief rules out.
 */

export type SearchHit = {
  title: string
  url: string
  snippet: string
}

export interface SearchProvider {
  readonly name: string
  readonly available: boolean
  search(query: string, maxResults?: number): Promise<SearchHit[]>
}

/** Used when no key is configured. Honest about returning nothing. */
class NoSearchProvider implements SearchProvider {
  readonly name = 'none'
  readonly available = false
  async search(): Promise<SearchHit[]> {
    return []
  }
}

type TavilyResponse = {
  results?: { title?: string; url?: string; content?: string }[]
}

class TavilyProvider implements SearchProvider {
  readonly name = 'tavily'
  readonly available = true

  constructor(private apiKey: string) {}

  async search(query: string, maxResults = 4): Promise<SearchHit[]> {
    const result = await fetchJson<TavilyResponse>('https://api.tavily.com/search', {
      label: 'Tavily',
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
      }),
      revalidate: 86_400,
    })

    if (!result.ok) return []

    return (result.data.results ?? [])
      .filter((r): r is { title: string; url: string; content: string } =>
        Boolean(r.url && r.title),
      )
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: (r.content ?? '').slice(0, 400),
      }))
      .filter((hit) => isPermittedSource(hit.url))
  }
}

/**
 * The brief rules out bulk-scraping map platforms, social networks and
 * directories. Filtering here means a provider that returns one cannot sneak
 * it into the plan.
 */
const BLOCKED_HOSTS = [
  'google.com',
  'maps.google',
  'facebook.com',
  'instagram.com',
  'justdial.com',
  'sulekha.com',
  'tripadvisor.',
  'yelp.com',
  'x.com',
  'twitter.com',
]

export function isPermittedSource(url: string): boolean {
  try {
    const host = new URL(url).host.toLowerCase()
    return !BLOCKED_HOSTS.some((blocked) => host.includes(blocked))
  } catch {
    return false
  }
}

export function getSearchProvider(): SearchProvider {
  const key = process.env.SEARCH_API_KEY
  return key ? new TavilyProvider(key) : new NoSearchProvider()
}

/* ------------------------------------------------------------ extraction */

/**
 * Pulls a rupee figure out of a snippet. Deliberately conservative: it only
 * matches an explicit rupee marker, ignores anything implausible, and the
 * caller labels the result an estimate — a regex reading of a search snippet
 * is not a verified price, however tempting the number looks.
 */
export function extractPriceINR(text: string): number | null {
  const matches = [...text.matchAll(/(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d+)?)\s*(k|lakh)?/gi)]

  for (const match of matches) {
    let value = Number(match[1].replace(/,/g, ''))
    if (!Number.isFinite(value)) continue

    const unit = match[2]?.toLowerCase()
    if (unit === 'k') value *= 1_000
    if (unit === 'lakh') value *= 100_000

    // Below ₹50 is a typo or a page element; above ₹50 lakh is not this event.
    if (value >= 50 && value <= 5_000_000) return Math.round(value)
  }
  return null
}

/** True when a snippet looks like it is quoting a per-head rate. */
export function looksPerHead(text: string): boolean {
  return /per\s*(head|person|plate|pax|guest)/i.test(text)
}
