import type { ReactNode } from 'react'
import Brief from './screens/Brief'
import Research from './screens/Research'
import Command from './screens/Command'
import WhatIf from './screens/WhatIf'
import Execution from './screens/Execution'

const DESKTOP = [
  { id: '01-brief-desktop', w: 1440, h: 900, el: <Brief /> },
  { id: '02-research-desktop', w: 1440, h: 900, el: <Research /> },
  { id: '03-command-desktop', w: 1440, h: 1200, el: <Command /> },
  { id: '04-whatif-desktop', w: 1440, h: 900, el: <WhatIf /> },
  { id: '05-execution-desktop', w: 1440, h: 1100, el: <Execution /> },
]
const MOBILE = [
  { id: '06-brief-mobile', w: 375, h: 812, el: <Brief mobile /> },
  { id: '07-command-mobile', w: 375, h: 1400, el: <Command mobile /> },
  { id: '08-whatif-mobile', w: 375, h: 1100, el: <WhatIf mobile /> },
]

function Frame({ id, w, h, children }: { id: string; w: number; h: number; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-2 text-[14px] font-semibold">
        {id} <span className="font-normal text-ink-muted">{w}x{h}</span>
      </h2>
      <div style={{ width: w, height: h }} className="relative overflow-hidden border border-line bg-canvas shadow-raised">
        {children}
      </div>
    </section>
  )
}

export default function App() {
  const all = [...DESKTOP, ...MOBILE]
  return (
    <div className="w-max min-w-full">
      <nav
        aria-label="Frames"
        className="sticky top-0 z-50 flex items-center gap-2 border-b border-line bg-surface px-12 py-2"
      >
        <span className="mr-4 text-[16px] font-semibold">PlanPilot AI screens</span>
        {all.map((f) => (
          <a
            key={f.id}
            href={`#${f.id}`}
            className="tx inline-flex min-h-11 items-center rounded-xl px-3 text-[14px] font-medium hover:bg-sunk"
          >
            {f.id.slice(0, 2)}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-12 p-12">
        {DESKTOP.map((f) => (
          <Frame key={f.id} {...f}>
            {f.el}
          </Frame>
        ))}
        <div className="flex items-start gap-12">
          {MOBILE.map((f) => (
            <Frame key={f.id} {...f}>
              {f.el}
            </Frame>
          ))}
        </div>
      </div>
    </div>
  )
}
