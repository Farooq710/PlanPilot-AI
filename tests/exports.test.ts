import { describe, expect, it } from 'vitest'
import {
  budgetCsv,
  calendarIcs,
  checklistCsv,
  csvCell,
  runOfShowMarkdown,
  toCsv,
} from '@/lib/exports'
import { makePlan, makeVendor } from './helpers'

describe('csvCell', () => {
  it('quotes separators, quotes and newlines', () => {
    expect(csvCell('Sharma, Sons')).toBe('"Sharma, Sons"')
    expect(csvCell('He said "yes"')).toBe('"He said ""yes"""')
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"')
  })

  it('neutralises spreadsheet formula injection', () => {
    // A vendor name starting with = would otherwise execute in Excel.
    expect(csvCell('=1+1')).toBe("'=1+1")
    expect(csvCell('+44 20 1234')).toBe("'+44 20 1234")
    expect(csvCell('-5')).toBe("'-5")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('passes ordinary values straight through', () => {
    expect(csvCell('Venue')).toBe('Venue')
    expect(csvCell(6250)).toBe('6250')
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })
})

describe('toCsv', () => {
  it('uses CRLF line endings and a BOM so Excel reads UTF-8', () => {
    const csv = toCsv([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('\r\n')
  })
})

describe('budgetCsv', () => {
  const plan = makePlan()
  const file = budgetCsv(plan)

  it('names the file after the event', () => {
    expect(file.filename).toBe('test-birthday-budget.csv')
    expect(file.contentType).toMatch(/text\/csv/)
  })

  it('includes every budget line and its evidence', () => {
    for (const item of plan.budget) {
      expect(file.body).toContain(item.label)
    }
    expect(file.body).toContain('estimate')
  })

  it('carries the totals', () => {
    expect(file.body).toContain('Total planned')
    expect(file.body).toContain('25000')
  })
})

describe('checklistCsv', () => {
  it('resolves dependency ids to readable task titles', () => {
    const plan = makePlan()
    const dependent = plan.tasks.find((t) => t.dependsOn.length > 0)
    expect(dependent, 'fixture should include a dependent task').toBeDefined()

    const body = checklistCsv(plan).body
    const blockerTitle = plan.tasks.find((t) => t.id === dependent!.dependsOn[0])!.title

    expect(body).toContain(blockerTitle)
    // The raw id must not leak into a file a human reads.
    expect(body).not.toContain(dependent!.dependsOn[0])
  })
})

describe('runOfShowMarkdown', () => {
  const plan = makePlan({
    vendors: [makeVendor({ name: 'Confirmed Venue', confirmed: true, priceINR: 6_000 })],
  })
  const file = runOfShowMarkdown(plan)

  it('opens with the event as a heading', () => {
    expect(file.body.startsWith('# Test Birthday')).toBe(true)
  })

  it('includes the run of show, budget, suppliers and risks', () => {
    expect(file.body).toContain('## Run of show')
    expect(file.body).toContain('## Budget')
    expect(file.body).toContain('## Confirmed suppliers')
    expect(file.body).toContain('## Open risks')
    expect(file.body).toContain('Confirmed Venue')
  })

  it('states that an estimate is not a quote', () => {
    expect(file.body).toMatch(/estimate is not a quote/i)
  })

  it('labels sample data when the plan is flagged', () => {
    const sample = runOfShowMarkdown(makePlan({ usingSampleData: true }))
    expect(sample.body).toMatch(/sample data/i)
  })
})

describe('calendarIcs', () => {
  const plan = makePlan()
  const file = calendarIcs(plan)

  it('produces a well-formed calendar', () => {
    expect(file.body.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(file.body.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(file.contentType).toMatch(/text\/calendar/)
    expect(file.filename.endsWith('.ics')).toBe(true)
  })

  it('includes the event, each run-of-show slot and the open tasks', () => {
    const events = file.body.match(/BEGIN:VEVENT/g) ?? []
    const openTasks = plan.tasks.filter((t) => t.status !== 'done').length

    // One for the event itself, plus every slot, plus every open task.
    expect(events).toHaveLength(1 + plan.schedule.length + openTasks)
    expect(file.body).toContain('Test Birthday')
    expect(file.body).toContain('Prep:')
  })

  it('every VEVENT is closed', () => {
    const opens = (file.body.match(/BEGIN:VEVENT/g) ?? []).length
    const closes = (file.body.match(/END:VEVENT/g) ?? []).length
    expect(opens).toBe(closes)
  })
})
