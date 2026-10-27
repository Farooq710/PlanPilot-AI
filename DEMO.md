# Demo script — 2 minutes

The pitch in one line: **not "AI plans events", but sourced research,
change-impact logic and an explained readiness score.**

## Before you start

```bash
npm run build && npm start
```

1. Open `/research` once and let the venue panel finish. Overpass takes 30–50
   seconds cold and is cached afterwards. **Do this before you present.**
2. Open `/brief` and leave it on screen.
3. Have `/api/selftest` open in a second tab as a backup.

If the network dies on stage, the app still runs: the sample-data banner
appears and every screen keeps working. That is a feature to point at, not an
apology.

---

## The run

### 0:00 — The brief (20s)

> "An outdoor birthday in Hyderabad. 40 guests, next Saturday, ₹25,000."

Click **Use the demo brief**, then **Build my event plan**.

Say while it builds:

> "The questions come a few at a time, and every answer collapses into
> something you can edit. The budget is computed before any model is involved."

### 0:20 — Command Center (35s)

Land on the readiness score. **This is the centrepiece — spend time here.**

> "Readiness is 20 out of 100, and it tells you exactly why."

Read two deductions aloud:

```
−30  venue and food not confirmed    Fix next: Confirm a venue from the shortlist
−15  Weather risk unresolved         Fix next: Run research to fetch the forecast
```

> "Every point you have lost is attributable, and each one names the single
> action that recovers it. Most planners give you a number. This gives you the
> next move."

Scroll past the budget donut:

> "Venue 25, food 35, decor 15, cake 8, activities 7, contingency 10. It lands
> on ₹25,000 exactly, not near it — the rounding remainder is swept into
> contingency."

### 0:55 — Research Room (30s)

> "Every option carries where it came from."

Point at a venue card:

> "These are real places from OpenStreetMap, near Hyderabad. OSM records the
> place but not its pricing — so price and capacity say **Unknown**, and the
> missing-information panel says so too. It would be easy to invent a plausible
> number here. We refuse to."

Point at the weather strip:

> "Live forecast from Open-Meteo. If the date were beyond the fifteen-day
> window, this would read *unknown* rather than guess."

### 1:25 — What-If Lab (30s)

**The money shot.** Go to `/whatif?guests=55`.

> "Fifteen more guests."

Let the diff speak:

```
Food     ₹8,750  →  ₹12,045   +₹3,295
Cake     ₹2,000  →  ₹2,750    +₹750
Venue hire, Decor, Activities, Contingency ... Unchanged
```

> "Catering and cake move. Venue hire, decor and activities do not — they do
> not scale with headcount. The cascade on the right traces it: guests into
> catering, cake size, seating, invitations, venue capacity. And it warns that
> the plan is now ₹4,045 over budget."

> "The point is not that the numbers moved. It is that the *right* numbers
> moved. A planner you can't trust to hold the rest still is one you stop
> using."

### 1:55 — Execution Pack (5s)

> "Run of show, checklist, budget and a calendar file — and a read-only link
> you can send to the caterer."

---

## If someone asks

**"Is the AI making up the prices?"**
No. The model never returns a number the app uses. Every figure is computed, and
anything from the web carries its source, fetch time and a trust label. Where a
price was read from a page by pattern matching, it is labelled an estimate, not
a quote.

**"What happens when an API is down?"**
The plan still builds. A failed source degrades its own category: weather goes
unknown, venues show a retry, and if everything fails there is a labelled
sample dataset behind a banner. Nothing silently fabricates a value.

**"Is it tested?"**
86 unit tests, plus acceptance tests at `/api/selftest` that run against a
deployment. The useful half of the scenario tests asserts what must *not*
change.

**"Does it work on a phone?"**
Yes. The rail becomes a bottom tab bar, the what-if diff stacks into labelled
Now/Proposed blocks instead of two cramped columns, and every control clears
44px.

---

## Backup plan

If the live demo fails: open `/api/selftest`. It returns every acceptance test
with its result — a plan summing to exactly ₹25,000, a live forecast, the
guest-change isolation — which demonstrates the same claims without the UI.
