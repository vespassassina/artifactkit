#!/usr/bin/env node
/* Build every example. Used by `npm run build` and by CI. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tplDir = path.join(root, "examples", "templates");
const outDir = path.join(root, "dist");
fs.mkdirSync(outDir, { recursive: true });

const jobs = fs.readdirSync(tplDir)
  .filter(f => f.endsWith(".html"))
  .map(f => ({ in: path.join(tplDir, f), out: path.join(outDir, f), id: "sample-" + path.basename(f, ".html") }));
jobs.push({
  in: path.join(root, "examples", "swatch.html"),
  out: path.join(outDir, "swatch.html"), id: "swatch"
});

let failed = 0;
for (const j of jobs) {
  try {
    execFileSync("node", [path.join(root, "scripts", "build.mjs"), j.in, "-o", j.out, "--id", j.id],
      { stdio: "inherit" });
  } catch { failed++; }
}

/* the deck also ships an audience build, to demonstrate --strip-notes */
try {
  execFileSync("node", [path.join(root, "scripts", "build.mjs"),
    path.join(tplDir, "deck.html"), "-o", path.join(outDir, "deck-audience.html"),
    "--id", "sample-deck-audience", "--strip-notes"], { stdio: "inherit" });
} catch { failed++; }

/* the gallery is hand-written, not generated — inline it the same way */
try {
  execFileSync("node", [path.join(root, "scripts", "build.mjs"),
    path.join(root, "examples", "index.html"), "-o", path.join(outDir, "index.html"),
    "--id", "gallery"], { stdio: "inherit" });
} catch { failed++; }

console.log(failed ? `\n${failed} build(s) failed` : `\n✓ built ${jobs.length + 2} artifacts`);
process.exit(failed ? 1 : 0);
