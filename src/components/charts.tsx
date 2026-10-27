import type { BudgetItem } from '@/lib/schemas'
import { CATEGORY_LABEL } from '@/lib/engines/budget'
import { readinessTone } from '@/lib/engines/readiness'
import { inr, pctOf } from '@/lib/money'

/**
 * Charts as plain SVG. The reference did the same, and it is the better choice
 * here: no charting dependency, exact control of the tokens, and a real
 * `role="img"` with a written summary rather than a canvas a screen reader
 * cannot enter. Every chart is paired with the same data as a table.
 */

const TONE_FILL = {
  ok: 'var(--color-ok)',
  warn: 'var(--color-warn-fill)',
  danger: 'var(--color-danger)',
} as const

/* ------------------------------------------------------------- readiness */

export function ReadinessGauge({ score }: { score: number }) {
  const tone = readinessTone(score)
  // A 180° arc: radius 90, centred at (110, 110).
  const r = 90
  const circumference = Math.PI * r
  const filled = (score / 100) * circumference

  return (
    <svg
      viewBox="0 0 220 128"
      className="w-full max-w-[260px]"
      role="img"
      aria-label={`Readiness ${score} out of 100`}
    >
      <g transform="rotate(-180 110 110)">
        <path
          d={`M 20 110 A ${r} ${r} 0 0 1 200 110`}
          fill="none"
          stroke="var(--color-sunk)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d={`M 20 110 A ${r} ${r} 0 0 1 200 110`}
          fill="none"
          stroke={TONE_FILL[tone]}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
      </g>
      <text
        x="110"
        y="98"
        textAnchor="middle"
        className="display"
        fontSize="40"
        fill="var(--color-ink)"
      >
        {score}
      </text>
      <text x="110" y="120" textAnchor="middle" fontSize="13" fill="var(--color-ink-muted)">
        out of 100
      </text>
    </svg>
  )
}

/* ----------------------------------------------------------------- donut */

/**
 * Six categories, which is the limit before a donut stops being readable.
 * Each slice is also written out in the legend with its value, so the chart
 * never carries meaning by colour alone.
 */
const SLICE_COLOURS: Record<string, string> = {
  venue: '#2F6FBF',
  food: '#E0564A',
  decor: '#1A7F55',
  cake: '#B5761B',
  activities: '#6B7280',
  contingency: '#111B33',
}

export function BudgetDonut({ items, budgetINR }: { items: BudgetItem[]; budgetINR: number }) {
  const total = items.reduce((sum, i) => sum + i.plannedINR, 0)
  const r = 70
  const circumference = 2 * Math.PI * r

  let offset = 0
  const slices = items.map((item) => {
    const share = total > 0 ? item.plannedINR / total : 0
    const length = share * circumference
    const slice = {
      item,
      length,
      offset,
      colour: SLICE_COLOURS[item.category] ?? 'var(--color-ink-muted)',
      pct: Math.round(share * 100),
    }
    offset += length
    return slice
  })

  const summary = slices
    .map((s) => `${CATEGORY_LABEL[s.item.category]} ${inr(s.item.plannedINR)}`)
    .join(', ')

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        viewBox="0 0 180 180"
        className="size-44 shrink-0"
        role="img"
        aria-label={`Budget split totalling ${inr(total)}: ${summary}`}
      >
        <g transform="rotate(-90 90 90)">
          {slices.map((s) => (
            <circle
              key={s.item.id}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={s.colour}
              strokeWidth="26"
              strokeDasharray={`${s.length} ${circumference - s.length}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </g>
        <text
          x="90"
          y="86"
          textAnchor="middle"
          className="display"
          fontSize="22"
          fill="var(--color-ink)"
        >
          {inr(total)}
        </text>
        <text x="90" y="104" textAnchor="middle" fontSize="11" fill="var(--color-ink-muted)">
          of {inr(budgetINR)}
        </text>
      </svg>

      {/* The legend carries the values, so the chart is never the only source. */}
      <ul className="flex min-w-48 flex-1 flex-col gap-1 text-[14px]">
        {slices.map((s) => (
          <li key={s.item.id} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm"
              style={{ background: s.colour }}
            />
            <span className="flex-1">{CATEGORY_LABEL[s.item.category]}</span>
            <span className="text-ink-muted">{s.pct}%</span>
            <span className="w-20 text-right font-semibold">{inr(s.item.plannedINR)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------- planned vs actual */

export function PlannedVsActual({ items }: { items: BudgetItem[] }) {
  const max = Math.max(...items.map((i) => Math.max(i.plannedINR, i.actualINR ?? 0)), 1)

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const actual = item.actualINR ?? 0
        const over = actual > item.plannedINR
        return (
          <li key={item.id}>
            <div className="flex items-baseline justify-between text-[14px]">
              <span className="font-medium">{CATEGORY_LABEL[item.category]}</span>
              <span className={over ? 'font-semibold text-danger' : 'text-ink-muted'}>
                {inr(actual)} of {inr(item.plannedINR)}
                {over && ` · ${inr(actual - item.plannedINR)} over`}
              </span>
            </div>
            <div className="mt-1 flex flex-col gap-1">
              <Bar
                width={pctOf(item.plannedINR, max)}
                colour="var(--color-sunk)"
                label={`${CATEGORY_LABEL[item.category]} planned ${inr(item.plannedINR)}`}
              />
              <Bar
                width={pctOf(actual, max)}
                colour={over ? 'var(--color-danger)' : 'var(--color-ok)'}
                label={`${CATEGORY_LABEL[item.category]} actual ${inr(actual)}`}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Bar({ width, colour, label }: { width: number; colour: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-sunk"
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, width)}%`, background: colour }}
      />
    </div>
  )
}

/* ------------------------------------------------------ table alternative */

/**
 * The same figures as a table, in a disclosure. Uses details/summary so it
 * needs no JavaScript and is reachable by keyboard by default.
 */
export function BudgetTable({ items }: { items: BudgetItem[] }) {
  return (
    <details className="mt-4">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] font-semibold text-accent">
        View as table
      </summary>
      <table className="mt-2 w-full text-[14px]">
        <caption className="sr-only">
          Planned against actual spend by category, the same figures as the donut chart
        </caption>
        <thead className="bg-sunk text-left text-ink-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Category</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Planned</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Actual</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-line">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                {CATEGORY_LABEL[item.category]}
              </th>
              <td className="px-3 py-2 text-right">{inr(item.plannedINR)}</td>
              <td className="px-3 py-2 text-right">{inr(item.actualINR ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
