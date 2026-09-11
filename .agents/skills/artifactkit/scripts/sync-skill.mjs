#!/usr/bin/env node
/* artifactkit — sync-skill.mjs
   Re-sync the skill bundle after changing src/ or scripts/.

   The skill is published at TWO paths on purpose:
     .agents/skills/artifactkit/   Copilot, Cursor, Codex
     .claude/skills/artifactkit/   Claude Code

   Both are REAL directories, deliberately not a symlink or a Windows junction.
   A junction breaks git: a checkout, rebase or branch switch tries to delete
   files through the link that it is simultaneously writing through the target,
   and fails mid-operation ("Deletion of directory ... failed"). A POSIX symlink
   degrades to a text stub when cloned on Windows. Two real copies cost ~100 KB
   and are checked for drift in CI.

   assets/ is a copy of src/ with relative paths rewritten so the skill works
   standalone in a sandbox with no repo checkout.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agents = path.join(root, ".agents", "skills", "artifactkit");
const claude = path.join(root, ".claude", "skills", "artifactkit");

function guardNotLink(p, label) {
  if (!fs.existsSync(p)) return;
  const st = fs.lstatSync(p);
  if (st.isSymbolicLink() || (st.mode & 0o170000) === 0o120000) {
    console.error(`✗ ${label} is a link. Replace it with a real directory:`);
    console.error(`    cmd /c rmdir "${path.relative(root, p)}"     (removes the link only)`);
    console.error(`  then re-run this script.`);
    process.exit(1);
  }
}
guardNotLink(claude, ".claude/skills/artifactkit");

const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

let n = 0;

/* 1. library files, verbatim */
for (const f of fs.readdirSync(path.join(root, "src"))) {
  copy(path.join(root, "src", f), path.join(agents, "assets", f)); n++;
}

/* 2. scripts, verbatim */
for (const f of fs.readdirSync(path.join(root, "scripts")).filter(f => f.endsWith(".mjs"))) {
  copy(path.join(root, "scripts", f), path.join(agents, "scripts", f)); n++;
}

/* 3. templates and swatch, with relative paths rewritten for the bundle layout */
const tplDir = path.join(root, "examples", "templates");
for (const f of fs.readdirSync(tplDir).filter(f => f.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(tplDir, f), "utf8").replaceAll("../../src/", "../");
  fs.mkdirSync(path.join(agents, "assets", "templates"), { recursive: true });
  fs.writeFileSync(path.join(agents, "assets", "templates", f), html); n++;
}
const swatch = fs.readFileSync(path.join(root, "examples", "swatch.html"), "utf8").replaceAll("../src/", "./");
fs.writeFileSync(path.join(agents, "assets", "swatch.html"), swatch); n++;

/* 4. mirror the whole skill to the Claude path */
fs.rmSync(claude, { recursive: true, force: true });
fs.cpSync(agents, claude, { recursive: true });

console.log(`✓ synced ${n} file(s) into the skill bundle, and mirrored to .claude/skills/artifactkit`);
