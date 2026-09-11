#!/usr/bin/env node
/* artifactkit — shots.mjs
   Regenerate the README screenshots from dist/.

   Usage:  node scripts/shots.mjs [--chrome "C:\\path\\to\\chrome.exe"]

   Deliberately NOT run in CI: it needs a real Chrome, and committed binaries
   should change only when someone has looked at them. Run it by hand after a
   visible change, and look at the result — that is the point of the exercise.

   Never pass --virtual-time-budget here. It advances timers faster than async
   work completes and captures half-drawn charts.
*/
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const out = path.join(root, "docs", "images");
fs.mkdirSync(out, { recursive: true });

const CANDIDATES = [
  process.argv.includes("--chrome") ? process.argv[process.argv.indexOf("--chrome") + 1] : null,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium"
].filter(Boolean);
const chrome = CANDIDATES.find(p => fs.existsSync(p));
if (!chrome) { console.error("No Chrome found. Pass --chrome <path>."); process.exit(1); }

/* Heights are chosen so each shot ends on a natural boundary rather than
   slicing an exhibit in half. Width is fixed so the set looks consistent. */
const SHOTS = [
  ["index",      1280, 1180],
  ["report",     1280, 1000],
  ["dashboard",  1280, 1060],
  ["tracker",    1280,  980],
  ["deck",       1280,  760],
  ["wiki",       1280,  900],
  ["scorecard",  1280, 1000],
  ["comparison", 1280, 1080],
  ["swatch",     1280, 1100]
];

const profile = path.join(root, ".shot-profile");
let failed = 0;
for (const [name, w, h] of SHOTS) {
  const src = path.join(dist, `${name}.html`);
  if (!fs.existsSync(src)) { console.error(`  ✗ missing ${src} — run npm run build first`); failed++; continue; }
  const dest = path.join(out, `${name}.png`);
  const r = spawnSync(chrome, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    `--window-size=${w},${h}`, `--user-data-dir=${profile}`,
    `--screenshot=${dest}`, `file://${src.replace(/\\/g, "/")}`
  ], { stdio: "ignore" });
  if (r.status !== 0 || !fs.existsSync(dest)) { console.error(`  ✗ ${name}`); failed++; continue; }
  console.log(`  ✓ ${name}.png  ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
}
fs.rmSync(profile, { recursive: true, force: true });
console.log(failed ? `\n${failed} shot(s) failed` : `\n✓ ${SHOTS.length} screenshots in docs/images/`);
process.exit(failed ? 1 : 0);
