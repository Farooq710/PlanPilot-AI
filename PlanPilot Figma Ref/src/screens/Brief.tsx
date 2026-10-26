import { useState, type ReactNode } from 'react'
import {
  Armchair,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  MapPin,
  Pencil,
  Trees,
  Users,
} from 'lucide-react'
import { DesktopShell, MobileShell } from '../chrome'
import { IMG, inr, num } from '../data'
import { Button, Card, Icon, IconButton, Label, Segmented, Stepper, inputCls } from '../ui'

const TYPES = ['Birthday', 'Wedding', 'Community', 'Corporate']
const STYLES = [
  { n: 'Premium', img: IMG.premium, alt: 'Candlelit banquet table with white feathers' },
  { n: 'Minimal', img: IMG.minimal, alt: 'White petaled flowers on a white surface' },
  { n: 'Festive', img: IMG.festive, alt: 'Marigold flowers on a wooden table' },
  { n: 'Rustic', img: IMG.rustic, alt: 'Candles and a lantern on a wooden table' },
  { n: 'Kids', img: IMG.kids, alt: 'Assorted coloured balloons' },
]

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

function Pill({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`tx inline-flex min-h-11 items-center gap-2 rounded-[999px] border px-4 text-[14px] font-semibold ${on ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:bg-sunk'}`}
    >
      {on && <Icon icon={Check} />}
      {children}
    </button>
  )
}

function Chip({ on, children, onClick }: { on?: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tx inline-flex min-h-11 items-center rounded-[999px] border px-4 text-[14px] font-medium ${on ? 'border-ink bg-sunk' : 'border-line bg-surface hover:bg-sunk'}`}
    >
      {children}
    </button>
  )
}

function Summary({ icon, label, value, onEdit }: { icon: typeof Users; label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface py-1 pl-4 pr-1">
      <Icon icon={icon} className="text-ink-muted" />
      <p className="min-w-0 flex-1 truncate text-[14px]">
        <span className="text-ink-muted">{label}</span> <span className="font-medium">{value}</span>
      </p>
      <IconButton icon={Pencil} label={`Edit ${label.toLowerCase()}`} onClick={onEdit} />
    </div>
  )
}

export default function Brief({ mobile = false }: { mobile?: boolean }) {
  const [group, setGroup] = useState(mobile ? 3 : 2)
  const [type, setType] = useState('Birthday')
  const [city, setCity] = useState('Hyderabad')
  const [date, setDate] = useState('2025-11-01')
  const [guests, setGuests] = useState(40)
  const [budget, setBudget] = useState(mobile ? 25000 : 2000)
  const [setting, setSetting] = useState<'Indoor' | 'Outdoor'>('Outdoor')
  const [styles, setStyles] = useState<string[]>(['Premium'])
  const [notes, setNotes] = useState('')

  const min = guests * 375
  const budgetErr = budget < min
  const toggleStyle = (n: string) => setStyles((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))
  const demo = () => {
    setType('Birthday')
    setCity('Hyderabad')
    setDate('2025-11-01')
    setGuests(40)
    setBudget(25000)
    setSetting('Outdoor')
    setStyles(['Premium'])
    setGroup(3)
  }

  const body = (
    <div className={`mx-auto w-full max-w-[720px] ${mobile ? 'px-4 py-6' : 'px-8 py-8'}`}>
      <h2 className={`display ${mobile ? 'text-[28px]' : 'text-[40px]'}`}>Let's plan your celebration.</h2>
      <div className="mt-3 flex items-center gap-3 text-[14px] text-ink-muted">
        <span className="font-medium text-ink">Step {group} of 4</span>
        <span className="flex gap-2" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`size-2 rounded-full ${i <= group ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {group > 1 && (
          <Summary
            icon={CalendarDays}
            label="Event"
            value={`${type} · ${city} · ${fmtDate(date)}`}
            onEdit={() => setGroup(1)}
          />
        )}
        {group > 2 && (
          <Summary
            icon={Users}
            label="Guests & budget"
            value={`${guests} guests · ${inr(budget)} · ${setting}`}
            onEdit={() => setGroup(2)}
          />
        )}
      </div>

      <Card key={group} className="rise mt-4 p-6">
        {group === 1 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-[20px] font-semibold">What are we celebrating?</h3>
            <div>
              <Label>Event type</Label>
              <div role="radiogroup" aria-label="Event type" className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <Pill key={t} on={t === type} onClick={() => setType(t)}>
                    {t}
                  </Pill>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <div className="relative">
                <Icon icon={MapPin} className="pointer-events-none absolute left-3 top-3 text-ink-muted" />
                <input id="city" className={`${inputCls} pl-10`} value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <div className="flex flex-wrap gap-2">
                <input id="date" type="date" className={`${inputCls} max-w-56`} value={date} onChange={(e) => setDate(e.target.value)} />
                <Chip on={date === '2025-11-01'} onClick={() => setDate('2025-11-01')}>
                  Next Saturday
                </Chip>
              </div>
            </div>
            <Button variant="outline" className="self-end" onClick={() => setGroup(2)}>
              Next: guests and budget
            </Button>
          </div>
        )}

        {group === 2 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-[20px] font-semibold">Who is coming, and what can you spend?</h3>
            <div className="flex items-center justify-between gap-4">
              <Label>Guest count</Label>
              <Stepper value={guests} onChange={setGuests} noun="guests" />
            </div>
            <div>
              <Label htmlFor="budget">Budget</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-[10px] text-[16px] text-ink-muted">Rs</span>
                <input
                  id="budget"
                  inputMode="numeric"
                  aria-invalid={budgetErr}
                  aria-describedby={budgetErr ? 'budget-err' : undefined}
                  className={`${inputCls} pl-10 ${budgetErr ? 'border-danger' : ''}`}
                  value={budget ? num(budget) : ''}
                  onChange={(e) => setBudget(Number(e.target.value.replace(/\D/g, '')) || 0)}
                />
              </div>
              {budgetErr && (
                <p id="budget-err" className="mt-2 flex items-start gap-2 text-[14px] text-danger">
                  <Icon icon={CircleAlert} className="mt-0.5" />
                  {inr(budget)} is below the minimum for {guests} guests. Try {inr(min)} or raise it later.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {[25000, 50000, 100000].map((b) => (
                  <Chip key={b} on={b === budget} onClick={() => setBudget(b)}>
                    {inr(b)}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label>Setting</Label>
              <Segmented
                label="Indoor or outdoor"
                value={setting}
                onChange={setSetting}
                options={[
                  { value: 'Indoor', label: 'Indoor', icon: Armchair },
                  { value: 'Outdoor', label: 'Outdoor', icon: Trees },
                ]}
              />
            </div>
            <Button variant="outline" className="self-end" onClick={() => setGroup(3)}>
              Next: style
            </Button>
          </div>
        )}

        {group === 3 && (
          <div className="flex flex-col gap-6">
            <h3 className="text-[20px] font-semibold">What should it feel like?</h3>
            <div>
              <Label>Style (pick any)</Label>
              <div className={`grid gap-2 ${mobile ? 'grid-cols-3' : 'grid-cols-5'}`}>
                {STYLES.map((s) => {
                  const on = styles.includes(s.n)
                  return (
                    <button
                      key={s.n}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleStyle(s.n)}
                      className={`tx relative aspect-[3/4] overflow-hidden rounded-xl border-2 bg-sunk text-left ${on ? 'border-accent' : 'border-transparent'}`}
                    >
                      <img src={s.img} alt={s.alt} className="absolute inset-0 size-full object-cover" />
                      {on && (
                        <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-white">
                          <Check size={16} strokeWidth={2} aria-hidden />
                        </span>
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-ink/65 px-2 py-2 text-[14px] font-semibold text-white">
                        {s.n}
                        {on && <span className="sr-only"> (selected)</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Constraints</Label>
              <textarea
                id="notes"
                rows={3}
                className={`${inputCls} py-3`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="mt-2 text-[14px] text-ink-muted">
                For example: vegetarian only, no alcohol, parking needed.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Button full icon={ArrowRight} className="mt-4 !min-h-12 !text-[16px]">
        Build my event plan
      </Button>
      <button
        type="button"
        onClick={demo}
        className="mx-auto mt-2 flex min-h-11 items-center px-4 text-[14px] font-medium text-accent underline"
      >
        Use the demo brief
      </button>
    </div>
  )

  return mobile ? (
    <MobileShell current="brief" draft>
      {body}
    </MobileShell>
  ) : (
    <DesktopShell current="brief" draft>
      {body}
    </DesktopShell>
  )
}

