#!/usr/bin/env node
/* artifactkit — drift.mjs
   Structural drift detection.

   WHY THIS EXISTS, separately from validate.mjs:
   canoncss measured a class-membership linter reporting ZERO violations across
   2,058 class uses while six of six agents dismantled the design system — a
   density instruction deleted the style guide's own verbatim patterns in every
   run. Rule checkers see vocabulary. They are blind to erosion.

   So this does not check "are the classes legal". It checks whether the
   artifact still has the SHAPE of a reference artifact: does every exhibit
   still carry a takeaway and a source, do tables still declare sortable
   columns, are charts still paired with data twins, is the theme block intact.

   Usage:
     node scripts/drift.mjs dist/report.html
     node scripts/drift.mjs dist/report.html --against examples/templates/report.html
     node scripts/drift.mjs dist/report.html --json

   Exit 1 if any structural invariant is broken.
*/
import fs from "node:fs/promises";
import path from "node:path";

const argv = process.argv.slice(2);
const file = argv[0];
if (!file) { console.error("usage: node scripts/drift.mjs <file.html> [--against <template.html>] [--json]"); process.exit(2); }
const against = argv.includes("--against") ? argv[argv.indexOf("--against") + 1] : null;
const asJson = argv.includes("--json");

const html = await fs.readFile(file, "utf8");

const count = (s, re) => (s.match(re) || []).length;
const has = (s, re) => re.test(s);

/* ── structural fingerprint ─────────────────────────────────────────────── */
function fingerprint(s) {
  // literal colours are legitimate INSIDE the theme block — that is what it is for
  const outsideTheme = s
    .replace(/\/\*!ak-theme-start\*\/[\s\S]*?\/\*!ak-theme-end\*\//, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return {
    exhibits:    count(s, /class="[^"]*\bak-exhibit\b/g),
    takeaways:   count(s, /class="[^"]*\bak-takeaway\b/g),
    sources:     count(s, /class="[^"]*\bak-source\b/g),
    eyebrows:    count(s, /class="[^"]*\bak-eyebrow\b/g),
    sections:    count(s, /class="[^"]*\bak-sechead\b/g),
    tables:      count(s, /class="[^"]*\bak-table\b/g),
    sortable:    count(s, /data-sort=/g),
    charts:      count(s, /ak\.chart\.(bar|line|donut)\(/g),
    sparks:      count(s, /ak\.chart\.spark\(/g),
    dataTwins:   count(s, /ak\.dataTable\(/g),
    legends:     count(s, /class="[^"]*\bak-legend\b|ak\.legend\(/g),
    kpis:        count(s, /class="[^"]*\bak-kpi\b/g),
    banners:     count(s, /class="[^"]*\bak-banner\b/g),
    disclosures: count(s, /class="[^"]*\bak-disclosure\b/g),
    dashes:      count(s, /class="[^"]*\bak-dash\b/g),
    asof:        count(s, /class="[^"]*\bak-asof\b/g),
    footer:      count(s, /class="[^"]*\bak-footer\b/g),
    themeBlock:  has(s, /\/\*!ak-theme-start\*\/[\s\S]*?\/\*!ak-theme-end\*\//) ? 1 : 0,
    tokenRefs:   count(s, /var\(--ak-/g),
    rawColors:   count(outsideTheme, /:\s*#[0-9a-f]{6}\b/gi)
  };
}

const fp = fingerprint(html);
const errors = [], warns = [], notes = [];

/* ── invariants: these hold for every artifactkit artifact ──────────────── */

// An exhibit without a takeaway is a picture with no argument.
if (fp.exhibits && fp.takeaways === 0)
  errors.push(`${fp.exhibits} exhibit(s), 0 takeaways — every exhibit states its finding, not just its topic`);
else if (fp.exhibits > fp.takeaways && fp.exhibits - fp.takeaways > 1)
  warns.push(`${fp.exhibits} exhibits but only ${fp.takeaways} takeaways`);

// An exhibit without a source is an unattributed claim.
if (fp.exhibits && fp.sources === 0)
  errors.push(`${fp.exhibits} exhibit(s), 0 source lines — name the system, the measure and the limitation`);

// A chart with no accessible twin is invisible to a screen reader and to print.
if (fp.charts > fp.dataTwins)
  errors.push(`${fp.charts} chart(s) but ${fp.dataTwins} data twin(s) — every chart needs ak.dataTable()`);

// A table with no sortable column is usually an oversight, not a decision.
if (fp.tables && fp.sortable === 0)
  warns.push("table present with no data-sort columns — readers expect to sort");

// A multi-series or donut chart with no legend cannot be read.
if (has(html, /ak\.chart\.donut\(/) && fp.legends === 0)
  errors.push("donut chart with no legend — colour is never the only signal");

// Theming must survive.
if (!fp.themeBlock)
  errors.push("theme marker block missing — the artifact can no longer be rethemed");
if (fp.tokenRefs < 20)
  warns.push(`only ${fp.tokenRefs} var(--ak-*) references — styling may have drifted to literals`);

// Provenance.
if (!fp.footer) warns.push("no footer — provenance and caveats have nowhere to live");
if (!fp.asof && fp.kpis) warns.push("KPIs with no as-of chip — the reader cannot tell how stale this is");

/* ── erosion signals: present in the reference, now absent ──────────────── */
if (against) {
  const ref = fingerprint(await fs.readFile(against, "utf8"));
  const name = path.basename(against);
  const RATIO = 0.5;   // losing half of a construct is erosion, not editing
  for (const k of Object.keys(ref)) {
    if (ref[k] >= 2 && fp[k] < ref[k] * RATIO)
      warns.push(`"${k}" fell from ${ref[k]} to ${fp[k]} vs ${name} — check this was deliberate`);
    if (ref[k] > 0 && fp[k] === 0 && ["takeaways", "sources", "dataTwins", "themeBlock", "asof"].includes(k))
      errors.push(`"${k}" present in ${name} but absent here — a load-bearing pattern was removed`);
  }
  if (ref.rawColors === 0 && fp.rawColors > 6)
    warns.push(`${fp.rawColors} literal colours vs 0 in ${name} — tokens are being bypassed`);
}

/* ── report ─────────────────────────────────────────────────────────────── */
if (asJson) {
  console.log(JSON.stringify({ file, fingerprint: fp, errors, warns }, null, 2));
  process.exit(errors.length ? 1 : 0);
}

const n = path.basename(file);
console.log(`\n  ${n} — structure`);
console.log("  " + Object.entries(fp)
  .filter(([, v]) => v)
  .map(([k, v]) => `${k}:${v}`).join("  "));

if (notes.length) notes.forEach(x => console.log("   · " + x));
if (warns.length) { console.log(`\n  ${warns.length} warning(s)`); warns.forEach(w => console.log("   ! " + w)); }
if (errors.length) {
  console.error(`\n  ${errors.length} structural error(s)`);
  errors.forEach(e => console.error("   ✗ " + e));
  console.error("\nA pattern that carries meaning has been removed. Restore it or justify the removal.");
  process.exit(1);
}
console.log(`\n✓ structure intact (${warns.length} warning(s))`);
