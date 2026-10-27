import ical from 'ical-generator'
import { CATEGORY_LABEL, budgetTotals } from '@/lib/engines/budget'
import { scoreReadiness } from '@/lib/engines/readiness'
import { inr } from '@/lib/money'
import type { Plan } from '@/lib/schemas'
import { IST, clockTime, shortDate } from '@/lib/time'

/**
 * Export builders. Each returns a string plus the headers it needs, so the
 * route handlers stay thin and the formatting is unit-testable without a
 * running server.
 */

export type ExportFile = {
  filename: string
  contentType: string
  body: string
}

/** Safe for a filename on every platform. */
function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'event'
  )
}

/* -------------------------------------------------------------------- CSV */

/**
 * RFC 4180 quoting. A vendor called `Sharma, Sons "Catering"` must not break
 * the file, and a field starting with = + - @ is prefixed so a spreadsheet
 * treats it as text rather than a formula.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  // Defuse spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows: (string | number | null)[][]): string {
  // CRLF and a UTF-8 BOM so Excel opens rupee symbols correctly.
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function budgetCsv(plan: Plan): ExportFile {
  const totals = budgetTotals(plan.budget, plan.event.budgetINR)

  const rows: (string | number | null)[][] = [
    ['Category', 'Line', 'Planned INR', 'Actual INR', 'Per head INR', 'Evidence', 'Source'],
    ...plan.budget.map((item) => [
      CATEGORY_LABEL[item.category],
      item.label,
      item.plannedINR,
      item.actualINR ?? '',
      item.perHead ?? '',
      item.evidence.status,
      item.evidence.sourceUrl ?? '',
    ]),
    [],
    ['Total planned', '', totals.planned, totals.actual, '', '', ''],
    ['Budget', '', plan.event.budgetINR, '', '', '', ''],
    ['Remaining', '', plan.event.budgetINR - totals.planned, totals.remaining, '', '', ''],
  ]

  return {
    filename: `${slug(plan.event.title)}-budget.csv`,
    contentType: 'text/csv; charset=utf-8',
    body: toCsv(rows),
  }
}

export function checklistCsv(plan: Plan): ExportFile {
  const byId = new Map(plan.tasks.map((t) => [t.id, t.title]))

  const rows: (string | number | null)[][] = [
    ['Task', 'Due date', 'Status', 'Category', 'Depends on'],
    ...plan.tasks.map((task) => [
      task.title,
      task.dueDate,
      task.status,
      task.category ? CATEGORY_LABEL[task.category] : '',
      task.dependsOn.map((id) => byId.get(id) ?? id).join('; '),
    ]),
  ]

  return {
    filename: `${slug(plan.event.title)}-checklist.csv`,
    contentType: 'text/csv; charset=utf-8',
    body: toCsv(rows),
  }
}

/* ------------------------------------------------------------ run of show */

export function runOfShowMarkdown(plan: Plan): ExportFile {
  const { event } = plan
  const readiness = scoreReadiness(plan)
  const totals = budgetTotals(plan.budget, event.budgetINR)

  const lines: string[] = [
    `# ${event.title}`,
    '',
    `${shortDate(`${event.date}T00:00:00+05:30`)} · ${event.city} · ${event.guestCount} guests`,
    `Budget ${inr(event.budgetINR)} · allocated ${inr(totals.planned)} · readiness ${readiness.score}/100`,
    '',
    '## Run of show',
    '',
  ]

  if (plan.schedule.length === 0) {
    lines.push('_No run of show recorded._', '')
  } else {
    lines.push('| Time | Item | Duration |', '| --- | --- | --- |')
    for (const slot of [...plan.schedule].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
      lines.push(`| ${clockTime(slot.startsAt)} | ${slot.title} | ${slot.durationMinutes} min |`)
    }
    lines.push('')
  }

  lines.push('## Budget', '', '| Category | Planned | Actual | Evidence |', '| --- | --- | --- | --- |')
  for (const item of plan.budget) {
    lines.push(
      `| ${CATEGORY_LABEL[item.category]} | ${inr(item.plannedINR)} | ${inr(item.actualINR ?? 0)} | ${item.evidence.status} |`,
    )
  }

  const confirmed = plan.vendors.filter((v) => v.confirmed)
  lines.push('', '## Confirmed suppliers', '')
  if (confirmed.length === 0) {
    lines.push('_Nothing confirmed yet._')
  } else {
    for (const vendor of confirmed) {
      lines.push(
        `- **${vendor.name}** (${vendor.category}) — ${vendor.priceINR === null ? 'price unknown' : inr(vendor.priceINR)}${vendor.sourceUrl ? ` · ${vendor.sourceUrl}` : ''}`,
      )
    }
  }

  const openRisks = plan.risks.filter((r) => r.status !== 'mitigated')
  lines.push('', '## Open risks', '')
  if (openRisks.length === 0) {
    lines.push('_None._')
  } else {
    for (const risk of openRisks) {
      lines.push(`- **${risk.title}** (${risk.severity}, ${risk.status}) — ${risk.mitigation ?? 'no mitigation recorded'}`)
    }
  }

  lines.push(
    '',
    '---',
    '',
    plan.usingSampleData
      ? '_Contains sample data, not live figures._'
      : '_Figures carry the evidence label shown against each line. An estimate is not a quote._',
  )

  return {
    filename: `${slug(plan.event.title)}-run-of-show.md`,
    contentType: 'text/markdown; charset=utf-8',
    body: lines.join('\n'),
  }
}

/* -------------------------------------------------------------------- ICS */

export function calendarIcs(plan: Plan): ExportFile {
  const calendar = ical({ name: plan.event.title, timezone: IST })

  // The event itself, from the first slot to the end of the last.
  const sorted = [...plan.schedule].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const start = sorted[0]
    ? new Date(sorted[0].startsAt)
    : new Date(`${plan.event.date}T${plan.event.time}:00+05:30`)
  const last = sorted.at(-1)
  const end = last
    ? new Date(new Date(last.startsAt).getTime() + last.durationMinutes * 60_000)
    : new Date(start.getTime() + 4 * 3_600_000)

  calendar.createEvent({
    start,
    end,
    summary: plan.event.title,
    location: plan.event.city,
    description: `${plan.event.guestCount} guests · budget ${inr(plan.event.budgetINR)}`,
  })

  // Each run-of-show slot, so the organiser can see the shape of the evening.
  for (const slot of sorted) {
    const slotStart = new Date(slot.startsAt)
    calendar.createEvent({
      start: slotStart,
      end: new Date(slotStart.getTime() + slot.durationMinutes * 60_000),
      summary: slot.title,
      location: plan.event.city,
      description: slot.note ?? '',
    })
  }

  // Prep tasks as all-day entries on their due dates.
  for (const task of plan.tasks.filter((t) => t.status !== 'done')) {
    calendar.createEvent({
      start: new Date(`${task.dueDate}T00:00:00+05:30`),
      allDay: true,
      summary: `Prep: ${task.title}`,
      description: task.category ? CATEGORY_LABEL[task.category] : '',
    })
  }

  return {
    filename: `${slug(plan.event.title)}.ics`,
    contentType: 'text/calendar; charset=utf-8',
    body: calendar.toString(),
  }
}

/* ------------------------------------------------------------------ index */

export const EXPORTS = {
  'run-of-show': runOfShowMarkdown,
  checklist: checklistCsv,
  budget: budgetCsv,
  calendar: calendarIcs,
} as const

export type ExportKind = keyof typeof EXPORTS
export const EXPORT_KINDS = Object.keys(EXPORTS) as ExportKind[]
