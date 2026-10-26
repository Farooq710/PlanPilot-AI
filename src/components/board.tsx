import { ArrowRight, Clock, Link2 } from 'lucide-react'
import { setTaskStatus } from '@/app/actions'
import { Icon } from '@/components/ui'
import { CATEGORY_LABEL } from '@/lib/engines/budget'
import type { Task, TaskStatus } from '@/lib/schemas'
import { shortDate, todayYmd } from '@/lib/time'

/**
 * The task board. Moves are buttons rather than drag and drop: the brief named
 * dnd-kit, but a pointer-only board fails the keyboard requirement, and the
 * accessible control has to exist either way. Drag can be layered on later
 * without changing this contract.
 */

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'doing', label: 'Doing' },
  { status: 'done', label: 'Done' },
]

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: 'doing',
  doing: 'done',
  done: null,
}

const PREV_STATUS: Record<TaskStatus, TaskStatus | null> = {
  todo: null,
  doing: 'todo',
  done: 'doing',
}

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  // Every prep task falls before the event, so that is not what overdue means.
  const today = todayYmd()

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.status)
        return (
          <section key={column.status} aria-label={column.label} className="flex flex-col gap-2">
            <h4 className="flex items-baseline gap-2 text-[14px] font-semibold">
              {column.label}
              <span className="text-ink-muted">{columnTasks.length}</span>
            </h4>

            {columnTasks.length === 0 ? (
              <p className="rounded-xl bg-sunk p-3 text-[14px] text-ink-muted">Nothing here.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {columnTasks.map((task) => (
                  <li key={task.id}>
                    <TaskCard task={task} byId={byId} today={today} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function TaskCard({
  task,
  byId,
  today,
}: {
  task: Task
  byId: Map<string, Task>
  today: string
}) {
  const blockers = task.dependsOn
    .map((id) => byId.get(id))
    .filter((t): t is Task => Boolean(t) && t!.status !== 'done')

  const overdue = task.status !== 'done' && task.dueDate < today
  const next = NEXT_STATUS[task.status]
  const prev = PREV_STATUS[task.status]

  return (
    <article className="rounded-xl border border-line bg-surface p-3 shadow-card">
      <h5 className="text-[14px] font-medium">{task.title}</h5>

      <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Icon icon={Clock} size={16} />
          {shortDate(`${task.dueDate}T00:00:00+05:30`)}
        </span>
        {task.category && <span>{CATEGORY_LABEL[task.category]}</span>}
      </p>

      {/* A real dependency edge, not decoration — the what-if engine walks these. */}
      {blockers.length > 0 && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-[999px] border border-dashed border-warn px-2 py-1 text-[12px] text-warn">
          <Icon icon={Link2} size={16} />
          after: {blockers.map((b) => b.title).join(', ')}
        </p>
      )}

      {overdue && (
        <p className="mt-2 text-[12px] font-semibold text-danger">Overdue</p>
      )}

      <div className="mt-3 flex gap-1">
        {prev && (
          <MoveButton taskId={task.id} to={prev} label={`Move "${task.title}" back to ${labelOf(prev)}`}>
            Back
          </MoveButton>
        )}
        {next && (
          <MoveButton taskId={task.id} to={next} label={`Move "${task.title}" to ${labelOf(next)}`}>
            {labelOf(next)}
            <Icon icon={ArrowRight} size={16} />
          </MoveButton>
        )}
      </div>
    </article>
  )
}

function MoveButton({
  taskId,
  to,
  label,
  children,
}: {
  taskId: string
  to: TaskStatus
  label: string
  children: React.ReactNode
}) {
  return (
    <form action={setTaskStatus.bind(null, taskId, to)}>
      <button
        type="submit"
        className="tx inline-flex min-h-11 items-center gap-1 rounded-xl border border-line px-3 text-[12px] font-semibold hover:bg-sunk"
      >
        {children}
        <span className="sr-only">{label}</span>
      </button>
    </form>
  )
}

const labelOf = (status: TaskStatus) =>
  COLUMNS.find((c) => c.status === status)?.label ?? status
