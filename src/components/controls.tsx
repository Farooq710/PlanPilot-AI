'use client'

import type { ButtonHTMLAttributes } from 'react'
import { Minus, Plus, type LucideIcon } from 'lucide-react'
import { Icon } from './ui'

/**
 * Interactive primitives, ported from the Figma Make reference. Every control
 * clears the 44px minimum target and carries an accessible name.
 */

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

export function Button({
  variant = 'primary',
  icon,
  full,
  className = '',
  children,
  ...p
}: BtnProps) {
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

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 5000,
  step = 1,
  noun,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  step?: number
  noun: string
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <IconButton
        icon={Minus}
        label={`Decrease ${noun}`}
        className="border border-line bg-surface"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      />
      <output aria-live="polite" className="min-w-12 text-center text-[16px] font-semibold">
        {value}
      </output>
      <IconButton
        icon={Plus}
        label={`Increase ${noun}`}
        className="border border-line bg-surface"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
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
    </button>
  )
}
