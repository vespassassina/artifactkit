#!/usr/bin/env node
/* artifactkit — validate.mjs
   Deterministic checks on a built artifact. Runs as code, so its rules cost
   the agent zero context tokens — only the failures enter the conversation.

   Usage:  node scripts/validate.mjs dist/report.html
   Exit 1 on any error. Warnings do not fail the build.

   Note the limit of this class of tool: a rule checker sees vocabulary
   violations, not design degradation. canoncss measured a linter reporting
   zero violations across 2,058 class uses while agents dismantled the design
   system. Passing here means "not broken", not "good".
*/
import fs from "node:fs/promises";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/validate.mjs <file.html>"); process.exit(2); }
const html = await fs.readFile(file, "utf8");

const errors = [], warns = [];
const E = m => errors.push(m);
const W = m => warns.push(m);

/* ── self-containment ─────────────────────────────────────────────────── */
const modScript = /<script[^>]*type=["']module["']/i.test(html);
if (modScript) E('<script type="module"> — ES modules are CORS-blocked at file://. Use a classic script.');

for (const m of html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi))
  E(`external script not inlined: ${m[1]}`);
for (const m of html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi))
  E(`external stylesheet not inlined: ${m[1]}`);
for (const m of html.matchAll(/url\(\s*["']?(https?:\/\/[^)"']+)/gi))
  E(`external CSS asset: ${m[1]}`);
for (const m of html.matchAll(/@import\s+(?:url\()?["']?(https?:[^)"';]+)/gi))
  E(`@import from the network: ${m[1]}`);
for (const m of html.matchAll(/<img[^>]*\ssrc=["'](https?:[^"']+)["']/gi))
  W(`remote image will not render offline: ${m[1]}`);
if (/<link[^>]*rel=["']icon["']/.test(html) === false)
  W("no favicon — a local file will 404 on /favicon.ico");

/* ── storage hygiene ──────────────────────────────────────────────────── */
// Every file:// page shares ONE localStorage area. Unnamespaced keys are both
// a collision bug and a cross-artifact disclosure bug.
if (/localStorage\.(set|get|remove)Item\(\s*["'](?!ak:)/.test(html))
  E("raw localStorage key — use ak.persist()/ak.restore(), which namespace by artifact id");
if (/ak\.init\(\s*\{[^}]*id\s*:\s*["']artifact["']/.test(html))
  W('ak.init() still uses the default id "artifact" — pass a unique --id at build time');
if (!/ak\.init\(/.test(html) && /ak\.persist\(/.test(html))
  E("ak.persist() used without ak.init({id}) — keys would not be namespaced");

/* ── credentials ──────────────────────────────────────────────────────── */
const state = html.match(/<script[^>]*id=["']ak-state["'][^>]*>([\s\S]*?)<\/script>/i);
const SECRETS = [
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, "JWT"],
  [/\bgh[pousr]_[A-Za-z0-9]{16,}/, "GitHub token"],
  [/\bsk-[A-Za-z0-9]{20,}/, "API key"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, "Slack token"],
  [/["'](?:client_secret|password|api_?key)["']\s*:\s*["'][^"']{6,}/i, "secret-shaped field"]
];
for (const [re, label] of SECRETS) {
  if (state && re.test(state[1])) E(`${label} in the embedded state block — this file is shareable, revoke it`);
  else if (re.test(html)) E(`${label} found in the artifact — revoke it and rebuild`);
}

/* ── accessibility & reporting rules ──────────────────────────────────── */
const svgCharts = (html.match(/class=["'][^"']*ak-chart/g) || []).length;
const twins = (html.match(/ak-vh/g) || []).length;
if (svgCharts && !twins)
  E(`${svgCharts} chart(s) but no visually-hidden data table — add ak.dataTable() for each`);
if (/<svg[^>]*class=["'][^"']*ak-chart/.test(html) && !/<title>/.test(html))
  W("charts without <title> elements — native tooltips and screen readers both lose out");

if (/data-sort=/.test(html) && !/aria-sort/.test(html) && !/ak\.table\(/.test(html))
  W("sortable columns but no aria-sort handling — always show which column is sorted");

if (!/@media\s+print/.test(html))
  E("no print stylesheet — window.print() is the PDF path, it must be styled");
if (!/break-inside/.test(html))
  W("print CSS has no break-inside rules — exhibits will split across pages");

if (/<canvas/i.test(html) && !/ak-vh/.test(html))
  W("canvas chart with no data twin — canvas is invisible to screen readers and prints blurry");

/* ── colour discipline ────────────────────────────────────────────────── */
const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join("\n");
/* Markers are `/*!ak-theme-start|end*\/` rather than a word like "@theme",
   because a word also appears in the prose that explains it — which made an
   earlier non-greedy match terminate on the mention instead of the block. */
const themeBlock = (styleBlocks.match(/\/\*!ak-theme-start\*\/([\s\S]*?)\/\*!ak-theme-end\*\//) || [])[1] || "";
const outsideTheme = styleBlocks
  .replace(/\/\*!ak-theme-start\*\/[\s\S]*?\/\*!ak-theme-end\*\//, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");   // comments cannot affect rendering — documented presets are not violations
const hardCoded = [...outsideTheme.matchAll(/:\s*(#[0-9a-f]{3,8})\b/gi)]
  .map(m => m[1]).filter(h => !/^#(fff|ffffff|000|000000|bbb|eee|555)$/i.test(h));
if (hardCoded.length > 6)
  W(`${hardCoded.length} hard-coded colours outside the theme block (e.g. ${[...new Set(hardCoded)].slice(0, 4).join(", ")}) — use var(--ak-*) so retheming works`);
if (!themeBlock) W("no theme marker block found — users and agents cannot retheme this artifact");

/* ── data honesty (heuristics; these are warnings by nature) ──────────── */
if (/\bpartial\b/i.test(html) && !/\bexclu/i.test(html))
  W("mentions partial data but never says it is excluded — never plot a partial period beside closed ones");
if (/ak-table/.test(html) && !/ak-source|ak-footer/.test(html))
  W("a table with no source line — name the system, the measure, and the known limitation");

/* ── size ─────────────────────────────────────────────────────────────── */
const kb = Buffer.byteLength(html) / 1024;
if (kb > 5000) E(`${kb.toFixed(0)} KB — too large; browsers stall and mail gateways reject it`);
else if (kb > 2000) W(`${kb.toFixed(0)} KB — large; consider dropping an optional module`);

/* ── report ───────────────────────────────────────────────────────────── */
const name = file.split(/[\\/]/).pop();
if (warns.length) { console.log(`\n  ${warns.length} warning(s) in ${name}`); warns.forEach(w => console.log("   ! " + w)); }
if (errors.length) {
  console.error(`\n  ${errors.length} error(s) in ${name}`);
  errors.forEach(e => console.error("   ✗ " + e));
  console.error("\nFix these, rebuild, and re-run. Do not ship until this passes.");
  process.exit(1);
}
console.log(`\n✓ ${name} passed (${kb.toFixed(1)} KB, ${warns.length} warning(s))`);
