# PlanPilot AI

An evidence-backed event planning agent. You give it a brief; it researches real
local options, builds a budget-aware plan, flags what could go wrong, and
re-plans consistently when one input changes.

It is deliberately **not** a chatbot. The model writes explanations. Every
figure, limit, capacity check and score is computed in code.

Built for PromptWars Challenge 5 (Celebration & Event Planner).

---

## What makes it different

**Every fact carries its provenance.** Each price, capacity and claim shows
where it came from, when it was fetched, and how much it should be trusted:
`Published`, `User quote`, `Estimate` or `Unknown`. An estimate is never
presented as verified, and unknown stays unknown rather than being guessed. The
schema enforces this — evidence marked `published` without a source URL fails
validation and never reaches the screen.

**Changing one input moves only what depends on it.** Take 40 guests to 55 and
catering, cake, seating, invitations and the venue capacity check all move.
Venue hire, decor, activities and contingency render as *Unchanged*. A diff
where an unrelated line drifts is worse than no simulation, because you stop
believing any of it.

**The readiness score explains itself.** Not a number — an itemised account of
what each missing thing costs you and the single action that recovers it.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional; it runs without any keys
npm run dev
```

Open <http://localhost:3000>. Click **Use the demo brief**, then **Build my
event plan**.

**No API key is required.** Without one, plan prose comes from a deterministic
writer and the UI says so rather than implying a model wrote it. Weather,
venues and holidays are all keyless.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit suite, 86 tests |
| `npm run typecheck` | `tsc --noEmit` |

Acceptance tests that need a running server live at
`GET /api/selftest` — it returns pass/fail per test and a non-200 status if
any fail, so it works against a deployment and not just locally.

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Preferred provider. Without it, the fallback writer runs. |
| `GEMINI_API_KEY` | No | Used if no OpenAI key is set. |
| `LLM_PROVIDER` | No | Pin one: `openai`, `gemini` or `fallback`. |
| `SEARCH_API_KEY` | No | Tavily. Without it, research returns options with no published prices. |
| `PLANPILOT_STORE` | No | `memory` forces the in-memory driver. |
| `PLANPILOT_DB` | No | SQLite path. Defaults to `.data/planpilot.db`. |

---

## Architecture

The rule that shapes everything: **the model proposes and explains;
deterministic code calculates and enforces.**

```
Brief ─▶ engines ─▶ validator ─▶ reducer ─▶ Plan ─▶ UI
                                    ▲
              agents (research, risk) returns Zod-validated proposals
```

One `Plan` record is the source of truth. Agents never mutate it — they return
proposals, and a reducer validates each against the event before applying it.
A proposal that breaks an invariant is rejected **whole**, with a reason, never
half-written.

| Path | Responsibility |
| --- | --- |
| `src/lib/schemas.ts` | Every type in the system. Nothing enters unparsed. |
| `src/lib/engines/budget.ts` | All budget arithmetic, scaling rules, trade-offs |
| `src/lib/engines/schedule.ts` | Prep tasks and run of show, with real dependency edges |
| `src/lib/engines/readiness.ts` | The 0–100 score and its itemised deductions |
| `src/lib/engines/scenario.ts` | What-if cascade and the dependency map |
| `src/lib/engines/reducer.ts` | Applies proposals, enforces invariants |
| `src/lib/engines/validate.ts` | Re-checks the assembled plan before display |
| `src/lib/sources/` | Open-Meteo, Overpass, holidays, search, offline fallback |
| `src/lib/llm/` | `LlmProvider` interface: OpenAI, Gemini, deterministic fallback |
| `src/lib/store/` | `Store` interface: `node:sqlite` and in-memory drivers |

### Why the model cannot corrupt a plan

1. Engines compute the entire plan **before** the model is called.
2. The model returns prose only, parsed through Zod.
3. Malformed output is retried once with the validation error fed back.
4. A second failure falls through to a deterministic writer using the same
   figures.

So a missing key, a rate limit or a 401 costs you plainer wording and nothing
else. This is not theoretical — the suite currently runs with a rejected API
key, and every plan still builds.

---

## Data sources

| Source | Key | Used for | Caveat |
| --- | --- | --- | --- |
| [Open-Meteo](https://open-meteo.com) | No | Geocoding, forecast | Non-commercial tier, CC BY 4.0 |
| [Overpass / OSM](https://wiki.openstreetmap.org/wiki/Overpass_API) | No | Nearby venues | **No price or capacity data**; 30–50s response |
| Bundled India holidays | No | Holidays near the date | See below |
| [Tavily](https://tavily.com) | Yes | Published prices | Optional |

**Nager.Date does not cover India.** Verified 26 Oct 2026: `IN` is absent from
its 204-country list and every year returns `204 No Content`. The build kit
listed this as unchecked; it's now answered. India falls back to the three
fixed-date national holidays, which land on the same date every year. Festivals
that move with the lunar calendar — Diwali, Holi, Eid — are **deliberately
excluded** rather than guessed, and the UI states that limit.

**We do not crawl.** The search provider fetches public pages under its own
terms and returns snippets; we read those and keep the URL. Map platforms,
social networks and directories are refused outright. A price read out of a
snippet by a regular expression is labelled an **estimate**, never verified.

**Offline.** If every live source fails, a small illustrative dataset is used
behind a "Sample data — not live" banner. Nothing in it claims to be published
or carries a source URL, because none of it was retrieved from one. Replace it
with hand-verified vendors before putting real numbers in front of anyone.

---

## Testing

```bash
npm test          # 86 unit tests
curl localhost:3000/api/selftest   # acceptance tests against a running server
```

| Acceptance test | Where it is proven |
| --- | --- |
| 1 — Plan sums to at most the budget | `tests/budget.test.ts`, across awkward figures |
| 2 — Every research card has source, time and label | Evidence schema + `/api/selftest` |
| 3 — 40→55 guests moves only dependent items | `tests/scenario.test.ts` |
| 4 — Rain or indoor proposes a backup, lowers readiness | `tests/readiness.test.ts` |
| 5 — All exports download and open | `tests/exports.test.ts` |
| 6 — Works offline with the sample banner | `tests/store.test.ts` + banner check |
| 7 — Zod rejects bad output, retries once, falls back | `/api/selftest` AT7a/AT7b |

The valuable half of the scenario tests is what must **not** move. Tests use
real schemas rather than casts, so a schema change breaks them loudly.

---

## Security

- Every input parsed with Zod at the boundary. No raw body reaches a store.
- Source URLs must be `http(s)`. `new URL()` parses `javascript:` happily and
  Zod's `.url()` accepts it — since source URLs render as `href`s, both are
  explicitly protocol-checked.
- SQL is parameterised throughout; the export route resolves its kind through
  `Object.hasOwn` on a fixed map, so `__proto__` 404s.
- CSV cells are RFC 4180 quoted and formula injection is defused, so a vendor
  named `=cmd()` cannot execute in a spreadsheet.
- CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and a
  `Permissions-Policy` that denies camera, microphone and location.
  `connect-src` lists only the hosts the research layer actually calls.
- No accounts, no personal data stored. The shared plan page is read-only and
  cannot write.

**Known limitation:** the CSP keeps `script-src 'unsafe-inline'` because Next's
hydration bootstrap is inline. A nonce-based policy is the correct fix and the
first thing to do if this goes past a demo.

---

## Accessibility

Skip link first in the tab order. Every control clears 44×44px with a visible
2px focus ring. Status is never carried by colour alone — each evidence variant
pairs a distinct icon and a written label, and estimate/unknown also use a
dashed border. Charts are SVG with `role="img"` and a written summary, each
paired with the same data as a table behind `details`/`summary`, which needs no
JavaScript. The task board moves cards with buttons, not drag — a pointer-only
board fails keyboard use, and the accessible control has to exist either way.
All motion respects `prefers-reduced-motion`. Dates are formatted in a fixed
IST zone so server and client agree.

---

## Deliberate deviations from the build kit

| Kit says | Built | Why |
| --- | --- | --- |
| better-sqlite3 + Drizzle | `node:sqlite` + a `Store` interface | better-sqlite3 needs Visual Studio build tools and has no prebuilt binary for Node 24; Drizzle ships no `node:sqlite` driver |
| Recharts | Hand-rolled SVG | Exact token control, one fewer dependency, and a real `role="img"` instead of a canvas a screen reader cannot enter |
| FullCalendar | Hand-rolled run of show | Avoids a heavy dependency whose timeline views are a paid plugin |
| dnd-kit | Buttons on the task board | A pointer-only board fails the keyboard requirement; drag is additive, not foundational |

---

## Deployment

Deploys to Vercel from the repository root with no configuration.

The storage layer picks its driver at runtime: `node:sqlite` locally, in-memory
when `VERCEL` is set, because serverless filesystems are read-only. **State on
Vercel therefore lives only for the life of an instance** — fine for a demo
session, not for real persistence. Moving to a hosted database means writing one
more `Store` implementation and changing nothing else.

Before demoing on stage: load the Research Room once to warm the Overpass cache.
It is the slowest source by a wide margin.

---

## What is deliberately not built

General chat, seating or floor plans, payments or bookings, WhatsApp or SMS,
auth or multi-tenant admin, a city-wide vendor directory.

---

## Attribution

Venue data © OpenStreetMap contributors (ODbL). Weather by
[Open-Meteo](https://open-meteo.com), CC BY 4.0.
