#!/usr/bin/env node
/* artifactkit — build.mjs
   Inlines artifactkit's own CSS/JS into one self-contained .html.
   Optional third-party modules are FETCHED AT BUILD TIME, never vendored in
   this repo, and each one's licence is inlined alongside it automatically.

   Usage:
     node scripts/build.mjs examples/swatch.html -o dist/swatch.html
     node scripts/build.mjs report.html -o out.html --with marked,sortablejs
     node scripts/build.mjs report.html -o out.html --id q3-review

   Offline: artifactkit's own core always works. --with needs the network at
   BUILD time only; if it is unreachable the build fails loudly rather than
   emitting a half-broken artifact.
*/
import fs from "node:fs/promises";
import path from "node:path";

const CDN = "https://cdn.jsdelivr.net/npm/";

/* Known-good modules. `file` is a hint; the resolver also reads the package
   manifest, because hardcoded dist paths rot as libraries version. ESM is
   unusable at file:// (CORS on an opaque origin), so a UMD/IIFE build is
   mandatory and the resolver rejects anything that looks like a module. */
const MODULES = {
  marked:     { pkg: "marked",     file: "lib/marked.umd.js",             global: "marked" },
  prism:      { pkg: "prismjs",    file: "prism.js",                      global: "Prism", css: "themes/prism.css" },
  minisearch: { pkg: "minisearch", file: "dist/umd/index.js",             global: "MiniSearch" },
  papaparse:  { pkg: "papaparse",  file: "papaparse.min.js",              global: "Papa" },
  sortablejs: { pkg: "sortablejs", file: "Sortable.min.js",               global: "Sortable" },
  chartjs:    { pkg: "chart.js",   file: "dist/chart.umd.js",             global: "Chart" },
  reveal:     { pkg: "reveal.js",  file: "dist/reveal.js",                global: "Reveal", css: "dist/reveal.css" }
};

const args = process.argv.slice(2);
if (!args.length || args.includes("-h") || args.includes("--help")) {
  console.log(`artifactkit build
  node scripts/build.mjs <input.html> -o <output.html> [--with a,b] [--id slug] [--minify] [--strip-notes]

  --strip-notes   remove <aside class="ak-notes"> blocks entirely — the audience
                  build of a deck. Hiding them in CSS still ships the text.`);
  process.exit(0);
}
const input = args[0];
const flag = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d; };
const output = flag("-o", input.replace(/\.html$/, ".build.html"));
const withMods = (flag("--with", "") || "").split(",").map(s => s.trim()).filter(Boolean);
const artifactId = flag("--id", path.basename(output, ".html"));
const minify = args.includes("--minify");
const stripNotes = args.includes("--strip-notes");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, "")), "..");
const inDir = path.dirname(path.resolve(input));

async function readLocal(href) {
  const p = path.resolve(inDir, href);
  return fs.readFile(p, "utf8");
}

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.text();
}

/* Attribution is mechanical. We fetch each module's licence text and inline it
   with the code, so the artifact carries its own notices and we never have to
   maintain a THIRD-PARTY-NOTICES file for code we do not ship. */
const looksLikeESM = s =>
  /^\s*(export\s|import\s+[\w{*])/m.test(s.slice(0, 4000)) ||
  /\bexport\s*\{[^}]*\}\s*;?\s*$/.test(s.slice(-2000));

async function fetchModule(name) {
  const m = MODULES[name];
  if (!m) throw new Error(`unknown module "${name}". Known: ${Object.keys(MODULES).join(", ")}`);
  const meta = JSON.parse(await fetchText(`${CDN}${m.pkg}/package.json`));
  const version = meta.version, license = meta.license || "see LICENSE";
  const base = `${CDN}${m.pkg}@${version}/`;

  // try, in order: explicit hint → CDN fields → browser/main → common names
  const candidates = [...new Set([
    m.file, meta.jsdelivr, meta.unpkg,
    typeof meta.browser === "string" ? meta.browser : null,
    meta.main,
    `dist/${m.pkg}.umd.js`, `dist/${m.pkg}.min.js`, `${m.pkg}.min.js`
  ].filter(Boolean).map(f => f.replace(/^\.\//, "")))];

  let js = null, used = null, tried = [];
  for (const f of candidates) {
    try {
      const text = await fetchText(base + f);
      if (looksLikeESM(text)) { tried.push(`${f} (ESM — unusable at file://)`); continue; }
      js = text; used = f; break;
    } catch { tried.push(`${f} (404)`); }
  }
  if (!js) throw new Error(`no usable UMD build for ${m.pkg}@${version}. Tried: ${tried.join(", ")}`);

  let css = null;
  if (m.css) { try { css = await fetchText(base + m.css); } catch { /* optional */ } }
  let licenseText = "";
  for (const f of ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "LICENCE"]) {
    try { licenseText = await fetchText(base + f); break; } catch { /* try next */ }
  }
  if (!licenseText) console.warn(`  ! no licence file found for ${m.pkg} — check attribution manually`);
  return { name, pkg: m.pkg, version, license, js, css, file: used, licenseText: licenseText.trim() };
}

(async () => {
  let html = await fs.readFile(input, "utf8");

  /* 1. inline local stylesheets */
  const links = [...html.matchAll(/<link\s[^>]*rel=["']stylesheet["'][^>]*>/gi)];
  for (const [tag] of links) {
    const href = (tag.match(/href=["']([^"']+)["']/) || [])[1];
    if (!href || /^https?:/i.test(href)) continue;
    const css = await readLocal(href);
    html = html.replace(tag, `<style>\n/* ${href} */\n${css}\n</style>`);
  }

  /* 2. inline local scripts */
  const scripts = [...html.matchAll(/<script\s[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)];
  for (const [tag, src] of scripts) {
    if (/^https?:/i.test(src)) continue;
    if (/type=["']module["']/.test(tag)) throw new Error(`${src} is a module script — unusable at file://`);
    const js = await readLocal(src);
    html = html.replace(tag, `<script>\n/* ${src} */\n${js}\n</script>`);
  }

  /* 3. fetch + inline optional modules, with their licences */
  if (withMods.length) {
    const mods = [];
    for (const n of withMods) {
      process.stdout.write(`  fetching ${n}… `);
      try { const m = await fetchModule(n); mods.push(m); console.log(`${m.pkg}@${m.version} (${m.license})`); }
      catch (e) {
        console.error(`\nFAILED: ${e.message}`);
        console.error(`\nartifactkit never vendors third-party code, so --with needs network access at build time.`);
        console.error(`Either connect and retry, or drop --with ${n} and use the zero-dependency core.`);
        process.exit(1);
      }
    }
    const css = mods.filter(m => m.css).map(m => `/* ${m.pkg}@${m.version} */\n${m.css}`).join("\n");
    const js = mods.map(m =>
      `/* ${m.pkg}@${m.version} — ${m.license}\n${m.licenseText || "see " + CDN + m.pkg}\n*/\n${m.js}`).join("\n;\n");
    const notices = mods.map(m =>
      `<li><strong>${m.pkg}</strong> ${m.version} — ${m.license}</li>`).join("");
    if (css) html = html.replace("</head>", `<style>\n${css}\n</style>\n</head>`);
    html = html.replace("</body>", `<script>\n${js}\n</script>\n</body>`);
    html = html.replace("</body>",
      `<details data-ak-noprint style="margin:2rem auto;max-width:var(--ak-maxw);font-size:11px">` +
      `<summary>Third-party licences</summary><ul>${notices}</ul>` +
      `<p>Full licence text is inlined above each library in this file's source.</p></details>\n</body>`);
  }

  /* 4. stamp the artifact id so storage keys are namespaced */
  html = html.replace(/ak\.init\(\{\s*id:\s*["'][^"']*["']/, `ak.init({ id: "${artifactId}"`);

  /* 5. data-URI favicon so a local file does not 404 on /favicon.ico */
  if (!/rel=["']icon["']/.test(html)) {
    const ico = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%23F1ECE1'/%3E%3Crect x='3' y='3' width='10' height='2' fill='%2314496B'/%3E%3Crect x='3' y='7' width='10' height='1' fill='%235C5A54'/%3E%3Crect x='3' y='10' width='6' height='1' fill='%235C5A54'/%3E%3C/svg%3E`;
    html = html.replace("</head>", `<link rel="icon" href="${ico}">\n</head>`);
  }

  if (minify) {
    html = html
      .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
      .replace(/\n\s*\n+/g, "\n");
  }

  /* 6. --strip-notes: an audience build with the speaker notes physically
        removed, not merely hidden. CSS hiding still ships the text in the
        file, and a deck is exactly the artifact people forward onward. */
  if (stripNotes) {
    // count ELEMENTS, not any mention of the class — the stylesheet and the
    // presenter code both reference .ak-notes and must survive the strip
    const noteEl = /<aside[^>]*class="[^"]*\bak-notes\b[^"]*"[\s\S]*?<\/aside>/gi;
    const before = (html.match(noteEl) || []).length;
    html = html.replace(noteEl, "");
    const after = (html.match(noteEl) || []).length;
    console.log(`  stripped ${before} speaker-note block(s)`);
    if (after) console.warn(`  ! ${after} note block(s) survived — check for nested <aside> tags`);
    // belt and braces: nothing note-shaped should still carry prose.
    // Strip comments first — both CSS and JS comments legitimately mention the
    // class name, and an earlier version flagged its own documentation.
    const code = html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const orphan = (code.match(/class="[^"]*\bak-notes\b[^"]*"[^>]*>\s*\S/g) || []).length;
    if (orphan) console.warn(`  ! ${orphan} element(s) still carry ak-notes content in a non-<aside> tag`);
  }

  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fs.writeFile(output, html, "utf8");
  const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
  console.log(`\n✓ ${output}  ${kb} KB  (self-contained, classic scripts only)`);
})().catch(e => { console.error("build failed:", e.message); process.exit(1); });
