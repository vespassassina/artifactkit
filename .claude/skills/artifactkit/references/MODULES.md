# Optional modules

Libraries artifactkit can fetch, subset and inline **at build time**. Nothing
here is vendored in the repo — upstream keeps authorship, you get current
versions, and each artifact carries only the licences it actually uses.

```bash
node $AK/scripts/build.mjs in.html -o out.html --with marked,prism
```

Contents:

1. [Rules before adding anything](#rules)
2. [Supported via `--with`](#supported)
3. [Also known-good (add to build.mjs if needed)](#known-good)
4. [Avoid, with reasons](#avoid)
5. [Adding a new module](#adding)

---

## 1. Rules before adding anything {#rules}

- **Default is zero modules.** The core already does tables, sorting, filtering,
  CSV, SVG charts, kanban, decks, keyboard nav, saving and print.
- **Must be a UMD/IIFE build.** ES modules are CORS-blocked at `file://`. If a
  library ships ESM only, it cannot be used.
- **Must be permissive** — MIT, ISC, BSD, Apache-2.0, 0BSD. Never GPL/LGPL:
  copyleft plus inlining means static linking, which we cannot satisfy.
- **Must justify its weight.** Inlined bytes are paid by every reader.
- Network is needed **at build time only**. Some agent sandboxes have none — if
  the fetch fails, fall back to the core rather than shipping a broken file.

---

## 2. Supported via `--with` {#supported}

| Key | Package | Licence | gzip | Use it for |
|---|---|---|---|---|
| `marked` | [marked](https://github.com/markedjs/marked) | MIT | ~13 kB | Rendering markdown in wiki/notes artifacts |
| `prism` | [PrismJS](https://github.com/PrismJS/prism) | MIT | ~7 kB + ~1 kB/lang | Syntax highlighting |
| `minisearch` | [MiniSearch](https://github.com/lucaong/minisearch) | MIT | ~6 kB | Full-text search past ~500 rows |
| `papaparse` | [PapaParse](https://github.com/mholt/PapaParse) | MIT | ~7 kB | CSV **import** edge cases. Set `worker:false` — workers are unreliable at `file://` |
| `sortablejs` | [SortableJS](https://github.com/SortableJS/Sortable) | MIT | ~18 kB | Only if you need cross-list drag beyond `ak.kanban` |
| `chartjs` | [Chart.js](https://github.com/chartjs/Chart.js) | MIT | ~68 kB | Escape hatch when the SVG charts fall short. **Canvas: prints blurry and is invisible to screen readers — always pair with `ak.dataTable()`** |
| `reveal` | [reveal.js](https://github.com/hakimel/reveal.js) | MIT | ~31 kB | Decks needing speaker notes, fragments or overview mode. Plain decks: use `ak.deck()` |

### Notes

**marked does not sanitise HTML.** If the markdown is not author-controlled, pair
it with [DOMPurify](https://github.com/cure53/DOMPurify) (Apache-2.0 OR MPL-2.0).

**Prism** needs explicit language components; the core file alone highlights
nothing. Add the languages you use and no more.

**Chart.js v3 broke the v2 `scales` syntax** and models still mix them. If config
looks wrong, check you are not writing `scales:{xAxes:[...]}` (v2) instead of
`scales:{x:{...}}` (v3/4).

---

## 3. Also known-good {#known-good}

Not wired into `build.mjs` yet. All verified permissive and UMD-capable — add an
entry to `MODULES` in `scripts/build.mjs` if you need one.

### Tables and grids
| Library | Licence | gzip | When |
|---|---|---|---|
| [Grid.js](https://github.com/grid-js/gridjs) | MIT | 16.5 kB | Config-driven tables built from JS data rather than markup |
| [Tabulator](https://github.com/tabulator-tables/tabulator) | MIT | 102 kB | Virtual scrolling, cell editing, grouping. Zero deps |
| [list.js](https://github.com/javve/list.js) | MIT | 6.2 kB | Search/sort sprinkled on existing markup |

### Charts
| Library | Licence | gzip | When |
|---|---|---|---|
| [uPlot](https://github.com/leeoniya/uPlot) | MIT | 22 kB | Dense time series, many thousands of points |
| [Chartist](https://github.com/chartist-js/chartist) | MIT OR WTFPL | 20 kB | SVG output, small |
| [ECharts](https://github.com/apache/echarts) | Apache-2.0 | 368 kB | Rich dashboards. Use `renderer:'svg'`. Heavy |
| [d3](https://github.com/d3/d3) submodules | ISC | ~15 kB for 3–4 | Custom charts. Cherry-pick `d3-scale`, `d3-shape`; the full bundle is 92 kB |
| [Observable Plot](https://github.com/observablehq/plot) | ISC | 128 kB | Declarative exploratory charts |

### Text, search, data
| Library | Licence | When |
|---|---|---|
| [markdown-it](https://github.com/markdown-it/markdown-it) | MIT | Only if you need its plugin ecosystem; 3.6× marked |
| [snarkdown](https://github.com/developit/snarkdown) | MIT | 1 kB, bold/italic/links only |
| [Fuse.js](https://github.com/krisk/Fuse) | Apache-2.0 | Fuzzy matching, command palettes |
| [dayjs](https://github.com/iamkun/dayjs) | MIT | Date arithmetic. Formatting alone: use native `Intl` |
| [highlight.js](https://github.com/highlightjs/highlight.js) | BSD-3 | Auto-detected languages. Use `lib/common`, not the 307 kB bundle |

### Diagrams and decks
| Library | Licence | When |
|---|---|---|
| [Mermaid](https://github.com/mermaid-js/mermaid) | MIT | **Render to static SVG at build time.** Runtime is >1 MB across chunks and chunk-splitting defeats single-file inlining |
| [impress.js](https://github.com/impress/impress.js) | MIT | Zoom-canvas decks |

### Interactivity
| Library | Licence | gzip | When |
|---|---|---|---|
| [Alpine.js](https://github.com/alpinejs/alpine) | MIT | 19 kB | Genuinely stateful UI beyond what the core store handles. Use `dist/cdn.min.js` (classic script) |
| [interact.js](https://github.com/taye/interact.js) | MIT | 29 kB | Resizable/draggable dashboard widgets |

### Icons
| Set | Licence | Notes |
|---|---|---|
| [Lucide](https://github.com/lucide-icons/lucide) | **ISC**, plus MIT for ~110 Feather-derived icons | Default choice. 1600+ icons, consistent 24×24/2px grid, and models already know its names. *"MIT icons from Lucide" is factually wrong — it is ISC* |
| [Tabler Icons](https://github.com/tabler/tabler-icons) | MIT | Largest set; maintainers document sprite generation |
| [Heroicons](https://github.com/tailwindlabs/heroicons) | MIT | Small, curated, high quality |
| [Phosphor](https://github.com/phosphor-icons/core) | MIT | Six weights; duotone complicates `currentColor` theming |

**Inline icons as a hidden `<svg><symbol>` block** referenced by
`<svg><use href="#id">`. An external `<use href="sprite.svg#id">` is blocked by
same-origin rules at `file://`. Subset to the icons you actually use — 1600
inlined icons is absurd.

---

## 4. Avoid, with reasons {#avoid}

| Library | Why |
|---|---|
| **ApexCharts** | **Relicensed between v4.7.0 and v5.x.** Dual-commercial with a $2M revenue cap and an explicit prohibition on *"redistribution in toolkits, SDKs, or platforms"* — which describes this exact use |
| **simple-datatables** | LGPL-3.0. Copyleft plus inlining = static linking we cannot satisfy |
| **Handsontable** | Proprietary, and the licence carries a non-compete clause |
| **Remix Icon** | Left Apache-2.0 in January 2026 for a custom licence prohibiting distribution of the icons as a standalone pack |
| **AG Grid Community** | MIT, but 362 kB gzip, and the docs blend community with commercial enterprise features so users write config they cannot license |
| **DataTables** | jQuery dependency, and the Editor add-on is paid |
| **Plotly** | 1.24 MB gzip |
| **SheetJS (npm `xlsx`)** | Licence is fine (Apache-2.0) but npm is frozen at 0.18.5; real releases only from `cdn.sheetjs.com`. Prefer CSV, or an HTML table saved as `.xls` |
| **Lit, Material Web** | ESM-only — CORS-blocked at `file://` |
| **htmx** | 0BSD and excellent, but it solves a server-round-trip problem that does not exist offline |
| **Excalidraw embed** | Requires React; ~1 MB across chunks |
| **Slidev, daisyUI, Tailwind (build)** | Require a build toolchain in the artifact path |
| **Tailwind Play CDN** | Network-fetched at runtime; Tailwind's own docs scope it to development only |
| **jsPDF + html2canvas** | ~180 kB for objectively worse output than `window.print()`. Rasterised text, blurry, unselectable |
| **Shiki (runtime)** | Multiple megabytes — it embeds TextMate grammars. Use it at build time and emit pre-highlighted HTML |
| **FullCalendar** | Core is MIT but premium views are commercial, and v7 peer-depends on a new scope whose licence is unverified |

---

## 5. Adding a new module {#adding}

1. Confirm a **UMD/IIFE** build exists and note its path inside the package.
2. Confirm the licence from the published artefact — `package.json` on
   jsDelivr, not a summary site. Licences change; ApexCharts did.
3. Add an entry to `MODULES` in `scripts/build.mjs`:
   ```js
   name: { pkg: "npm-name", file: "dist/thing.umd.js", global: "Thing", css: "dist/thing.css" }
   ```
4. Build with `--with name` and confirm the licence text was inlined.
5. Run `validate.mjs` — it fails if anything ended up referenced rather than
   inlined.
6. Add a row to the table above, including what it is *for*.
