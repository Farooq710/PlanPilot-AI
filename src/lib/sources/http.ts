/**
 * Shared HTTP discipline for every outbound call: a descriptive User-Agent,
 * a hard timeout, and caching so a demo does not hammer a free endpoint.
 * Providers ask for nothing beyond public data and never bulk-fetch.
 */

export const USER_AGENT =
  'PlanPilotAI/0.1 (hackathon prototype; event planning assistant; +https://github.com/planpilot-ai)'

export type SourceOk<T> = { ok: true; data: T; fetchedAt: string }
export type SourceFail = { ok: false; error: string; fetchedAt: string }
export type SourceResult<T> = SourceOk<T> | SourceFail

const DEFAULT_TIMEOUT_MS = 8_000

export type FetchOptions = {
  /** Seconds Next should cache the response for. */
  revalidate?: number
  timeoutMs?: number
  method?: 'GET' | 'POST'
  body?: string
  contentType?: string
  /** Shown in error messages so a failure names its source. */
  label: string
}

/**
 * Never throws. A failed source degrades the plan rather than breaking it, so
 * the caller always gets a result it can label and show.
 */
export async function fetchJson<T>(
  url: string,
  options: FetchOptions,
): Promise<SourceResult<T>> {
  const fetchedAt = new Date().toISOString()
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  )

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        ...(options.contentType ? { 'Content-Type': options.contentType } : {}),
      },
      body: options.body,
      next: { revalidate: options.revalidate ?? 3600 },
    })

    if (!response.ok) {
      // 429 is the one worth naming: these are shared free endpoints.
      const detail =
        response.status === 429
          ? 'rate limited — try again in a minute'
          : `HTTP ${response.status}`
      return { ok: false, error: `${options.label} ${detail}`, fetchedAt }
    }

    return { ok: true, data: (await response.json()) as T, fetchedAt }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false,
      error: aborted
        ? `${options.label} timed out`
        : `${options.label} unreachable${error instanceof Error ? `: ${error.message}` : ''}`,
      fetchedAt,
    }
  } finally {
    clearTimeout(timeout)
  }
}
