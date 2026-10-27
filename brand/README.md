# Brand

| File | What it is |
| --- | --- |
| `PHILOSOPHY.md` | The design philosophy the work was made against |
| `planpilot-mark.svg` / `.png` | The logo. Use the SVG wherever possible — it scales without loss |
| `planpilot-plate.svg` / `.png` | The presentation plate |
| `planpilot-icon.svg` / `.png` | The reducible mark, for favicons and the app rail |
| `planpilot-demo.webp` / `.gif` | A 55-second walkthrough of the running app |
| `generate.mjs` | Generates every still above |

## The encoding

The dial is not decorative. Its six segments subtend the default budget
allocation mapped onto 180° — venue 25, food 35, decor 15, cake 8, activities 7,
contingency 10 — and the needle sits at 72, the readiness the engine reports for
the reference scenario. The four rules on the plate are the four evidence
states, two continuous and two broken, as `EvidenceStatus` defines them.

If those defaults change in `src/lib/engines/budget.ts`, the mark is no longer
telling the truth. Update `SEGMENTS` in `generate.mjs` and regenerate.

## Colour

Taken from the app's tokens, so the identity and the interface agree.

| | |
| --- | --- |
| Ground | `#F7F3EC` |
| Ink | `#141C2E` |
| Accent | `#B8372B` — used three times on the plate, never more |
| Muted | `#5A6480` |
| Hairline | `#D9D0C2` |

## Regenerating

```bash
cd brand && npm install && npm run build
```

The generator keeps its own `package.json` so image tooling stays out of the
application's dependency tree. It needs the two typefaces named at the top of
the script — Italiana and Geist Mono, both OFL. `FONT_DIR` points at a local
path and will need changing on another machine.

The app does not import anything from here at build time: `src/app/icon.svg`,
`src/app/apple-icon.png` and `src/components/logo.tsx` are copies, generated
from `planpilot-icon.svg`. Regenerate them after changing the geometry, or the
favicon and the rail will drift from the brand.

## The walkthrough

`planpilot-demo.webp` and `.gif` are the same 55-second capture of the running
application, driven through the demo script with a headless browser. Nothing in
them is mocked. There is no ffmpeg on the machine they were made on, so there
is no MP4; both formats embed in a README or a chat without a player.

Type is converted to outlines, so the exported files carry no font dependency.
The script refuses to write a document containing a non-finite coordinate:
opentype.js's own path serialiser emits `NaN` at certain fractional offsets,
which silently truncates a glyph run, so the paths are serialised here instead
and the output is asserted clean before it is written.
