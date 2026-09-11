# Recipes

Worked patterns per artifact type. Copy the closest template from
`$AK/examples/templates/`, then adapt.

1. [Report](#report) · 2. [Dashboard](#dashboard) · 3. [Tracker / kanban](#tracker)
4. [Wiki / notes](#wiki) · 5. [Scorecard](#scorecard) · 6. [Deck](#deck)
7. [Patterns that apply to all](#common)

---

## 1. Report {#report}

Template: `templates/report.html`. Structure is fixed and worth keeping:

```
pagehead        eyebrow · action title · lede · as-of chip
KPI strip       ≤8 figures, one of which is a RISK measure
banner          what is excluded and why
exhibits        eyebrow → action title → takeaway → visual → source
timeline        what happens next
footer          provenance and caveats
```

**Action titles state the finding, not the topic.** "Margin is holding, but on a
narrowing base" beats "Margin analysis". The subtitle carries the takeaway; a
reader who reads only titles should still get the argument.

Use `highlight` to make the chart agree with the prose:

```js
// the takeaway is about Southern, so Southern is the only coloured bar
ak.chart.bar("#bars", regions, { highlight: 2 });
```

---

## 2. Dashboard {#dashboard}

A dashboard is a report that gets re-read. Differences:

- Add `ak.deepLink` so a filtered view is shareable.
- Add `ak.keyboardNav` — `/` focuses the filter, `↑`/`↓` walk rows.
- Prefer `.ak-drill` over a modal for row detail; a modal hides the comparison
  the user was making.
- Persist only *view* state, never data:

```js
var saved = ak.restore("view", { filter: "", sort: null });
ak.deepLink.write({ f: input.value });
ak.persist("view", { filter: input.value });
```

---

## 3. Tracker / kanban {#tracker}

Template: `templates/tracker.html`.

```js
ak.kanban("#board", { onChange: recomputeStats });
```

Requirements that are easy to forget:

- **Column counts must update on drop.** `ak.kanban` does it if each column
  header contains `<span class="ak-n">`.
- **Derive KPIs from the board, not the source array**, or the numbers drift
  from what is on screen after the first drag.
- **A card marked blocked must carry the blocking reason.** A card without one
  is not blocked, it is unstarted.
- **Saving needs a click** and an allow-listed serializer:

```js
ak.save({ filename: "tracker.html",
  serialize: function () { ak.writeState({ positions: positions() }, ["positions"]); } });
```

---

## 4. Wiki / notes {#wiki}

```html
<div class="ak-sidebar">
  <nav class="ak-toc">…</nav>
  <article class="ak-prose">…</article>
</div>
```

- Long documents get `.ak-toc` (sticky) and `.ak-nav` with `aria-current="page"`.
- Methodology, caveats and FAQs belong in `.ak-disclosure` — visible in print
  because `print.css` expands them.
- Markdown at build time is better than at runtime. If you must render at
  runtime, `--with marked`, and add DOMPurify if the source is not yours.
- Past ~500 entries, `--with minisearch`. Below that a substring filter is fine.

---

## 5. Scorecard {#scorecard}

```html
<div class="ak-scorecard ak-cols-3">
  <div class="ak-stat"><span class="ak-k">Delivery</span><span class="ak-v">A</span></div>
  …
</div>
```

Grades need a stated rubric. Put it in a `.ak-disclosure` directly beneath, or
the scorecard is an opinion wearing a grid. Never colour a grade without also
writing it.

---

## 6. Deck {#deck}

```html
<div class="ak-deck" id="deck" data-minutes="20">
  <section class="ak-slide">
    <h2>One idea per slide</h2>
    …
    <aside class="ak-notes"><ul><li>What to say, not what is written.</li></ul></aside>
  </section>
</div>
<script>ak.deck("#deck", { minutes: 20 });</script>
```

Slide titles follow the report rule: state the finding, not the topic.

### Presenter window

Press `N`, or click the notes button. A second window opens that you drag to
your own screen; the audience window shows nothing extra. It carries the timer,
pace against the budget, the current slide's notes, next-up, and its own
prev/next controls — navigating from either window moves both.

It is written through the window handle directly rather than via
`BroadcastChannel` or `localStorage`, because both are unreliable at `file://` —
all local pages share one storage area. If the popup is blocked, notes fall back
to an inline panel and a toast says why.

### Speaker notes

`<aside class="ak-notes">` inside the slide. Hidden on the projected screen,
hidden in print, read by the presenter window. Write what you will *say* — the
argument, the objection you expect, where to pause — not a transcript of what is
already on the slide.

For an audience copy, strip them at build time rather than hiding them:

```bash
node $AK/scripts/build.mjs deck.html -o deck-audience.html --strip-notes
```

CSS hiding still ships the text in the file, and a deck is exactly the artifact
people forward onward.

### Keys

`→`/space next · `←` back · `Home`/`End` · `O` overview · `N` presenter ·
`F` fullscreen · `P` print · `?` all keys · `Esc` close panels

---

## 7. Patterns that apply to all {#common}

### Missing data

```js
r.margin == null
  ? '<td class="ak-num ak-dash" data-v="">–</td>'
  : '<td class="ak-num" data-v="' + r.margin + '">' + ak.fmt.num(r.margin, 1) + '</td>'
```

…plus a banner naming what is missing and why. Never interpolate, carry forward
or estimate silently.

### Partial periods

Plot closed periods only and say so in a banner, or style the open segment
distinctly and label it. A line that ends on a half-finished month draws a cliff
that reads as a collapse.

### Sorting and export

`ak.table()` handles the sort indicator and exports the filtered, sorted rows.
Put the machine-readable value in `data-v` so sorting and export use full
precision while the cell shows a rounded figure.

```html
<td class="ak-num" data-v="18.4213">18.4</td>
```

### Charts

Always pair with `ak.dataTable()`. Draw after layout and re-draw with
`ak.onResize()` — charts read `clientWidth` at draw time, so a chart built in a
hidden or unlaid-out container renders at zero width.

### Freshness

`.ak-asof` chip in the header, provenance in the footer: name the system, the
extraction time, the measure definition and the known limitation.
