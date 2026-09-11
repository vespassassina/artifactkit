#!/usr/bin/env node
/* Validate and drift-check every built artifact. `npm run check`, and CI. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")), "..");
const outDir = path.join(root, "dist");
if (!fs.existsSync(outDir)) { console.error("no dist/ — run `npm run build` first"); process.exit(2); }

const files = fs.readdirSync(outDir).filter(f => f.endsWith(".html"));
if (!files.length) { console.error("dist/ is empty"); process.exit(2); }

let failed = 0;
for (const f of files) {
  const p = path.join(outDir, f);
  for (const tool of ["validate.mjs", "drift.mjs"]) {
    try { execFileSync("node", [path.join(root, "scripts", tool), p], { stdio: "inherit" }); }
    catch { failed++; }
  }
}
console.log(failed ? `\n${failed} check(s) failed` : `\n✓ ${files.length} artifact(s) passed both checkers`);
process.exit(failed ? 1 : 0);
