# PlanPilot AI — Screen Generation Prompt Pack

For Figma Make / Google Stitch. Paste **Block 0 + Block A** first, then one screen
prompt from Block B at a time. Block C is the rejection list — paste it too if the
tool accepts long input.

---

## Block 0 — What I expect back (the contract)

```text
DELIVERABLE
Produce exactly 8 frames, named exactly as written:
  01-brief-desktop        1440x900
  02-research-desktop     1440x900
  03-command-desktop      1440x1200
  04-whatif-desktop       1440x900
  05-execution-desktop    1440x1100
  06-brief-mobile          375x812
  07-command-mobile        375x1400
  08-whatif-mobile         375x1100
Do not invent extra screens, onboarding, login, pricing, or marketing pages.

SCOPE LIMITS — do not produce these
- No dark mode. This MVP ships light only; a dark variant is out of scope.
- No login, signup, account, billing, settings or admin screens.
- No chat or message-thread UI. This product is not a chatbot.
- No seating charts, floor plans, payment forms or booking checkouts.
- No illustration-heavy empty hero art. This is a working tool.

FIDELITY
High fidelity, production-intent. Every number, label and date must be a
realistic Indian value from the demo scenario below — never "Lorem ipsum",
never "Label", never placeholder grey boxes where content belongs.

DEMO DATA — use these exact values throughout so all five screens agree
  Event: Aarav's 30th Birthday
  City: Hyderabad   Venue area: Jubilee Hills
  Date: Saturday, 1 November 2025, 7:00 PM
  Guests: 40        Budget: Rs 25,000      Style: Premium, outdoor
  Spent so far: Rs 18,400   Tasks: 12 of 19 done   Readiness: 72
  Budget split: Venue 6,250 / Food 8,750 / Decor 3,750 / Cake 2,000 /
                Activities 1,750 / Contingency 2,500
  Sample vendors: Olive Bistro Rooftop, Sampoorna Caterers, Bloom & Bough
                  Decor, The Cake Shoppe, Hyderabad Party Rentals
```

---

## Block A — Design system (paste with every screen)

```text
PRODUCT
PlanPilot AI: an evidence-backed event-planning workspace for Indian users.
Data-dense planning tool with an editorial warmth. Calm warm canvas, deep navy
ink, one accent for action, semantic status colours. Photography appears only in
hero and moodboard tiles, never behind numbers.

COLOUR TOKENS — use these exact hex values, nothing else
  --canvas        #FAF7F2   page background (warm neutral)
  --surface       #FFFFFF   cards
  --surface-sunk  #F3EEE7   wells, table headers, empty states
  --ink           #111B33   primary text, deep navy
  --ink-muted     #5A6480   secondary text          (5.6:1 on canvas)
  --line          #E6DED3   hairline borders, 1px
  --accent        #B8372B   buttons, links, active nav  (5.7:1 on white)
  --accent-bright #E0564A   chart fills and decoration ONLY — never text or
                            a button background; it is 3.7:1 and fails AA
  --accent-soft   #FDECEA   accent tint background
  --ok            #1A7F55   verified / confirmed / on budget   (5.0:1)
  --warn          #8A5A12   estimate / at risk — text and icons (5.6:1)
  --warn-fill     #B5761B   amber fills and bars only, not text
  --danger        #C0392B   over budget / blocker             (5.0:1)
  --unknown       #6B7280   unknown evidence, missing data    (4.6:1)
  --info          #2F6FBF   informational links, map pins     (5.1:1)
Body text must hit 4.5:1 minimum against whatever sits behind it. Never put
grey text on a grey surface. Never use a gradient behind body copy.

TYPE
  Headings: Fraunces, weight 600, tight tracking. Page titles and big metric
            numbers only. Never for body, labels, table cells or buttons.
  Everything else: Inter. 400 body, 500 labels, 600 emphasis.
  Scale, px: 40 / 28 / 20 / 16 / 14 / 12. Body is 16. Nothing below 12, and
  12 only for chips and timestamps.
  Line height 1.5 for body, 1.2 for headings. Body line length 60-75 characters.
  All numerals in tables, budgets, counts and timers use TABULAR figures so
  columns do not jitter.
  Currency is Indian rupee in en-IN grouping: Rs 25,000 and Rs 1,20,000.
  Never a dollar sign, never 25,000.00, never 25K.

SPACING & LAYOUT
  4 / 8 / 12 / 16 / 24 / 32 / 48 only. No arbitrary values.
  12-column grid, 1280px max content width, 24px gutters, 32px page padding.
  Cards: 16px radius, 1px --line border, shadow 0 1px 2px rgba(17,27,51,0.04).
  One elevation scale only: flat cards, raised dropdowns, modal above all.
  Breakpoints: 375 / 768 / 1024 / 1440. Mobile first, no horizontal scroll at
  375px, no fixed pixel container widths.

ICONS
  Lucide icons only, 1.5px stroke, sizes 16 / 20 / 24 px. Outline style
  throughout — do not mix filled and outline at the same level.
  NEVER use emoji as an icon anywhere, including in chips, nav and empty states.

SIGNATURE COMPONENT — THE EVIDENCE CHIP
This is the product's core idea. It appears on every card, row or figure that
came from the web. Build it once, reuse it everywhere:
  [icon] LABEL  ·  source-domain.com  ·  fetched 2 min ago
  Published  --ok,      check-circle icon, solid 1px border
  User quote --info,    quote icon, solid border
  Estimate   --warn,    tilde icon, DASHED border
  Unknown    --unknown, help-circle icon, dashed border, muted
12px text, 999px radius, 4px 8px padding, icon + text always — status is never
carried by colour alone. The source domain is a real link in --info.

STATES — every screen must show all of these, not just the happy path
  Loading  skeleton shimmer blocks, not a centred spinner, for anything over
           300ms. Reserve the final height so nothing jumps when it lands.
  Empty    a one-line explanation plus the action that fixes it. Never a blank
           panel and never a lone sad illustration.
  Error    cause plus recovery, e.g. "Overpass timed out. Retry" with a button.
  Offline  a full-width amber bar under the top bar reading
           "Sample data — not live", with a dismiss control.

INTERACTION & ACCESSIBILITY
  Every interactive element is at least 44x44px with 8px clearance from its
  neighbours. Small icon buttons get an expanded hit area, not a smaller target.
  Visible 2px --accent focus ring on every focusable element. Never remove it.
  Tab order follows visual order. Every icon-only button carries a text label
  for screen readers. Form inputs have visible labels above them — never a
  placeholder standing in for a label.
  Errors appear below the field they belong to, stating cause and fix.
  Hover may enhance, never reveal essential information.

MOTION
  150-300ms, ease-out entering, ease-in leaving, exit about 70% of enter.
  Animate transform and opacity only — never width, height, top or left.
  Permitted: card fade-and-rise 4px on entry, 40ms stagger down a list,
  number count-up on first paint, a 600ms highlight pulse on a value that just
  changed. Two animated elements per view at most.
  Everything must honour prefers-reduced-motion and the data must be fully
  readable with all animation disabled.

CHROME
  Desktop: left rail, 240px, showing the five steps as a progress stepper —
  Brief, Research, Command Center, What-If, Execution Pack — each with a Lucide
  icon AND a text label. Done steps carry a filled check, the current step is
  --accent with a 3px left indicator.
  Mobile: the rail becomes a 5-item bottom tab bar, icon plus label, sitting
  above the safe area, with list content padded so nothing hides behind it.
  Top bar on every screen: event title, date, city, guest count and remaining
  budget as inline stats, plus the offline banner slot directly beneath.
```

---

## Block B — The five screens

### 1. Event Brief

```text
Screen 01 — Event Brief. Conversational intake, NOT one long form.

LAYOUT  Centred single column, 720px max, on --canvas. Fraunces 40px greeting
"Let's plan your celebration." Beneath it a step indicator reading "Step 2 of 4"
with four dots. One card shows one group of 3-4 questions at a time.

GROUP 1  Event type as pill selector (Birthday / Wedding / Community /
Corporate). City text field with a map-pin icon. Date picker with a quick chip
"Next Saturday".
GROUP 2  Guest count stepper with - and + buttons, both 44px. Budget field in
rupees formatting live to en-IN as typed, with chips Rs 25,000 / Rs 50,000 /
Rs 1,00,000. Indoor vs Outdoor as a segmented control with icons and labels.
GROUP 3  Style as image tiles, multi-select, each a real event photograph with
a label overlay: Premium, Minimal, Festive, Rustic, Kids. Selected tiles get a
2px --accent border and a check badge. Constraints textarea, helper text below
it reading "For example: vegetarian only, no alcohol, parking needed."

ANSWERED questions collapse upward into compact summary rows above the card,
each with a pencil button that reopens it. Primary full-width --accent button
"Build my event plan". Ghost link beneath: "Use the demo brief".

MUST SHOW  Every field has a visible label above it. One field is in its error
state: budget set to Rs 2,000 with a message below the field reading "Rs 2,000
is below the minimum for 40 guests. Try Rs 15,000 or raise it later."

DONE WHEN  Only one question group is visible at a time; previous answers are
visible and editable as summary rows; the primary button is the single most
prominent element on the screen.
```

### 2. Research Room

```text
Screen 02 — Research Room. Two-column split, 60/40.

LEFT  Five category rows — Venue, Food, Decor, Cake, Activities — each with a
progress bar, a live count ("7 sources checked") and a state: searching, done,
or failed. Below them a masonry of SOURCE CARDS. Each card: photo thumbnail,
vendor name, category tag, price (Rs 12,000, or "Price unknown" in --unknown
when absent), capacity, one extracted fact in one line, and the EVIDENCE CHIP
ROW — chip plus source domain link plus fetch time. A star toggle adds it to
the shortlist; shortlisted cards gain a 3px --accent left border.

Show a deliberate mix: two cards Published, two Estimate, one Unknown, so the
four chip variants are all visible. Show one category row in its failed state
with "Overpass timed out" and a Retry button.

RIGHT, sticky  OpenStreetMap tiles filling the upper two thirds, numbered
--accent pins matching the card numbers; hovering a card highlights its pin.
Below the map a "Missing information" panel on --surface-sunk: a checklist of
gaps such as "Capacity unknown for 4 venues", each with a small "Add it
yourself" action. Under that a weather strip for 1 November showing
temperature, rain chance, and an amber "Weather risk: unresolved" row.

TOP RIGHT  A pill reading "Shortlist · 5" and a primary button
"Go to Command Center".

MUST SHOW  Three cards still loading as skeleton shimmer blocks in the masonry.

DONE WHEN  No card displays a price, capacity or claim without an evidence chip,
a source link and a fetch time beside it.
```

### 3. Command Center

```text
Screen 03 — Command Center. The centrepiece. Dense dashboard, 12 columns.

HERO ROW
  Left, the READINESS card: 72 in Fraunces 40px inside a thick arc gauge
  (red below 50, amber below 75, green from 75), labelled "Readiness". Beneath
  the arc, deductions as one-line rows, each with a small --accent "Fix next"
  button: "-15 Weather risk unresolved", "-8 Venue not confirmed",
  "-5 4 tasks overdue".
  Right, three KPI tiles: Budget used Rs 18,400 of Rs 25,000 with a thin bar,
  Tasks 12 of 19, Days to event 6. Tabular figures.

BUDGET, left 5 columns  Donut of the six categories with the total in the
centre. Six categories is the limit — do not add more slices. Legend is visible
beside the donut, not below a fold, and each legend entry is clickable to
toggle. Each slice also carries a direct value label so meaning never rests on
colour alone. Under the donut, planned-vs-actual horizontal bars per category;
over-budget bars in --danger with a "Rs 2,100 over" tag and a "See trade-offs"
link. Include a small "View as table" toggle for the accessible alternative.

TIMELINE, right 7 columns  Week view of prep milestones and run-of-show,
colour-coded by category with a visible legend, the event day highlighted.

LOWER LEFT  Kanban board, three columns To do / Doing / Done, draggable cards
showing title, due date, a dependency chip ("after: Book venue") and the linked
budget item. Drag affordance is a visible grip handle, and each card also has a
"Move to" menu so the board is operable without dragging.

LOWER RIGHT, stacked  Shortlist panel (compact rows, evidence chips, a Confirm
booking button). Risks panel (severity dot plus severity word, risk name, status
pill open/mitigated/unknown, one-line mitigation). Activity feed of timestamped
lines such as "Budget rebalanced after guest change · 2m ago".

MUST SHOW  The offline amber banner "Sample data — not live" across the top in
this frame, so its placement is settled.

DONE WHEN  Readiness, budget and task numbers agree with the demo data, every
deduction states its fix, and no status is distinguishable by colour alone.
```

### 4. What-If Lab

```text
Screen 04 — What-If Lab. A before/after comparison workspace.

TOP  Lever bar on --surface-sunk: Guests stepper showing 40 changing to 55,
Budget field, City combo, Indoor/Outdoor segmented toggle. Preset chips beside
them: "+15 guests", "Rain on the day", "Cut budget 20%".

MIDDLE  Two aligned columns, "Current plan" and "Proposed plan", matched row by
row by line item. CHANGED rows are tinted --accent-soft with a 3px left bar, a
delta badge (+Rs 3,200 in --danger, -Rs 900 in --ok) and an arrow from old to
new. UNCHANGED rows stay plain and slightly muted — it must be obvious at a
glance that the colour palette, cake flavour and venue choice did NOT move.
Above the columns, an "Only changes" filter toggle.

RIGHT RAIL  Impact summary. A dependency trace drawn as an indented chain with
--accent connectors: "Guests 40 to 55" branching to Catering, Seating, Cake
size, Invitations, Venue capacity. Then warnings in amber and red: "Venue
capacity is 50 — now exceeded by 5". Then the readiness delta, 72 falling to
65, with a down arrow and both numbers shown.

STICKY FOOTER  Total before Rs 18,400, after Rs 23,700, and two buttons: ghost
"Reject", --accent "Accept changes". The footer must not cover the last row —
reserve bottom padding on the scroll area.

MUST SHOW  At 375px this becomes a stacked before/after with a sticky segmented
"Current | Proposed" switcher, never a side-by-side that scrolls horizontally.

DONE WHEN  A viewer can name every changed line and every untouched line without
reading a tooltip, and the cascade from one lever is traceable on screen.
```

### 5. Execution Pack

```text
Screen 05 — Execution Pack. Calm, final-deliverable feel.

HERO  Slim full-bleed event photograph with a deep navy scrim at 55% so the
Fraunces title "Your plan is ready" clears 4.5:1 against it. Event meta line
beneath: "Aarav's 30th Birthday · Hyderabad · Sat 1 Nov, 7:00 PM · 40 guests".

DOWNLOADS  Four cards in a 2x2 on desktop, stacked on mobile: Run-of-show PDF,
Vendor and task checklist, Budget CSV, Calendar .ics. Each with a Lucide line
icon, a one-line description, the file size, and a full-width --accent button.
Show one card mid-download with a progress state and one showing the completed
check, so both are specified.

SHARE  A read-only link in a copy field with a Copy button, a note reading
"Anyone with this link can view. They cannot edit.", and a QR tile.

PLAN PREVIEW, below the fold  A printable read-only summary: run-of-show as a
time-ordered table, the budget table with a Source column keeping the evidence
chips intact, confirmed vendors with links, readiness score in the corner.
Style this block for print — white surface, hairline rules, no shadows, no
--canvas tint.

DONE WHEN  Every export is reachable in one click from this screen and the
preview block would print legibly in black and white.
```

---

## Block C — Reject the output if any of these appear

```text
- An emoji used as an icon, anywhere.
- --accent-bright #E0564A used as a button fill or as text.
- Grey body text on a grey surface, or any body text below 4.5:1.
- A placeholder label: "Lorem ipsum", "Label", "Title", "$1,234", "Your text".
- Dollar signs, or rupee amounts grouped the Western way (120,000 not 1,20,000).
- A price, capacity or vendor claim shown without an evidence chip and source.
- Status shown by colour alone, with no icon and no word.
- Only the happy path: no skeleton, empty, error or offline state anywhere.
- Placeholder-only form labels, or errors collected at the top of the form.
- Horizontal scrolling at 375px, or a tap target under 44px.
- A missing focus ring on any interactive element.
- A dark mode variant, a login screen, or a chat thread.
- Fraunces used for body text, table cells or buttons.
- A donut chart with more than six slices.
```
