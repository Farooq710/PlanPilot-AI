import { join } from 'node:path'
import { MemoryStore } from './memory'
import { SqliteStore } from './sqlite'
import type { Store } from './types'

export type { Store, StoreDriver } from './types'

/**
 * Serverless hosts give us a read-only filesystem and a fresh instance per
 * invocation, so SQLite buys nothing there. Anywhere else we persist to a file
 * next to the project.
 */
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

const DB_FILE = process.env.PLANPILOT_DB ?? join(process.cwd(), '.data', 'planpilot.db')

let instance: Store | null = null
let opening: Promise<Store> | null = null

async function create(): Promise<Store> {
  if (isServerless || process.env.PLANPILOT_STORE === 'memory') {
    return new MemoryStore()
  }
  // Returns null when node:sqlite is missing or the path is not writable.
  const sqlite = await SqliteStore.open(DB_FILE)
  return sqlite ?? new MemoryStore()
}

/**
 * The process-wide store. Concurrent callers share one initialisation, so we
 * never open the database twice.
 */
export async function getStore(): Promise<Store> {
  if (instance) return instance
  opening ??= create().then((s) => {
    instance = s
    return s
  })
  return opening
}
