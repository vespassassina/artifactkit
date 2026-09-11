---
name: artifactkit
description: >-
  Build self-contained single-file HTML artifacts — reports, dashboards, kanban boards,
  trackers, wikis, scorecards, slide decks, comparison matrices — using the artifactkit
  component vocabulary, then validate them before delivery. Use this skill whenever the user
  asks for a dashboard, report, HTML page, web page, artifact, visualisation, chart, graph,
  table, tracker, kanban, board, scorecard, deck, presentation, slides, wiki, one-pager,
  status page, summary page, or anything they will open in a browser or send to someone as a
  file — even if they never say "HTML" or "artifactkit". Also use it when asked to visualise
  data, plot something, make a page interactive, build a small tool or mini app, or turn a
  CSV, spreadsheet, query result or list of findings into something readable. Do not
  hand-write bespoke CSS for these: unguided output is visually inconsistent, breaks when
  opened offline from a local file, and routinely leaks private data into a shareable file.
license: MIT
metadata:
  version: "0.1.0"
  repository: "https://github.com/<owner>/artifactkit"
---

# artifactkit

Produce **one `.html` file** that works offline, opens by double-click, prints
properly, and carries no credentials. Desktop Windows and macOS. No mobile.

Repo root is referenced below as `$AK`. The library lives in `$AK/src`, build and
validation in `$AK/scripts`, the component reference in `$AK/examples/swatch.html`.

---

## Gate 0 — PLAN BEFORE YOU BUILD. Do not skip.

Write the plan in chat and get agreement **before** creating any file. Building
first and asking later wastes the user's time and produces artifacts that answer
the wrong question.

State these seven things, briefly:

1. **Artifact type** — report · dashboard · tracker/kanban · wiki · scorecard · deck
2. **The decision it supports** — one sentence. If you cannot name a decision,
   the artifact is wallpaper. Ask what they will *do* with it.
3. **Data source and freshness** — where each number comes from, and its as-of date
4. **What is missing or partial** — name it now; it determines the banners
5. **Components** — from the chooser table below
6. **Optional modules** — none by default; each one must be justified
7. **Delivery** — output path, and whether they will share the file

Then stop and wait. When the plan is agreed, continue.

> If the request is genuinely trivial ("make me a page with this table"), compress
> the plan to two lines — type and data source — but still state it.

---

## Build procedure

### 1. Start from a template, never from scratch

```bash
cp $AK/examples/templates/report.html      ./my-artifact.html   # report, QBR
cp $AK/examples/templates/dashboard.html   ./my-artifact.html   # filters, drilldown
cp $AK/examples/templates/tracker.html     ./my-artifact.html   # kanban
cp $AK/examples/templates/deck.html        ./my-artifact.html   # slides
cp $AK/examples/templates/wiki.html        ./my-artifact.html   # notes, decisions
cp $AK/examples/templates/scorecard.html   ./my-artifact.html   # weighted scoring
cp $AK/examples/templates/comparison.html  ./my-artifact.html   # options matrix
```

Agents pattern-match against concrete structures far more reliably than against
prose. Copy and modify. `$AK/examples/swatch.html` shows every component rendered.

### 2. Wire the head

```html
<link rel="stylesheet" href="$AK/src/theme.css">
<link rel="stylesheet" href="$AK/src/components.css">
<link rel="stylesheet" href="$AK/src/print.css">
...
<script src="$AK/src/core.js"></script>
```

The build step inlines these. Keep them as separate files while developing.

### 3. Inject data at build time — never hand-edit generated HTML

Put the data in one place near the top of your script block, or in
`<script id="ak-state" type="application/json">`. Regenerate; don't patch.

### 4. Build

```bash
node $AK/scripts/build.mjs my-artifact.html -o dist/my-artifact.html --id my-artifact
```

`--id` **is required in practice**: it namespaces storage keys. See Gotchas.

### 5. Validate — and fix until it passes

```bash
node $AK/scripts/validate.mjs dist/my-artifact.html   # self-containment, security, a11y
node $AK/scripts/drift.mjs    dist/my-artifact.html   # structural integrity
```

Either exiting 1 means do not ship. Fix, rebuild, re-run. Do not deliver a
failing artifact and mention the failure in chat; fix it.

`drift.mjs` exists because a rule checker cannot see design erosion — see Tests.
To compare against the template you started from:

```bash
node $AK/scripts/drift.mjs dist/my-artifact.html --against $AK/examples/templates/report.html
```

### 6. Look at it

Screenshot the built file and actually look:

```bash
chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1280,2400 \
  --screenshot=out.png "file:///abs/path/dist/my-artifact.html"
```

Do **not** pass `--virtual-time-budget` — it fabricates timeouts and makes async
code look broken. Reading the code does not catch empty bars, collided axis
labels or overflowing columns. Looking does.

### 7. Tell the user the full path

---

## Gates

| Gate | Check | Blocking |
|---|---|---|
| **G0** | Plan stated and agreed | yes |
| **G1** | Every number traced to a source; partial periods identified | yes |
| **G2** | Build completes | yes |
| **G3** | `validate.mjs` exits 0 | yes |
| **G3b** | `drift.mjs` exits 0 | yes |
| **G4** | Screenshot inspected | yes |
| **G5** | Print preview checked if it will be printed or PDF'd | if relevant |
| **G6** | Keyboard: Tab reaches controls, `/` focuses filter | if interactive |

---

## Content rules — these matter more than the styling

These encode mistakes that recur. Treat them as hard requirements.

- **Never fabricate a value to fill a cell or a chart.** Render `–`
  (`class="ak-dash"`), and put the reason in an `.ak-banner`.
- **Never plot a partial period beside closed ones.** A line ending on a
  half-finished month draws a cliff that reads as a real collapse. Plot closed
  periods only and say so, or style the partial segment distinctly.
- **Mark partial or estimated data** and exclude it from headline figures.
- **Lead with the decision, not the data.** The KPI strip should answer "what
  should I care about" — include a risk or concentration measure, not just totals.
- **Export what is on screen.** `exportCSV()` writes the filtered, sorted rows.
  Exporting the raw dataset silently contradicts what the user is looking at.
- **Always show which column is sorted.** `ak.table()` handles this; do not
  hand-roll sorting without an indicator.
- **Round in the UI, keep full precision in the export.**
- **Name the source, the measure and the known limitation** in `.ak-source`.
- **Show an `.ak-asof` chip** whenever the data has a pull timestamp.
- **Colour is never the only signal.** Every pill carries a label.
- **One measure across categories is one colour.** Use `highlight: <index>` to
  pick out the bar you are discussing. Six colours for one series encodes nothing.

---

## Choosing the right component

| Need | Use |
|---|---|
| Headline numbers | `.ak-kpis` / `.ak-kpi` — cap at ~8 or it becomes wallpaper |
| Plain category counts | `.ak-barrow` CSS bars — cheaper than a chart |
| Trend over time | `ak.chart.line()` — closed periods only |
| Ranked comparison | `ak.chart.bar()` with `highlight`, top N only |
| Parts of a whole | `ak.chart.donut()` + `ak.legend()` — ≤6 slices |
| Trend inside a cell | `ak.chart.spark()` |
| Tabular detail | `.ak-table` + `ak.table()` |
| Row detail | `.ak-drill` — **not** a modal; modals hide the context |
| Process position | `.ak-stepper` |
| Chronology | `.ak-timeline` |
| Q&A, caveats, methodology | `.ak-disclosure` (`<details>`) |
| Work in flight | `.ak-board` + `ak.kanban()` |
| Rated dimensions | `.ak-scorecard` |
| Missing / blocked data | `.ak-banner` + `–` |
| Long-form notes | `.ak-prose` + `.ak-toc` |
| Slides | `.ak-slide` + `ak.deck()`. Notes in `<aside class="ak-notes">` |
| Nothing to show | `.ak-empty` |

Prefer CSS bars over a chart for plain counts. Reserve SVG charts for axes, time
series and composition.

---

## Core API

```js
ak.init({ id, title })                 // REQUIRED. namespaces storage
ak.table(el, { filterInput })          // → { filter, rows, exportCSV }
ak.csv(rows, headers, filename)
ak.chart.bar(sel, [{label,value}], { highlight, title, format })
ak.chart.line(sel, [{name,values,color,dash}], labels, { title, min, max })
ak.chart.donut(sel, [{label,value}], { centre, title })
ak.chart.spark(sel, values)
ak.legend(sel, [{label,value,color}])
ak.dataTable(sel, headers, rows, caption)   // the accessible twin — always
ak.kanban(el, { onChange })
ak.deck(sel, { minutes })                   // presenter window on N, overview on O
ak.keyboardNav(sel, { filterSelector })     // ↑/↓, Enter, Esc, "/"
ak.toast(msg)
ak.save({ filename, serialize })            // MUST be called from a click
ak.persist(key, value) / ak.restore(key, fallback)
ak.writeState(obj, ["allowed","keys"])      // throws on credentials
ak.readState(fallback)
ak.deepLink.read() / ak.deepLink.write(obj)
ak.fmt.num|pct|cur|signed|date
ak.onResize(fn)                             // charts read clientWidth at draw time
```

---

## Theming

Edit only between the markers. Everything else derives via `color-mix`.

```css
/*!ak-theme-start*/
:root{ --t-bg:#F1ECE1; --t-ink:#1A1A18; --t-accent:#14496B;
       --t-density:1; --t-size:15px; --t-maxw:1120px; }
/*!ak-theme-end*/
```

Dark: `--t-bg:#14141A; --t-ink:#E8E6E0; --t-accent:#6AA9D8; --t-lift-amt:7%`.
Fills and rules are mixes of ground and ink, so they invert on their own.

**Never hard-code a colour outside the markers.** `validate.mjs` warns, and a
hard-coded colour silently survives retheming.

---

## Optional modules

Default is **none**. The core covers tables, charts, kanban, decks, CSV and print.
artifactkit never vendors third-party code; `--with` fetches at build time and
inlines each library's licence automatically.

```bash
node $AK/scripts/build.mjs in.html -o out.html --with marked,prism
```

Justify each addition. See `references/MODULES.md` for the full catalogue, what
each is actually for, licences, and what to avoid and why.

Needs network **at build time only**. If unavailable the build fails loudly —
fall back to the zero-dependency core rather than shipping something broken.

---

## Gotchas

Environment facts that defy reasonable assumptions. Verified empirically in
Chromium, September 2026 — much of the documentation on this is wrong.

- **All `file://` pages share ONE localStorage area.** A file in an unrelated
  directory can read another artifact's keys. Always `ak.init({id})` and always
  use `ak.persist`/`ak.restore`, never raw `localStorage`.
- **ES modules are CORS-blocked at `file://`.** Classic scripts load fine. Never
  emit `<script type="module">`, `import`, or an import map. Any library you add
  must be a UMD build.
- **`fetch()` cannot read a sibling local file**, even next to the artifact.
  Inline data at build time.
- **`fetch()` to a cross-origin API works only if it sends CORS headers.**
  `Origin` is `null` from `file://`, so origin-allowlisted APIs are unreachable.
- **OAuth from a local file is impossible.** Entra requires https/localhost
  redirect URIs and an `Origin` header; GitHub has no CORS preflight and needs a
  client secret. Fetch data yourself at build time and inline it. Never ask the
  user to paste a token into an artifact.
- **`showSaveFilePicker` works from `file://` in Chromium** and needs a user
  gesture, so there is **no unattended autosave**. The first save each session
  costs one click. Firefox and Safari do not implement it — the download fallback
  covers them.
- **The download saver cannot confirm a save.** Never report success for it.
- **OPFS is blocked at `file://`** despite the API being present.
- **Cookies do not work at `file://`.**
- **Charts read `clientWidth` at draw time.** Draw after layout, and re-draw via
  `ak.onResize()`.
- **Sticky table headers print as overlaps** — `print.css` already unsticks them;
  don't reintroduce `position:sticky` inline.
- **A collapsed `<details>` is invisible on paper** — `print.css` expands them.
- **`--virtual-time-budget` breaks async testing.** It advanced a timeout faster
  than IndexedDB could respond and produced a false "this API is broken". Never
  use it when screenshotting or testing.
- **SharePoint and OneDrive preview block custom script by default.** Assume an
  artifact uploaded there is inert. Tell the user to download and open it.
- **Speaker notes never go on the projected screen.** Put them in
  `<aside class="ak-notes">` inside the slide — hidden on stage, hidden in print,
  shown only in the presenter window (`N`). For an audience copy build with
  `--strip-notes`; hiding them in CSS still ships the text in the file.
- **A backgrounded window does not smooth-scroll.** This is why `ak.deck()`
  assigns `scrollTop` directly when the deck window is not focused — the
  presenter clicking "next" on their own screen is exactly that case. Do not
  reintroduce `scrollIntoView({behavior:"smooth"})` for programmatic moves.

---

## Security

The defining feature — one file you can email — is also a perfect
credential-exfiltration vehicle.

- **Never** put a token, key, password or connection string in an artifact.
- `ak.writeState(obj, allow)` requires an explicit allow-list and throws on
  credential-shaped values. Never serialise whole app state.
- Committing an artifact to a repo is publication; a leaked token must be
  **revoked**, not deleted in a follow-up commit.
- If the data is confidential, say so in the artifact and warn the user before
  they share it. It carries the sensitivity of the source with none of its
  access controls.

---

## Tests

```bash
node $AK/scripts/build.mjs $AK/examples/swatch.html -o /tmp/swatch.html --id swatch
node $AK/scripts/validate.mjs /tmp/swatch.html        # must exit 0
node $AK/scripts/drift.mjs    /tmp/swatch.html        # must exit 0
```

Then confirm by hand, on the built file: sort a column and check the indicator
moves; filter and export CSV and confirm the file matches the visible rows; drag
a kanban card and check the counts update; press `/` and confirm the filter
focuses; print-preview and confirm exhibits don't split across pages.

**Why two checkers.** `validate.mjs` checks vocabulary and safety — no ESM, no
external references, no credentials, namespaced storage keys. It is blind to
*erosion*: a linter elsewhere reported zero violations across 2,058 class uses
while agents dismantled the design system. `drift.mjs` checks structure — that
exhibits still carry takeaways and sources, that charts still have data twins,
that the theme block still exists. Verified: stripping every takeaway and source
line from a report passes `validate.mjs` with zero warnings and fails
`drift.mjs` four ways.

Passing both means "not broken". It does not mean "good" — that is Gate G4.

---

## Templates

| File | For |
|---|---|
| `templates/report.html` | Reports, QBRs, analyses. Exhibits, KPI strip, timeline |
| `templates/dashboard.html` | Dashboards. Filter chips, drilldown, deep link, persisted view |
| `templates/tracker.html` | Kanban and trackers. Drag, derived KPIs, save-to-file |
| `templates/deck.html` | Decks. Presenter window, pace timer, one slide per page |
| `templates/wiki.html` | Wikis, notes, decision logs. TOC, search, disclosures |
| `templates/scorecard.html` | Weighted scoring across dimensions, with a stated rubric |
| `templates/comparison.html` | Options matrices. Weights, gates, cost of being wrong |

---

## References

- `references/MODULES.md` — optional libraries, links, licences, what to avoid
- `references/RECIPES.md` — worked patterns per artifact type
- `references/SAMPLE-PROMPTS.md` — example prompts and the trigger eval set
- `references/EVAL-RESULTS.md` — measured trigger rate (0.90, zero false fires)
- `$AK/examples/swatch.html` — every component, rendered
