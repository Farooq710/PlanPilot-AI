import { NextResponse } from 'next/server'
import { getActivePlan } from '@/lib/active-event'
import { EXPORTS, type ExportKind } from '@/lib/exports'

export const dynamic = 'force-dynamic'

/**
 * Serves one export. The kind is checked against a fixed map rather than used
 * to look anything up directly, so an unexpected value can only ever 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params

  if (!Object.hasOwn(EXPORTS, kind)) {
    return NextResponse.json({ error: 'Unknown export' }, { status: 404 })
  }

  const plan = await getActivePlan()
  if (!plan) {
    return NextResponse.json({ error: 'No active plan' }, { status: 404 })
  }

  const file = EXPORTS[kind as ExportKind](plan)

  return new NextResponse(file.body, {
    headers: {
      'Content-Type': file.contentType,
      // The filename is derived from the event title and already slugified.
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
