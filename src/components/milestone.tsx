import { Hammer } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, Icon } from './ui'

/**
 * Placeholder for a screen that lands in a later milestone. Keeps the shell
 * navigable through M1 without pretending the screen exists.
 */
export function Milestone({
  title,
  milestone,
  children,
}: {
  title: string
  milestone: string
  children: ReactNode
}) {
  return (
    <div className="p-6 lg:p-8">
      <Card className="max-w-prose p-6">
        <span className="inline-flex items-center gap-1 rounded-[999px] border border-line bg-sunk px-2 py-1 text-[12px] font-semibold text-ink-muted">
          <Icon icon={Hammer} size={16} />
          {milestone}
        </span>
        <h2 className="display mt-3 text-[28px]">{title}</h2>
        <p className="mt-2 text-[16px] text-ink-muted">{children}</p>
      </Card>
    </div>
  )
}
