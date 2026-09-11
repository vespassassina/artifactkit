const fs = require("fs");
const path = require("path");

const root = process.cwd();
const skipDirs = new Set([".git", "node_modules"]);
const exts = new Set([".html", ".css", ".js", ".mjs", ".json", ".md", ".txt", ".yml"]);

// U+FFFD, and the classic UTF-8-read-as-latin1 sequences
const MOJI = /\uFFFD|â€|â‚¬|Â·|â–|Ã©|Ã¨|â€”|â€"/;

const moji = [], boms = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!skipDirs.has(e.name)) walk(path.join(dir, e.name)); continue; }
    if (!exts.has(path.extname(e.name))) continue;
    const p = path.join(dir, e.name);
    const buf = fs.readFileSync(p);
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF)
      boms.push(path.relative(root, p));
    const text = buf.toString("utf8");
    // Documentation about this failure mode has to quote the mojibake. Files can
    // opt out with the marker below, which is checked for literally.
    if (text.includes("check-encoding:allow-samples")) continue;
    if (MOJI.test(text)) moji.push(path.relative(root, p));
  }
})(root);

console.log("mojibake:", moji.length ? "\n  " + moji.join("\n  ") : "none");
console.log("BOMs:    ", boms.length ? "\n  " + boms.join("\n  ") : "none");
process.exit(moji.length || boms.length ? 1 : 0);
