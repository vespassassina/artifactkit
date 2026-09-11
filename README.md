# artifactkit

**A UI kit for AI agents that write HTML.** Reports, dashboards, kanbans, wikis,
scorecards and decks — as one self-contained `.html` file you can email, open
from a USB stick, or double-click with no server, no build and no network.

Zero dependencies in the core. No third-party code in this repository.

**[→ Open the live gallery](https://vespassassina.github.io/artifactkit/)**

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

artifactkit is therefore a specification, a vocabulary and two validators, with
CSS and JS as the delivery vehicle.

It also encodes the things agents reliably get *wrong* about reports:

- plotting a partial period beside closed ones, which draws a cliff that reads
  as a real collapse
- inventing a value to fill a column instead of rendering `–` and saying why
- exporting the raw dataset rather than the rows the user is actually looking at
- sorting a table without showing *which* column is sorted
- colouring six bars of a single measure, encoding nothing

---

## Templates

Each links to a live demo, and to the source to copy. Everything below is one
HTML file with no dependencies.

### Report

[**Live demo**](https://vespassassina.github.io/artifactkit/report.html) ·
[source](examples/templates/report.html)

A quarterly review. Action title that states the finding, a KPI strip including
a concentration *risk* measure rather than only totals, exhibits with a takeaway
and a source line, a banner naming the excluded partial period, and a missing
value shown as `–` rather than invented.

[![Report](docs/images/report.png)](https://vespassassina.github.io/artifactkit/report.html)

### Dashboard

[**Live demo**](https://vespassassina.github.io/artifactkit/dashboard.html) ·
[source](examples/templates/dashboard.html)

Support operations. Filter chips, search, sparklines in table cells, a sticky
identifier column, and row detail as a drilldown rather than a modal — a modal
hides the rows you were comparing against. KPIs derive from the filtered set so
they cannot drift from what is on screen, and view state lives in the URL so a
filtered view is shareable.

[![Dashboard](docs/images/dashboard.png)](https://vespassassina.github.io/artifactkit/dashboard.html)

### Tracker / kanban

[**Live demo**](https://vespassassina.github.io/artifactkit/tracker.html) ·
[source](examples/templates/tracker.html)

A migration board. Native HTML5 drag between columns, counts and KPIs that
recompute on drop, blocked cards carrying their blocking reason, and a Save that
writes the board state back into the file itself through an allow-listed
serializer.

[![Tracker](docs/images/tracker.png)](https://vespassassina.github.io/artifactkit/tracker.html)

### Deck

[**Live demo**](https://vespassassina.github.io/artifactkit/deck.html) ·
[audience build](https://vespassassina.github.io/artifactkit/deck-audience.html) ·
[source](examples/templates/deck.html)

A decision review. Press <kbd>N</kbd> for the presenter window — notes, pace
timer against a stated budget, and next-up on your screen only, never on the
projector. <kbd>O</kbd> for the overview grid, <kbd>?</kbd> for all keys,
<kbd>P</kbd> for one slide per page. The audience build is the same deck with
the speaker notes physically stripped, not merely hidden.

[![Deck](docs/images/deck.png)](https://vespassassina.github.io/artifactkit/deck.html)

### Wiki / decision log

[**Live demo**](https://vespassassina.github.io/artifactkit/wiki.html) ·
[source](examples/templates/wiki.html)

Decisions separated from open questions on purpose, a table of contents built
from the document so it cannot drift, search on <kbd>/</kbd>, scroll-spy
highlighting, and rejected alternatives recorded rather than forgotten.

[![Wiki](docs/images/wiki.png)](https://vespassassina.github.io/artifactkit/wiki.html)

### Scorecard

[**Live demo**](https://vespassassina.github.io/artifactkit/scorecard.html) ·
[source](examples/templates/scorecard.html)

Supplier review across weighted dimensions, with the rubric stated in full —
a scorecard without its rubric is an opinion in a grid. Reviewer disagreement
above a threshold is flagged rather than averaged away.

[![Scorecard](docs/images/scorecard.png)](https://vespassassina.github.io/artifactkit/scorecard.html)

### Comparison matrix

[**Live demo**](https://vespassassina.github.io/artifactkit/comparison.html) ·
[source](examples/templates/comparison.html)

An options paper. Weights fixed *before* scoring, "do nothing" included as the
honest baseline, and what each option costs to be **wrong** — plus a gate row
showing why the highest-scoring option is still not the recommendation. A
weighted score ranks the options that remain viable; it does not decide which
ones are.

[![Comparison matrix](docs/images/comparison.png)](https://vespassassina.github.io/artifactkit/comparison.html)

### Component swatch

[**Live demo**](https://vespassassina.github.io/artifactkit/swatch.html) ·
[source](examples/swatch.html)

Every component on one page. The visual QA reference — if something looks wrong
here it is wrong everywhere — and the fastest way to see what the vocabulary
contains.

[![Component swatch](docs/images/swatch.png)](https://vespassassina.github.io/artifactkit/swatch.html)

---

## Try it in two minutes

| | |
|---|---|
| **Offline** | Save any page, disconnect, reload. Nothing breaks — no CDN links, no fonts to fetch, no runtime dependencies. |
| **Print** | <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>P</kbd>. Chrome disappears, exhibits stay whole, collapsed sections expand, charts stay sharp because they are SVG, speaker notes never appear. |
| **Export** | Filter the dashboard, then Export CSV. You get the rows you are looking at, in the order you sorted them. |
| **Retheme** | Search the source for `ak-theme-start`. Set `--t-bg:#14141A; --t-ink:#E8E6E0; --t-lift-amt:7%` for a dark build. Everything else derives. |

---

## Design

Ground is RAL 9010 `#F1ECE1`, derived by converting the CIELAB definition
(93.613, −0.425, 6.008) to sRGB — RAL publishes no normative hex and third-party
charts disagree from `#EFEEE5` to `#FFFFFF`. It is a warm off-white; pure white
is wrong.

System sans stack, no webfonts, so it works offline and does not look like
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

Fills and rules are mixes of ground and ink, so they invert automatically on a
dark theme.

---

## What's in the core

| | |
|---|---|
| Tables | sort with a visible indicator, filter, CSV export of *filtered* rows |
| Charts | bar, line, donut, sparkline — hand-rolled SVG, prints crisply, ships an accessible data twin |
| Kanban | native HTML5 drag, wrapped once so you never write `dragover` handling |
| Decks | presenter window, pace timer, overview grid, print-to-PDF |
| Saving | File System Access with a download fallback, dirty tracking, no false "saved" |
| Print | `window.print()` — 0 kB against ~180 kB for jsPDF + html2canvas, and better output |

Plus the long tail whose *absence* is what makes agent output diverge: stepper,
timeline, disclosure, drilldown, KPI strip, scorecard, breadcrumb, TOC, banner,
empty state, freshness chip, provenance footer.

---

## For agents

The skill is published at both discovery paths, so it works across Claude Code,
GitHub Copilot, Cursor and Codex:

```
.agents/skills/artifactkit/     Copilot · Cursor · Codex
.claude/skills/artifactkit/     Claude Code
```

- [SKILL.md](.agents/skills/artifactkit/SKILL.md) — gates, build procedure,
  content rules, component chooser, API, gotchas
- [RECIPES.md](.agents/skills/artifactkit/references/RECIPES.md) — worked
  patterns per artifact type
- [MODULES.md](.agents/skills/artifactkit/references/MODULES.md) — optional
  libraries with licences, and what to avoid and why
- [EVAL-RESULTS.md](.agents/skills/artifactkit/references/EVAL-RESULTS.md) —
  measured trigger rate: **0.90 with zero false fires**, across three model
  families

---

## Optional modules

artifactkit never vendors third-party code. `--with` fetches at build time,
inlines the library **and its licence text**, and adds a notices block:

```bash
node scripts/build.mjs report.html -o out.html --with marked,prism
```

Available: `marked`, `prism`, `minisearch`, `papaparse`, `sortablejs`,
`chartjs`, `reveal`. All MIT/ISC/BSD, all UMD.

This needs the network **at build time only**. If it is unreachable the build
fails loudly rather than emitting a half-broken artifact — the core still works
with no network at all, which matters because some agent sandboxes have none.

---

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

---

## Commands

```bash
node scripts/build.mjs in.html -o out.html --id slug [--with marked] [--strip-notes]
node scripts/validate.mjs out.html     # self-containment, credentials, accessibility
node scripts/drift.mjs out.html        # structural integrity
node scripts/sync-skill.mjs            # re-sync the skill bundle after editing src/
node scripts/shots.mjs                 # regenerate the screenshots above
```

Two checkers, because one is provably insufficient: a rule checker sees
vocabulary, not erosion. Stripping every takeaway and source line from a report
passes `validate.mjs` with zero warnings and fails `drift.mjs` four ways.

Contributing notes, including two Windows traps that have already bitten, are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT. Third-party libraries fetched via `--with` keep their own licences, which
are inlined into each artifact automatically.

[canon]: https://github.com/marcelodevelop/canoncss
