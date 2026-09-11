const fs = require("fs");
const path = require("path");

const md = fs.readFileSync("README.md", "utf8");
const PAGES = "https://vespassassina.github.io/artifactkit/";

let bad = 0;

// local file links and images
const local = [...md.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)].map(m => m[1]);
console.log("local paths:");
for (const p of [...new Set(local)]) {
  const ok = fs.existsSync(p);
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "MISS"} ${p}`);
}

// every Pages URL must correspond to a file that will be deployed from dist/
const pages = [...md.matchAll(new RegExp(PAGES.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^)\\s]*)", "g"))]
  .map(m => m[1]).filter(Boolean);
console.log("\npages urls -> dist/:");
for (const u of [...new Set(pages)]) {
  const f = path.join("dist", u);
  const ok = fs.existsSync(f);
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "MISS"} ${u}`);
}

// images referenced must exist and be non-trivial
const imgs = [...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]);
console.log("\nimages:");
for (const i of imgs) {
  const ok = fs.existsSync(i) && fs.statSync(i).size > 5000;
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "BAD "} ${i}${fs.existsSync(i) ? ` (${(fs.statSync(i).size / 1024).toFixed(0)} KB)` : ""}`);
}

console.log(bad ? `\n${bad} broken reference(s)` : "\nall README references resolve");
process.exit(bad ? 1 : 0);
