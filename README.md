# artifactkit

**A UI kit for AI agents that write HTML.** Reports, dashboards, kanbans, wikis,
scorecards and decks — as one self-contained `.html` file you can email, open
from a USB stick, or double-click with no server, no build and no network.

Zero dependencies in the core. No third-party code in this repository.

```bash
node scripts/build.mjs examples/swatch.html -o dist/swatch.html --id swatch
node scripts/validate.mjs dist/swatch.html
node scripts/drift.mjs dist/swatch.html
```

Or build and check everything:

```bash
npm run build && npm run check     # no install step — there are no dependencies
```

---

## Why this exists

Every coding agent can already write an HTML dashboard. They are just not very
good at it, and — more importantly — they are not *consistent*. Generate the
same spec five times and you get five different vocabularies.

The measured evidence ([canoncss `RESEARCH.md`][canon], 130 generations) is that
unconstrained generation agrees with itself on **58–67%** of its styling
vocabulary, and a written specification lifts that to ~90%. The same study found
that a strict prompt over plain Tailwind matched a closed vocabulary — so the CSS
architecture is not what does the work. **The specification is.**

artifactkit is therefore a specification, a vocabulary and a validator, with CSS
and JS as the delivery vehicle.

It also encodes the things agents reliably get *wrong* about reports:

- plotting a partial period beside closed ones, which draws a cliff that reads
  as a real collapse
- inventing a value to fill a column instead of rendering `–` and saying why
- exporting the raw dataset rather than the rows the user is actually looking at
- sorting a table without showing *which* column is sorted
- colouring six bars of a single measure, encoding nothing

## Design

Ground is RAL 9010 `#F1ECE1`, derived by converting the CIELAB definition
(93.613, −0.425, 6.008) to sRGB — RAL publishes no normative hex and third-party
charts disagree from `#EFEEE5` to `#FFFFFF`. It is a warm off-white; pure white
is wrong.

System sans stack, no webfonts, so it works offline and doesn't look like
everything else. Hairline rules, one restrained accent, action-titled exhibits,
source lines, tabular figures, no vertical rules in tables.

### Retheming

Edit the constants. Everything else derives via `color-mix`.

```css
/*!ak-theme-start*/
:root{
  --t-bg:#F1ECE1;  --t-ink:#1A1A18;  --t-accent:#14496B;
  --t-density:1;   --t-size:15px;    --t-maxw:1120px;
}
/*!ak-theme-end*/
```

`--t-bg:#14141A; --t-ink:#E8E6E0; --t-lift-amt:7%` gives you a dark theme.
Fills and rules are mixes of ground and ink, so they invert automatically.

## Templates to copy

| | |
|---|---|
| `report.html` | Quarterly review. Exhibits, KPI strip with a risk measure, timeline |
| `dashboard.html` | Filter chips, drilldown rows, sparklines, deep-linked view state |
| `tracker.html` | Kanban with derived KPIs and save-to-file |
| `deck.html` | Slides with a presenter window, pace timer and overview |
| `wiki.html` | Decision log with TOC, search and recorded alternatives |
| `scorecard.html` | Weighted scoring with the rubric stated in full |
| `comparison.html` | Options matrix with weights, gates and cost-of-being-wrong |

Plus `swatch.html` — every component on one page, the visual QA reference.

## What's in the core

| | |
|---|---|
| Tables | sort with a visible indicator, filter, CSV export of *filtered* rows |
| Charts | bar, line, donut, sparkline — hand-rolled SVG, prints crisply, ships an accessible data twin |
| Kanban | native HTML5 drag, wrapped once so you never write `dragover` handling |
| Decks | scroll-snap slides, presenter window with notes and pace timer, overview grid, print-to-PDF |
| Saving | File System Access with a download fallback, dirty tracking, no false "saved" |
| Print | `window.print()` — 0 kB against ~180 kB for jsPDF + html2canvas, and better output |

Plus the long tail whose *absence* is what makes agent output diverge: stepper,
timeline, disclosure, drilldown, KPI strip, scorecard, breadcrumb, TOC, banner,
empty state, freshness chip, provenance footer.

## Optional modules

artifactkit never vendors third-party code. `--with` fetches at build time,
inlines the library **and its licence text**, and adds a notices block:

```bash
node scripts/build.mjs report.html -o out.html --with marked,prism
```

Available: `marked`, `prism`, `minisearch`, `papaparse`, `sortablejs`,
`chartjs`, `reveal`. All MIT/ISC/BSD, all UMD.

This needs the network **at build time only**. If it's unreachable the build
fails loudly rather than emitting a half-broken artifact — the core still works
with no network at all, which matters because some agent sandboxes have none.

## Constraints (measured, not assumed)

Verified empirically in Chromium, because the documentation on this is thin and
frequently wrong:

- `file://` **is** a secure context — File System Access and WebCrypto work
- **all `file://` pages share one localStorage area**, so keys must be namespaced
  by artifact id or unrelated artifacts read and clobber each other
- ES modules are CORS-blocked; classic scripts load. Everything must be UMD
- cross-origin `fetch` works only against APIs that send CORS headers
- OPFS is blocked
- OAuth from `file://` is impossible — Entra requires https/localhost redirect
  URIs and an `Origin` header, and `file://` sends `null`. Fetch data at build
  time instead

Target is desktop Windows and macOS. Not mobile; there is no touch support.

## Licence

MIT. Third-party libraries fetched via `--with` keep their own licences, which
are inlined into each artifact automatically.

[canon]: https://github.com/marcelodevelop/canoncss
