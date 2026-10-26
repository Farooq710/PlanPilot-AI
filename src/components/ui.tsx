import type { ReactNode } from 'react'
import {
  CircleCheck,
  CircleQuestionMark,
  EqualApproximately,
  Quote,
  type LucideIcon,
} from 'lucide-react'
import type { Evidence, EvidenceStatus } from '@/lib/schemas'
import { stamp } from '@/lib/time'

/**
 * Presentational primitives, ported from the Figma Make reference. These carry
 * no event handlers so they stay server components; anything interactive lives
 * in controls.tsx.
 */

export function Icon({
  icon: Ic,
  size = 20,
  className = '',
}: {
  icon: LucideIcon
  size?: 16 | 20 | 24
  className?: string
}) {
  return <Ic size={size} strokeWidth={1.5} aria-hidden className={`shrink-0 ${className}`} />
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>
      {children}
    </div>
  )
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[14px] font-medium text-ink">
      {children}
    </label>
  )
}

export const inputCls =
  'min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-ink-muted'

/* ---------------------------------------------------------- evidence chip */

const KINDS: Record<EvidenceStatus, { label: string; icon: LucideIcon; cls: string }> = {
  published: { label: 'Published', icon: CircleCheck, cls: 'border-solid border-ok text-ok' },
  user_quote: { label: 'User quote', icon: Quote, cls: 'border-solid border-info text-info' },
  estimate: {
    label: 'Estimate',
    icon: EqualApproximately,
    cls: 'border-dashed border-warn text-warn',
  },
  unknown: {
    label: 'Unknown',
    icon: CircleQuestionMark,
    cls: 'border-dashed border-unknown text-unknown',
  },
}

/**
 * The product's signature component: every sourced fact carries its trust
 * level, its origin and when we fetched it. Status is never conveyed by colour
 * alone — each variant pairs a distinct icon with a written label.
 */
export function EvidenceChip({ evidence }: { evidence: Evidence }) {
  const k = KINDS[evidence.status]
  const domain =
    evidence.sourceDomain ??
    (evidence.sourceUrl ? safeHost(evidence.sourceUrl) : null)

  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-[999px] border bg-surface px-2 py-1 text-[12px] leading-4 ${k.cls}`}
    >
      <Icon icon={k.icon} size={16} />
      <span className="font-semibold uppercase tracking-wide">{k.label}</span>

      {domain && (
        <>
          <span aria-hidden className="text-ink-muted">
            ·
          </span>
          {evidence.sourceUrl ? (
            <a
              href={evidence.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hit relative text-info underline"
            >
              {domain}
            </a>
          ) : (
            <span className="text-ink-muted">{domain}</span>
          )}
        </>
      )}

      {evidence.fetchedAt && (
        <>
          <span aria-hidden className="text-ink-muted">
            ·
          </span>
          <span className="text-ink-muted">fetched {stamp(evidence.fetchedAt)}</span>
        </>
      )}
    </span>
  )
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return null
  }
}

/* --------------------------------------------------------------- feedback */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-lg ${className}`} />
}

export function ProgressBar({
  value,
  fill = 'bg-ink',
  label,
}: {
  value: number
  fill?: string
  label: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-sunk"
    >
      <div
        className={`h-full origin-left rounded-full ${fill}`}
        style={{ transform: `scaleX(${Math.min(1, value / 100)})` }}
      />
    </div>
  )
}

const TONE = {
  ok: 'border-ok text-ok',
  warn: 'border-warn text-warn',
  danger: 'border-danger text-danger',
  info: 'border-info text-info',
  unknown: 'border-unknown text-unknown',
  accent: 'border-accent text-accent',
} as const

export function Tag({
  tone,
  icon,
  children,
  dashed,
}: {
  tone: keyof typeof TONE
  icon: LucideIcon
  children: ReactNode
  dashed?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[999px] border bg-surface px-2 py-1 text-[12px] font-semibold leading-4 ${dashed ? 'border-dashed' : ''} ${TONE[tone]}`}
    >
      <Icon icon={icon} size={16} />
      {children}
    </span>
  )
}

/** Empty state: always an explanation plus the action that resolves it. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl bg-sunk p-6">
      <Icon icon={icon} size={24} className="text-ink-muted" />
      <p className="text-[16px] font-semibold text-ink">{title}</p>
      <p className="max-w-prose text-[14px] text-ink-muted">{children}</p>
      {action}
    </div>
  )
}
