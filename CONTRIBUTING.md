# Contributing to artifactkit

Notes for anyone — human or agent — working **on** this repo. If you are using
artifactkit to build an artifact, read
[`.agents/skills/artifactkit/SKILL.md`](.agents/skills/artifactkit/SKILL.md)
instead.

## The rule that shapes everything

**No third-party code in this repository.** Not vendored, not copied, not
"temporarily" inlined. Optional libraries are fetched at build time by
`scripts/build.mjs`, which also inlines their licence text automatically.

This keeps the licence surface at zero, means users always get current versions
rather than our stale copy, and means attribution is mechanical rather than a
file someone has to remember to update.

## Setup

None. Node 18+, no install step, no dependencies.

```bash
npm run sync      # re-sync the skill bundle after changing src/ or scripts/
npm run build     # build every example into dist/
npm run check     # validate + drift + encoding over everything in dist/
npm test          # all of the above
```

### Two Windows traps, both of which have already bitten

**Never use PowerShell's `Get-Content | Set-Content -Encoding utf8` on these
files.** It reads UTF-8 as ANSI and writes it back as UTF-8, so `€` becomes
`â‚¬` and `—` becomes `â€"`, and it prepends a BOM that makes `package.json`
fail `JSON.parse`. This shipped mojibake into the whole skill bundle once.
`scripts/check-encoding.cjs` now catches it, and CI runs it. Use `node`, or
`[System.IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding $false))`.

**The two skill directories are real copies, not a link.** A Windows junction
breaks git — a rebase or branch switch tries to delete files through the link
while writing them through the target, and fails mid-operation with
`Deletion of directory ... failed`. A POSIX symlink degrades to a text stub when
cloned on Windows. If you ever need to remove a junction, use
`cmd /c rmdir <path>`, which removes only the link; `Remove-Item -Recurse` can
follow it and delete the target.

## Layout

```
src/          theme.css · components.css · print.css · core.js   ← the library
scripts/      build · validate · drift · build-all · check-all
examples/     swatch.html · index.html · templates/
.agents/skills/artifactkit/   the agent skill (assets/ mirrors src/)
dist/         built artifacts — committed, served by GitHub Pages
```

`.agents/skills/artifactkit/assets/` is a **copy** of `src/` with relative paths
rewritten, so the skill works standalone in a sandbox with no repo.
`.claude/skills/artifactkit/` is a second real copy, for Claude Code. Run
`npm run sync` after changing anything in `src/` or `scripts/`; CI fails if the
copies drift.

## Changing the library

**Adding a component.** Add it to `components.css` under `@layer ak.components`,
add it to `examples/swatch.html`, and add a row to the chooser table in SKILL.md.
A component nobody can find is a component that does not exist — and a *missing*
component is the measured cause of agents inventing three incompatible names for
the same thing.

**Colours.** Never write a literal colour outside the `ak-theme-start` /
`ak-theme-end` markers. Everything derives via `color-mix` from `--t-bg`,
`--t-ink` and `--t-accent`. `drift.mjs` warns when literals creep in.

**JavaScript.** `core.js` is a classic IIFE. No `import`, no `export`, no
`type="module"` — ES modules are CORS-blocked at `file://`, which is the primary
target. It must stay dependency-free.

**Adding an optional module.** See the checklist at the end of
[`references/MODULES.md`](.agents/skills/artifactkit/references/MODULES.md).
Verify the licence from the published package, not from a summary site —
ApexCharts relicensed between v4.7.0 and v5.x and most references are stale.

## Testing

Three layers, and all three matter:

1. `validate.mjs` — vocabulary and safety. No ESM, no external references, no
   credentials, namespaced storage keys, charts have data twins.
2. `drift.mjs` — structure. Exhibits still carry takeaways and sources, the theme
   block still exists, load-bearing patterns have not been quietly removed.
3. **Look at it.** Screenshot the built file and inspect it.

Layer 3 is not optional and not a formality. During development, reading the
code missed empty CSS bars (`height` does not apply to inline elements) and a
collided axis label. The screenshot caught both immediately.

> Do **not** pass `--virtual-time-budget` when screenshotting or testing async
> behaviour. It advances timers faster than real async work completes and
> fabricates failures — it once produced a false "IndexedDB is broken at
> `file://`" finding that nearly became a documented rule.

Why two checkers: a rule checker sees vocabulary, not erosion. A linter elsewhere
reported zero violations across 2,058 class uses while agents dismantled the
design system. Verified here: stripping every takeaway and source line from a
report passes `validate.mjs` with zero warnings and fails `drift.mjs` four ways.

## Changing the skill description

The description in `SKILL.md` frontmatter is the highest-leverage text in the
project, and changing it is a **measured** change, not a taste change.

Run the eval in
[`references/SAMPLE-PROMPTS.md`](.agents/skills/artifactkit/references/SAMPLE-PROMPTS.md):
20 queries with near-miss negatives, across at least three models. Current
baseline is a **0.90 trigger rate with zero false fires**
([EVAL-RESULTS.md](.agents/skills/artifactkit/references/EVAL-RESULTS.md)).
Do not regress it.

Do not "fix" a single failed query by adding its keywords. That is overfitting.
Find the general category the failure represents, or accept it — the one known
miss ("can I get this as slides" → `pptx`) is the correct answer and is
documented as such.

## Content rules are product, not preference

The rules in SKILL.md — never fabricate a value, never plot a partial period
beside closed ones, export what is filtered, always show which column is sorted —
encode failures that recur in generated reports. They are the most valuable part
of this repo. Treat a change to them as a change to the product.

## Style

International English. No em dashes in code comments. Comments explain *why*,
especially where the code looks wrong but is not — the `document.hasFocus()`
check in `ak.deck()` exists because backgrounded windows do not smooth-scroll,
and someone will otherwise "simplify" it back into a bug.
