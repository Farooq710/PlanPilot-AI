import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  CircleCheck,
  CircleQuestionMark,
  EqualApproximately,
  Minus,
  Plus,
  Quote,
  type LucideIcon,
} from 'lucide-react'

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

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'text'
  icon?: LucideIcon
  full?: boolean
}

const BTN = {
  primary: 'bg-accent text-white hover:opacity-90',
  ghost: 'text-ink hover:bg-sunk',
  outline: 'border border-line bg-surface text-ink hover:bg-sunk',
  text: 'text-accent hover:bg-accent-soft',
}

export function Button({ variant = 'primary', icon, full, className = '', children, ...p }: BtnProps) {
  return (
    <button
      type="button"
      className={`tx inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold ${full ? 'w-full' : ''} ${BTN[variant]} ${className}`}
      {...p}
    >
      {icon && <Icon icon={icon} />}
      {children}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  className = '',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      className={`tx inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-sunk hover:text-ink ${className}`}
      {...p}
    >
      <Icon icon={icon} />
      <span className="sr-only">{label}</span>
    </button>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>
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

export type EvidenceKind = 'published' | 'quote' | 'estimate' | 'unknown'

const KINDS: Record<EvidenceKind, { label: string; icon: LucideIcon; cls: string }> = {
  published: { label: 'Published', icon: CircleCheck, cls: 'border-solid border-ok text-ok' },
  quote: { label: 'User quote', icon: Quote, cls: 'border-solid border-info text-info' },
  estimate: { label: 'Estimate', icon: EqualApproximately, cls: 'border-dashed border-warn text-warn' },
  unknown: { label: 'Unknown', icon: CircleQuestionMark, cls: 'border-dashed border-unknown text-unknown' },
}

export function EvidenceChip({
  kind,
  domain,
  fetched = '2 min ago',
}: {
  kind: EvidenceKind
  domain: string
  fetched?: string
}) {
  const k = KINDS[kind]
  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-[999px] border bg-surface px-2 py-1 text-[12px] leading-4 ${k.cls}`}
    >
      <Icon icon={k.icon} size={16} />
      <span className="font-semibold uppercase tracking-wide">{k.label}</span>
      <span aria-hidden className="text-ink-muted">
        ·
      </span>
      <a href="#" onClick={(e) => e.preventDefault()} className="hit relative text-info underline">
        {domain}
      </a>
      <span aria-hidden className="text-ink-muted">
        ·
      </span>
      <span className="text-ink-muted">fetched {fetched}</span>
    </span>
  )
}

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
}

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

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 500,
  noun,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  noun: string
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <IconButton
        icon={Minus}
        label={`Decrease ${noun}`}
        className="border border-line bg-surface"
        onClick={() => onChange(Math.max(min, value - 1))}
      />
      <output aria-live="polite" className="min-w-12 text-center text-[16px] font-semibold">
        {value}
      </output>
      <IconButton
        icon={Plus}
        label={`Increase ${noun}`}
        className="border border-line bg-surface"
        onClick={() => onChange(Math.min(max, value + 1))}
      />
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: {
  options: { value: T; label: string; icon?: LucideIcon }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex gap-1 rounded-xl border border-line bg-sunk p-1 ${className}`}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`tx inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-[14px] font-semibold ${on ? 'bg-ink text-white' : 'text-ink hover:bg-surface'}`}
          >
            {o.icon && <Icon icon={o.icon} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-3 text-[14px] font-medium text-ink"
    >
      <span
        className={`tx relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border ${checked ? 'border-ink bg-ink' : 'border-ink-muted bg-surface'}`}
      >
        <span
          className={`tx absolute left-1 size-4 rounded-full ${checked ? 'translate-x-4 bg-white' : 'bg-ink-muted'}`}
        />
      </span>
      {label}
      <span className="sr-only">{checked ? 'on' : 'off'}</span>
    </button>
  )
}
