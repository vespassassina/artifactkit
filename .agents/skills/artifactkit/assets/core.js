/* artifactkit — core.js
   MIT. No third-party code. Classic script — never a module.
   ES modules are blocked at file:// (CORS on an opaque origin), so this file
   must stay an IIFE and must never use import/export.

   Exposes one global: `ak`.
*/
(function (root) {
  "use strict";

  var ak = {};
  var CFG = { id: "artifact", title: document.title || "artifact" };

  /* ─── init ──────────────────────────────────────────────────────────────
     The id namespaces every storage key. This is not optional: all file://
     pages share ONE localStorage area, so an unnamespaced key is both a
     collision bug and a disclosure bug between unrelated artifacts.        */
  ak.init = function (opts) {
    opts = opts || {};
    if (!opts.id) console.warn("[ak] init() without an id — storage keys will collide with other local artifacts");
    CFG.id = opts.id || CFG.id;
    CFG.title = opts.title || CFG.title;
    return ak;
  };

  /* ─── formatting ────────────────────────────────────────────────────── */
  var nf = function (o) { return new Intl.NumberFormat(undefined, o); };
  ak.fmt = {
    num: function (v, d) { return v == null ? "–" : nf({ minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 1 : d }).format(v); },
    pct: function (v, d) { return v == null ? "–" : nf({ minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 1 : d }).format(v) + "%"; },
    cur: function (v, c, d) { return v == null ? "–" : nf({ style: "currency", currency: c || "EUR", maximumFractionDigits: d == null ? 0 : d }).format(v); },
    signed: function (v, d) { return v == null ? "–" : (v > 0 ? "+" : "") + ak.fmt.num(v, d); },
    date: function (d) { return d == null ? "–" : new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)); }
  };
  /* Round in the UI, keep full precision in the export. */

  /* ─── tiny store ────────────────────────────────────────────────────────
     Deliberately not a framework. An agent calling a documented 20-line API
     is more reliable than it recalling a third party's.                    */
  ak.store = function (initial) {
    var state = initial || {}, subs = [];
    return {
      get: function (k) { return k == null ? state : state[k]; },
      set: function (patch) {
        var changed = false, k;
        for (k in patch) if (state[k] !== patch[k]) { state[k] = patch[k]; changed = true; }
        if (changed) { markDirty(); subs.forEach(function (f) { try { f(state); } catch (e) { console.error(e); } }); }
        return state;
      },
      subscribe: function (f) { subs.push(f); f(state); return function () { subs = subs.filter(function (x) { return x !== f; }); }; }
    };
  };

  /* ─── namespaced local storage. crash buffer only, never the record ──── */
  function key(k) { return "ak:" + CFG.id + ":" + k; }
  ak.persist = function (k, value) {
    try { localStorage.setItem(key(k), JSON.stringify(value)); return true; }
    catch (e) { console.warn("[ak] persist failed:", e.name); return false; }
  };
  ak.restore = function (k, fallback) {
    try { var v = localStorage.getItem(key(k)); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  };
  ak.forget = function (k) { try { localStorage.removeItem(key(k)); } catch (e) {} };

  /* ─── embedded state block ──────────────────────────────────────────────
     Convention borrowed from Feather Wiki: <script id="ak-state" type="application/json">.
     The serializer is ALLOW-LISTED. Never JSON.stringify the whole app state —
     whatever is in memory ends up in a file the user may email.            */
  var SECRETY_KEY = /(api[_-]?key|secret|token|password|passwd|bearer|auth|credential|client[_-]?secret|session)/i;
  var SECRETY_VAL = [
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,      // JWT
    /\bgh[pousr]_[A-Za-z0-9]{16,}/,                    // GitHub token
    /\bsk-[A-Za-z0-9]{20,}/,                           // OpenAI-style key
    /\bxox[baprs]-[A-Za-z0-9-]{10,}/                   // Slack token
  ];
  function scan(obj, path, found) {
    if (obj == null) return found;
    if (typeof obj === "string") {
      for (var i = 0; i < SECRETY_VAL.length; i++)
        if (SECRETY_VAL[i].test(obj)) found.push(path + " (value looks like a credential)");
      return found;
    }
    if (typeof obj !== "object") return found;
    for (var k in obj) {
      if (SECRETY_KEY.test(k)) found.push((path ? path + "." : "") + k + " (key name)");
      scan(obj[k], (path ? path + "." : "") + k, found);
    }
    return found;
  }
  ak.readState = function (fallback) {
    var el = document.getElementById("ak-state");
    if (!el) return fallback;
    try { return JSON.parse(el.textContent); } catch (e) { console.warn("[ak] state block is not valid JSON"); return fallback; }
  };
  /** Serialise only `allow`ed keys, and refuse anything credential-shaped. */
  ak.writeState = function (obj, allow) {
    var out = {}, i;
    if (!Array.isArray(allow) || !allow.length) throw new Error("[ak] writeState requires an explicit allow-list of keys");
    for (i = 0; i < allow.length; i++) if (obj[allow[i]] !== undefined) out[allow[i]] = obj[allow[i]];
    var bad = scan(out, "", []);
    if (bad.length) throw new Error("[ak] refusing to serialise credentials into the artifact: " + bad.join(", "));
    var el = document.getElementById("ak-state");
    if (!el) { el = document.createElement("script"); el.id = "ak-state"; el.type = "application/json"; document.body.appendChild(el); }
    el.textContent = JSON.stringify(out);
    return out;
  };

  /* ─── dirty tracking ────────────────────────────────────────────────────
     TiddlyWiki's download saver calls back "saved" the instant it clicks the
     link — success it cannot possibly know. We never claim that.           */
  var dirty = false, dirtyEls = [];
  function markDirty() { dirty = true; paintDirty(); }
  function paintDirty() {
    dirtyEls.forEach(function (el) {
      el.textContent = dirty ? "Unsaved changes" : "Saved";
      el.dataset.akDirty = dirty ? "1" : "0";
    });
  }
  ak.dirtyIndicator = function (el) { dirtyEls.push(el); paintDirty(); return ak; };
  ak.isDirty = function () { return dirty; };
  root.addEventListener("beforeunload", function (e) {
    if (!dirty) return;
    e.preventDefault(); e.returnValue = "";
  });

  /* ─── saver cascade ─────────────────────────────────────────────────────
     Lessons taken from TiddlyWiki #5404 (open since 2021):
       · canSave() is SYNCHRONOUS while the API is async — so gate on a
         cached boolean, never a promise.
       · showSaveFilePicker requires a user gesture, so there is NO
         unattended autosave. The first save each session costs one click.
       · a broken saver cannot be unloaded — so save() returns false
         synchronously and the next saver in the cascade gets its turn.     */
  var fileHandle = null;

  var fsaSaver = {
    name: "filesystem",
    canSave: function () { return typeof root.showSaveFilePicker === "function"; },
    save: function (text, filename, done) {
      (async function () {
        try {
          if (!fileHandle) {
            fileHandle = await root.showSaveFilePicker({
              suggestedName: filename,
              types: [{ description: "HTML", accept: { "text/html": [".html"] } }]
            });
          } else if (fileHandle.queryPermission) {
            var p = await fileHandle.queryPermission({ mode: "readwrite" });
            if (p !== "granted") p = await fileHandle.requestPermission({ mode: "readwrite" });
            if (p !== "granted") { done(false, "permission denied"); return; }
          }
          // "exclusive" matters: the default "siloed" means the last writer
          // wins, so two open tabs clobber each other silently.
          var w = await fileHandle.createWritable({ mode: "exclusive", keepExistingData: false });
          await w.write(text); await w.close();
          done(true, fileHandle.name);
        } catch (err) {
          if (err && err.name === "AbortError") { done(false, "cancelled"); return; }
          fileHandle = null;            // drop a poisoned handle, fall back next time
          done(false, err ? err.name + ": " + err.message : "failed");
        }
      })();
      return true;
    }
  };

  var downloadSaver = {
    name: "download",
    canSave: function () { return "download" in document.createElement("a"); },
    save: function (text, filename, done) {
      try {
        var blob = new Blob([text], { type: "text/html;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        // We cannot know whether the user kept the file, so we do not claim it.
        done(null, "downloaded");
        return true;
      } catch (e) { return false; }
    }
  };

  ak.savers = [fsaSaver, downloadSaver];

  /**
   * Save the whole document. MUST be called from a user gesture.
   * @param {{filename?:string, serialize?:function, onResult?:function}} opts
   */
  ak.save = function (opts) {
    opts = opts || {};
    var filename = opts.filename || (CFG.id + ".html");
    if (typeof opts.serialize === "function") opts.serialize();   // update the state block first
    var text = "<!doctype html>\n" + document.documentElement.outerHTML;

    for (var i = 0; i < ak.savers.length; i++) {
      var s = ak.savers[i];
      if (!s.canSave()) continue;
      var handled = s.save(text, filename, function (ok, detail) {
        if (ok === true) { dirty = false; paintDirty(); ak.toast("Saved to " + detail); }
        else if (ok === null) { ak.toast("Downloaded — replace the original file to keep your changes"); }
        else { ak.toast("Not saved: " + detail); }
        if (opts.onResult) opts.onResult(ok, detail);
      });
      if (handled) return s.name;
    }
    ak.toast("No saver available in this browser");
    return null;
  };

  /* ─── toast ─────────────────────────────────────────────────────────── */
  var toastEl = null, toastT = null;
  ak.toast = function (msg, ms) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "ak-toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.style.display = "block";
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.style.display = "none"; }, ms || 3200);
  };

  /* ─── CSV ───────────────────────────────────────────────────────────────
     Export what is on screen — filtered and sorted — not the raw dataset.
     BOM so Excel reads UTF-8 without mangling accents.                     */
  function csvCell(v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }
  ak.csv = function (rows, headers, filename) {
    var lines = [];
    if (headers) lines.push(headers.map(csvCell).join(","));
    rows.forEach(function (r) { lines.push(r.map(csvCell).join(",")); });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename || (CFG.id + ".csv");
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  };

  /* ─── table: sort, filter, export ───────────────────────────────────────
     Progressive enhancement over real markup. Mark sortable columns with
     data-sort="s" (string) or "n" (number) on the <th>.                    */
  ak.table = function (tableEl, opts) {
    opts = opts || {};
    var tbody = tableEl.tBodies[0];
    if (!tbody) return null;
    var all = Array.prototype.slice.call(tbody.rows);
    var view = all.slice(), sortIdx = null, sortDir = 1;

    function cellVal(tr, i, type) {
      var td = tr.cells[i]; if (!td) return type === "n" ? 0 : "";
      var raw = td.dataset.v != null ? td.dataset.v : td.textContent;
      if (type !== "n") return raw.trim().toLowerCase();
      var n = parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
      return isNaN(n) ? -Infinity : n;
    }
    function paint() {
      tbody.textContent = "";
      view.forEach(function (tr) { tbody.appendChild(tr); });
      if (opts.onRender) opts.onRender(view);
      var empty = tableEl.parentNode.querySelector("[data-ak-empty]");
      if (empty) empty.hidden = view.length > 0;
    }
    var ths = Array.prototype.slice.call(tableEl.tHead ? tableEl.tHead.rows[0].cells : []);
    ths.forEach(function (th, i) {
      if (!th.dataset.sort) return;
      th.setAttribute("role", "columnheader");
      th.tabIndex = 0;
      function doSort() {
        sortDir = sortIdx === i ? -sortDir : 1; sortIdx = i;
        // Always show WHICH column is sorted — an arrow on the active column only.
        ths.forEach(function (x) { x.removeAttribute("aria-sort"); });
        th.setAttribute("aria-sort", sortDir === 1 ? "ascending" : "descending");
        var type = th.dataset.sort;
        view.sort(function (a, b) {
          var x = cellVal(a, i, type), y = cellVal(b, i, type);
          return (type === "n" ? (x - y) : String(x).localeCompare(String(y))) * sortDir;
        });
        paint();
      }
      th.addEventListener("click", doSort);
      th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); doSort(); } });
    });

    var api = {
      filter: function (q) {
        q = String(q || "").trim().toLowerCase();
        view = !q ? all.slice() : all.filter(function (tr) { return tr.textContent.toLowerCase().indexOf(q) > -1; });
        if (sortIdx != null) { var th = ths[sortIdx], t = th.dataset.sort;
          view.sort(function (a, b) { var x = cellVal(a, sortIdx, t), y = cellVal(b, sortIdx, t);
            return (t === "n" ? (x - y) : String(x).localeCompare(String(y))) * sortDir; }); }
        paint(); return api;
      },
      rows: function () { return view; },
      exportCSV: function (filename) {
        var headers = ths.map(function (th) { return th.textContent.replace(/[↕▲▼]/g, "").trim(); });
        var data = view.map(function (tr) {
          return Array.prototype.slice.call(tr.cells).map(function (td) {
            return td.dataset.v != null ? td.dataset.v : td.textContent.trim();
          });
        });
        ak.csv(data, headers, filename);
        return api;
      }
    };
    if (opts.filterInput) {
      var inp = typeof opts.filterInput === "string" ? document.querySelector(opts.filterInput) : opts.filterInput;
      if (inp) inp.addEventListener("input", function () { api.filter(inp.value); });
    }
    return api;
  };

  /* ─── charts: SVG, ~no code. vector prints crisply; canvas does not ──── */
  var NS = "http://www.w3.org/2000/svg";
  function svgEl(n, a) { var e = document.createElementNS(NS, n); for (var k in (a || {})) e.setAttribute(k, a[k]); return e; }
  function titled(el, text) { var t = svgEl("title"); t.textContent = text; el.appendChild(t); return el; }
  function lin(d0, d1, r0, r1) { return function (v) { return d1 === d0 ? r0 : r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; }
  function host(sel) { return typeof sel === "string" ? document.querySelector(sel) : sel; }
  ak.palette = ["var(--ak-c1)", "var(--ak-c2)", "var(--ak-c3)", "var(--ak-c4)", "var(--ak-c5)", "var(--ak-c6)"];

  function frame(h, w, m) {
    var svg = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: "100%", height: h, role: "img", class: "ak-chart" });
    var g = svgEl("g", { transform: "translate(" + m.l + "," + m.t + ")" });
    svg.appendChild(g);
    return { svg: svg, g: g, iw: w - m.l - m.r, ih: h - m.t - m.b };
  }
  function yGrid(g, iw, ih, lo, hi, y, fmt, skipFirst) {
    var grid = svgEl("g", { class: "ak-nc-grid" }); g.appendChild(grid);
    for (var i = 0; i <= 4; i++) {
      var v = lo + (hi - lo) / 4 * i, yy = y(v);
      grid.appendChild(svgEl("line", { x1: 0, x2: iw, y1: yy, y2: yy }));
      if (skipFirst && i === 0) continue;   // the axis line already marks the baseline
      var t = svgEl("text", { x: -8, y: yy + 3.5, "text-anchor": "end", class: "ak-nc-axis" });
      t.textContent = fmt(v); grid.appendChild(t);
    }
    var ax = svgEl("g", { class: "ak-nc-axis" });
    ax.appendChild(svgEl("line", { x1: 0, x2: iw, y1: ih, y2: ih })); g.appendChild(ax);
  }

  ak.chart = {
    /**
     * data: [{label, value, color?}]
     * One measure across categories is ONE colour. Cycling six colours for a
     * single series encodes nothing and is the classic chart-junk tell.
     * Use `highlight: <index>` to pick out the bar you are talking about, or
     * `colorBy:"category"` when the categories genuinely are the dimension.
     */
    bar: function (sel, data, o) {
      o = o || {}; var el = host(sel); if (!el) return;
      var m = o.margin || { t: 8, r: 8, b: 28, l: 44 }, h = o.height || 240;
      var w = el.clientWidth || 520, f = o.format || function (v) { return ak.fmt.num(v, 0); };
      var F = frame(h, w, m), max = Math.max.apply(null, data.map(function (d) { return d.value; })) * 1.1 || 1;
      var y = lin(0, max, F.ih, 0), step = F.iw / data.length, bw = step * 0.62;
      titled(F.svg, o.title || "Bar chart");
      yGrid(F.g, F.iw, F.ih, 0, max, y, f, false);
      data.forEach(function (d, i) {
        var fill = d.color
          || (o.colorBy === "category" ? ak.palette[i % 6]
              : (o.highlight === i ? "var(--ak-c1)" : (o.highlight == null ? "var(--ak-c1)" : "var(--ak-rule-mid)")));
        var r = svgEl("rect", { x: step * i + (step - bw) / 2, y: y(d.value), width: bw,
          height: Math.max(0, F.ih - y(d.value)), fill: fill });
        titled(r, d.label + ": " + f(d.value)); F.g.appendChild(r);
        var t = svgEl("text", { x: step * i + step / 2, y: F.ih + 16, "text-anchor": "middle", class: "ak-nc-axis" });
        t.textContent = d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label; F.g.appendChild(t);
      });
      el.textContent = ""; el.appendChild(F.svg); return F.svg;
    },
    /** series: [{name, values:[], color?, dash?}] */
    line: function (sel, series, labels, o) {
      o = o || {}; var el = host(sel); if (!el) return;
      var m = o.margin || { t: 8, r: 8, b: 28, l: 44 }, h = o.height || 240;
      var w = el.clientWidth || 520, f = o.format || function (v) { return ak.fmt.num(v, 1); };
      var all = series.reduce(function (a, s) { return a.concat(s.values); }, []);
      var lo = o.min != null ? o.min : Math.min.apply(null, all) * 0.9;
      var hi = o.max != null ? o.max : Math.max.apply(null, all) * 1.06;
      var F = frame(h, w, m), y = lin(lo, hi, F.ih, 0);
      var x = function (i) { return labels.length < 2 ? 0 : i / (labels.length - 1) * F.iw; };
      titled(F.svg, o.title || "Line chart");
      yGrid(F.g, F.iw, F.ih, lo, hi, y, f, true);
      series.forEach(function (s, si) {
        var d = s.values.map(function (v, i) { return (i ? "L" : "M") + x(i) + "," + y(v); }).join(" ");
        F.g.appendChild(svgEl("path", { d: d, fill: "none", stroke: s.color || ak.palette[si % 6],
          "stroke-width": s.width || 2, "stroke-dasharray": s.dash || "", "stroke-linejoin": "round" }));
        s.values.forEach(function (v, i) {
          var c = svgEl("circle", { cx: x(i), cy: y(v), r: 2.6, fill: s.color || ak.palette[si % 6] });
          titled(c, s.name + " " + labels[i] + ": " + f(v)); F.g.appendChild(c);
        });
      });
      var every = labels.length > 8 ? 2 : 1;
      labels.forEach(function (l, i) {
        if (i % every) return;
        var t = svgEl("text", { x: x(i), y: F.ih + 16, "text-anchor": "middle", class: "ak-nc-axis" });
        t.textContent = l; F.g.appendChild(t);
      });
      el.textContent = ""; el.appendChild(F.svg); return F.svg;
    },
    /** data: [{label, value, color?}] — keep to 6 slices or it stops reading */
    donut: function (sel, data, o) {
      o = o || {}; var el = host(sel); if (!el) return;
      var size = o.height || 220, r = size / 2, ir = r * (o.inner || 0.62);
      var total = data.reduce(function (a, d) { return a + d.value; }, 0) || 1;
      var svg = svgEl("svg", { viewBox: "0 0 " + size + " " + size, width: "100%", height: size, role: "img", class: "ak-chart" });
      titled(svg, o.title || "Donut chart");
      var g = svgEl("g", { transform: "translate(" + r + "," + r + ")" }); svg.appendChild(g);
      var a0 = -Math.PI / 2;
      data.forEach(function (d, i) {
        var a1 = a0 + d.value / total * Math.PI * 2, big = (a1 - a0) > Math.PI ? 1 : 0;
        var p = ["M", r * Math.cos(a0), r * Math.sin(a0), "A", r, r, 0, big, 1, r * Math.cos(a1), r * Math.sin(a1),
                 "L", ir * Math.cos(a1), ir * Math.sin(a1), "A", ir, ir, 0, big, 0, ir * Math.cos(a0), ir * Math.sin(a0), "Z"].join(" ");
        var path = svgEl("path", { d: p, fill: d.color || ak.palette[i % 6] });
        titled(path, d.label + ": " + ak.fmt.num(d.value, 1) + " (" + ak.fmt.num(d.value / total * 100, 1) + "%)");
        g.appendChild(path); a0 = a1;
      });
      if (o.centre) {
        var c = svgEl("text", { "text-anchor": "middle", y: 4, class: "ak-nc-centre",
          style: "font-size:20px;font-weight:650;fill:var(--ak-ink)" });
        c.textContent = o.centre; g.appendChild(c);
      }
      el.textContent = ""; el.appendChild(svg); return svg;
    },
    /** inline trend for a table cell */
    spark: function (sel, values, o) {
      o = o || {}; var el = host(sel); if (!el) return;
      var w = o.width || 64, h = o.height || 16;
      var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
      var y = lin(lo, hi, h - 2, 2), x = lin(0, values.length - 1, 0, w);
      var svg = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, class: "ak-spark", role: "img" });
      titled(svg, o.title || "Trend");
      svg.appendChild(svgEl("path", { d: values.map(function (v, i) { return (i ? "L" : "M") + x(i) + "," + y(v); }).join(" "),
        fill: "none", stroke: o.color || "var(--ak-c1)", "stroke-width": 1.5 }));
      el.textContent = ""; el.appendChild(svg); return svg;
    }
  };

  /** Legend for any chart. A donut or multi-series chart is unreadable
      without one, and colour must never be the only signal. */
  ak.legend = function (sel, items) {
    var el = host(sel); if (!el) return;
    el.className = "ak-legend";
    el.innerHTML = items.map(function (it, i) {
      var swatch = '<i style="background:' + (it.color || ak.palette[i % 6]) + '"></i>';
      var value = it.value != null ? ' <span class="ak-soft">' + it.value + "</span>" : "";
      return "<span>" + swatch + it.label + value + "</span>";
    }).join("");
    return el;
  };

  /** Build the accessible data twin a chart cannot provide on its own. */
  ak.dataTable = function (sel, headers, rows, caption) {
    var el = host(sel); if (!el) return;
    var h = "<caption>" + (caption || "") + "</caption><thead><tr>" +
      headers.map(function (x) { return "<th>" + x + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody>";
    el.innerHTML = "<table>" + h + "</table>";
    el.classList.add("ak-vh");
  };

  /* ─── kanban: native HTML5 drag. Desktop only — touch is out of scope ─── */
  ak.kanban = function (rootEl, opts) {
    opts = opts || {};
    var el = host(rootEl); if (!el) return;
    var dragged = null;
    el.addEventListener("dragstart", function (e) {
      var c = e.target.closest(".ak-kcard"); if (!c) return;
      dragged = c; c.classList.add("ak-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", c.dataset.id || "");
    });
    el.addEventListener("dragend", function () {
      if (dragged) dragged.classList.remove("ak-dragging");
      dragged = null;
      el.querySelectorAll(".ak-cards.ak-over").forEach(function (z) { z.classList.remove("ak-over"); });
      recount();
    });
    // dragover MUST preventDefault or the drop never fires. This is the single
    // most common mistake with the native API, which is why it lives here once.
    el.addEventListener("dragover", function (e) {
      var z = e.target.closest(".ak-cards"); if (!z || !dragged) return;
      e.preventDefault(); e.dataTransfer.dropEffect = "move"; z.classList.add("ak-over");
    });
    el.addEventListener("dragleave", function (e) {
      var z = e.target.closest(".ak-cards");
      if (z && !z.contains(e.relatedTarget)) z.classList.remove("ak-over");
    });
    el.addEventListener("drop", function (e) {
      var z = e.target.closest(".ak-cards"); if (!z || !dragged) return;
      e.preventDefault(); z.classList.remove("ak-over");
      var after = e.target.closest(".ak-kcard");
      if (after && after !== dragged) {
        var mid = after.getBoundingClientRect().top + after.offsetHeight / 2;
        z.insertBefore(dragged, mid > e.clientY ? after : after.nextSibling);
      } else z.appendChild(dragged);
      markDirty(); recount();
      if (opts.onChange) opts.onChange(ak.kanbanState(el));
    });
    function recount() {
      el.querySelectorAll(".ak-col").forEach(function (c) {
        var n = c.querySelector(".ak-n");
        if (n) n.textContent = c.querySelectorAll(".ak-kcard").length;
      });
    }
    recount();
    return { state: function () { return ak.kanbanState(el); } };
  };
  ak.kanbanState = function (rootEl) {
    var out = {};
    host(rootEl).querySelectorAll(".ak-cards").forEach(function (z) {
      out[z.dataset.col || ""] = Array.prototype.map.call(z.querySelectorAll(".ak-kcard"), function (c) {
        return c.dataset.id || c.textContent.trim();
      });
    });
    return out;
  };

/* ── deck ────────────────────────────────────────────────────────────────
     Scroll-snap slides + presenter window. Speaker notes live in
     <aside class="ak-notes"> inside each slide: authored next to the content,
     never rendered on the projected screen, strippable at build time with
     --strip-notes.

     The presenter window is written through the window handle directly rather
     than via BroadcastChannel or localStorage, because both are unreliable at
     file:// — all local pages share one storage area and messaging is patchy.
     A direct handle always works.                                          */
  ak.deck = function (sel, opts) {
    opts = opts || {};
    var el = host(sel); if (!el) return;
    var slides = Array.prototype.slice.call(el.querySelectorAll(".ak-slide"));
    if (!slides.length) return;

    var budget = opts.minutes || parseInt(el.dataset.minutes || "0", 10) || 0;
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- chrome ---- */
    var hud = document.createElement("div");
    hud.className = "ak-deck-hud"; hud.setAttribute("data-ak-noprint", "");
    hud.innerHTML =
      '<span class="ak-deck-pos"><b>1</b> / ' + slides.length + "</span>" +
      '<span class="ak-deck-nav">' +
      btn("prev", "Back  (←)", "M15 5 L8 12 L15 19") +
      btn("next", "Next  (→ or space)", "M9 5 L16 12 L9 19") +
      '<span class="ak-deck-sep"></span>' +
      btn("grid", "Overview  (O)", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", true) +
      btn("notes", "Presenter window — drag it to your own screen  (N)",
          "M3 4h18v16H3zM7 9.5h10M7 13.5h7", true) +
      btn("full", "Fullscreen  (F)", "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5") +
      btn("print", "Print / PDF, notes excluded  (P)", "M12 3v11M8 10.5 12 14.5 16 10.5M4 17v3h16v-3") +
      "</span>";
    function btn(id, tip, d, toggle) {
      return '<button type="button" data-d="' + id + '" data-tip="' + tip + '"' +
        (toggle ? ' aria-pressed="false"' : "") + ' aria-label="' + tip.split("  (")[0] + '">' +
        '<svg viewBox="0 0 24 24"><path d="' + d + '"/></svg></button>';
    }
    document.body.appendChild(hud);

    var bar = document.createElement("div");
    bar.className = "ak-deck-bar"; bar.setAttribute("data-ak-noprint", "");
    document.body.appendChild(bar);

    var grid = document.createElement("div");
    grid.className = "ak-deck-grid"; grid.setAttribute("data-ak-noprint", "");
    grid.innerHTML = slides.map(function (s, i) {
      var h = s.querySelector("h2");
      return '<button type="button" data-i="' + i + '"><span class="ak-n">' + (i + 1) + "</span>" +
        (h ? h.textContent : "Slide " + (i + 1)) + "</button>";
    }).join("");
    document.body.appendChild(grid);

    var help = document.createElement("div");
    help.className = "ak-deck-help"; help.setAttribute("data-ak-noprint", "");
    help.innerHTML = "<div><h3>Keyboard</h3><dl>" +
      "<dt>→ space</dt><dd>next slide</dd><dt>←</dt><dd>back</dd>" +
      "<dt>Home / End</dt><dd>first / last</dd><dt>O</dt><dd>overview</dd>" +
      "<dt>N</dt><dd>presenter window</dd><dt>F</dt><dd>fullscreen</dd>" +
      "<dt>P</dt><dd>print / PDF</dd><dt>Esc</dt><dd>close panels</dd>" +
      "<dt>?</dt><dd>this list</dd></dl></div>";
    document.body.appendChild(help);

    /* ---- navigation ----
       `si` is authoritative state, not something derived from scrollTop on
       demand. Reading the scroll position mid-animation reports the slide you
       are leaving, and smooth scrolling does not run at all in a backgrounded
       window — so deriving state from scroll is wrong in both directions. */
    var si = 0, programmatic = false, pTimer = null;
    function nearest() {
      var top = el.scrollTop, best = 0;
      slides.forEach(function (s, i) { if (s.offsetTop - top <= el.clientHeight / 2) best = i; });
      return best;
    }
    function paint() {
      hud.querySelector(".ak-deck-pos b").textContent = si + 1;
      bar.style.width = ((si + 1) / slides.length * 100) + "%";
      hud.querySelector('[data-d="prev"]').disabled = si === 0;
      hud.querySelector('[data-d="next"]').disabled = si === slides.length - 1;
      slides.forEach(function (s, i) { s.classList.toggle("ak-here", i === si); });
      try { history.replaceState(null, "", "#" + (si + 1)); } catch (e) {}
      syncPresenter();
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      si = i;
      programmatic = true;
      clearTimeout(pTimer);
      pTimer = setTimeout(function () { programmatic = false; }, 700);
      var top = slides[i].offsetTop;
      /* Smooth scrolling is throttled or dropped when the window is
         backgrounded — exactly the case when the presenter window has focus
         and the presenter clicks next. Assigning scrollTop always lands. */
      if (reduce || !document.hasFocus()) el.scrollTop = top;
      else el.scrollTo({ top: top, behavior: "smooth" });
      paint();
    }
    el.addEventListener("scroll", function () {
      if (programmatic) return;          // ignore the animation's own events
      var n = nearest();
      if (n !== si) { si = n; paint(); }
    });
    el.addEventListener("scroll", paint);

    /* ---- timer and pace ---- */
    var acc = 0, t0 = null, running = false;
    function elapsed() { return acc + (running && t0 ? (Date.now() - t0) / 1000 : 0); }
    function clockText() {
      var s = Math.floor(elapsed());
      return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    }
    function paceText() {
      if (!budget) return running ? "no budget set" : "not started";
      var expected = budget * 60 * ((si + 1) / slides.length);
      var diff = Math.round((elapsed() - expected) / 60);
      return budget + " min budget · " + (Math.abs(diff) < 1 ? "on pace"
        : diff > 0 ? diff + " min behind" : Math.abs(diff) + " min ahead");
    }
    function paceOver() {
      if (!budget) return false;
      return elapsed() - budget * 60 * ((si + 1) / slides.length) > 60;
    }
    function clock(action) {
      if (action === "toggle") {
        if (running) { acc = elapsed(); running = false; t0 = null; }
        else { t0 = Date.now(); running = true; }
      } else if (action === "reset") { acc = 0; t0 = running ? Date.now() : null; }
      syncPresenter();
    }
    setInterval(function () { if (pw && !pw.closed) syncPresenter(); }, 1000);

    /* ---- presenter window ---- */
    var PCSS = 'body{margin:0;padding:20px;background:#14141A;color:#E8E6E0;' +
      'font:15px/1.6 ui-sans-serif,system-ui,"Segoe UI",sans-serif}' +
      'h1{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8A867C;margin:0 0 6px;font-weight:600}' +
      '#t{font:700 44px/1 inherit;font-variant-numeric:tabular-nums;margin:0 0 2px}' +
      '#pc{color:#8A867C;font-size:13px;margin-bottom:14px}#pc.over{color:#E88}' +
      '#c{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:22px}' +
      '#c button{background:transparent;border:1px solid #35343C;color:#E8E6E0;border-radius:3px;' +
      'padding:7px 13px;font:inherit;font-size:13px;cursor:pointer}#c button:hover{border-color:#6AA9D8;color:#6AA9D8}' +
      '#p{color:#8A867C;font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}' +
      '#h{font-size:19px;font-weight:650;line-height:1.3;margin-bottom:16px}' +
      '#n{border-left:2px solid #35343C;padding-left:14px;margin-bottom:24px;min-height:70px}' +
      '#n ul{margin:0;padding-left:18px}#n li{margin-bottom:8px}#n p{margin:0 0 8px}' +
      '#n .none{color:#8A867C;font-style:italic}' +
      '#x{color:#8A867C;font-size:14px;border-top:1px solid #2A2932;padding-top:12px}#x b{color:#E8E6E0}';
    var PHTML = '<!doctype html><html><head><meta charset="utf-8"><title>Presenter</title>' +
      "<style>" + PCSS + "</style></head><body>" +
      '<div id="t">00:00</div><div id="pc"></div>' +
      '<div id="c"><button data-t="toggle">start / pause</button><button data-t="reset">reset</button>' +
      '<button data-t="prev">back</button><button data-t="next">next</button></div>' +
      '<div id="p"></div><div id="h"></div>' +
      "<h1>notes</h1><div id=\"n\"></div><div id=\"x\"></div></body></html>";

    var pw = null, pe = null;
    function notesHTML(slide) {
      var n = slide.querySelector(".ak-notes");
      if (!n || !n.innerHTML.trim()) return '<span class="none">No notes for this slide.</span>';
      return n.innerHTML;
    }
    function presenterOpen() {
      try { pw = window.open("", "ak-presenter", "width=560,height=780"); } catch (e) { pw = null; }
      if (!pw) {                       // popup blocked — fall back to an inline panel
        document.body.classList.add("ak-deck-notes-on");
        ak.toast("Popup blocked — notes shown inline. Allow popups for a second window.");
        return false;
      }
      pw.document.open(); pw.document.write(PHTML); pw.document.close();
      var g = function (id) { return pw.document.getElementById(id); };
      pe = { t: g("t"), pc: g("pc"), p: g("p"), h: g("h"), n: g("n"), x: g("x") };
      g("c").addEventListener("click", function (e) {
        var t = e.target.dataset.t; if (!t) return;
        if (t === "next") go(si + 1); else if (t === "prev") go(si - 1); else clock(t);
      });
      pw.document.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(si + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); go(si - 1); }
      });
      pw.addEventListener("pagehide", function () { pw = null; pe = null; markNotesBtn(); });
      syncPresenter(); markNotesBtn();
      return true;
    }
    function markNotesBtn() {
      hud.querySelector('[data-d="notes"]').setAttribute("aria-pressed", (pw && !pw.closed) ? "true" : "false");
    }
    function presenterToggle() {
      if (pw && !pw.closed) { pw.close(); pw = null; pe = null; document.body.classList.remove("ak-deck-notes-on"); }
      else presenterOpen();
      markNotesBtn();
    }
    function syncPresenter() {
      if (!pw || pw.closed || !pe) return;
      var cur = slides[si], nxt = slides[si + 1];
      var h = cur.querySelector("h2");
      pe.t.textContent = clockText();
      pe.pc.textContent = paceText();
      pe.pc.className = paceOver() ? "over" : "";
      pe.p.textContent = "slide " + (si + 1) + " / " + slides.length;
      pe.h.textContent = h ? h.textContent : "";
      pe.n.innerHTML = notesHTML(cur);
      var nh = nxt && nxt.querySelector("h2");
      pe.x.innerHTML = nxt ? "next up: <b>" + (nh ? nh.textContent : "…") + "</b>" : "last slide";
    }
    addEventListener("pagehide", function () { if (pw && !pw.closed) pw.close(); });

    /* ---- wiring ---- */
    hud.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-d]"); if (!b) return;
      var d = b.dataset.d;
      if (d === "next") go(si + 1);
      else if (d === "prev") go(si - 1);
      else if (d === "grid") toggleGrid();
      else if (d === "notes") presenterToggle();
      else if (d === "print") window.print();
      else if (d === "full") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
    });
    function toggleGrid() {
      var on = grid.classList.toggle("ak-on");
      hud.querySelector('[data-d="grid"]').setAttribute("aria-pressed", String(on));
    }
    grid.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (b) { go(+b.dataset.i); toggleGrid(); }
      else if (e.target === grid) toggleGrid();
    });
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      var k = e.key;
      if (k === "Escape") { grid.classList.remove("ak-on"); help.classList.remove("ak-on"); markGrid(); }
      else if (k === "ArrowRight" || k === " " || k === "PageDown") { e.preventDefault(); go(si + 1); }
      else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); go(si - 1); }
      else if (k === "Home") go(0);
      else if (k === "End") go(slides.length - 1);
      else if (k === "o" || k === "O") toggleGrid();
      else if (k === "n" || k === "N") presenterToggle();
      else if (k === "p" || k === "P") window.print();
      else if (k === "f" || k === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      } else if (k === "?") help.classList.toggle("ak-on");
    });
    function markGrid() { hud.querySelector('[data-d="grid"]').setAttribute("aria-pressed", "false"); }
    help.addEventListener("click", function () { help.classList.remove("ak-on"); });

    var start = parseInt((location.hash || "").slice(1), 10);
    if (start >= 1 && start <= slides.length) go(start - 1);
    paint();

    return { go: go, count: slides.length, presenter: presenterToggle,
             current: function () { return si; } };
  };

  /* ─── keyboard navigation for row lists ─────────────────────────────── */
  ak.keyboardNav = function (containerSel, opts) {
    opts = opts || {};
    var el = host(containerSel); if (!el) return;
    var sel = opts.itemSelector || "tbody tr[tabindex]";
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        var f = document.querySelector(opts.filterSelector || ".ak-input");
        if (f) { e.preventDefault(); f.focus(); }
      }
      var items = Array.prototype.slice.call(el.querySelectorAll(sel));
      var i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" && i > -1) { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      if (e.key === "ArrowUp" && i > -1) { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
      if (e.key === "Escape" && document.activeElement.blur) document.activeElement.blur();
    });
  };

  /* ─── deep link: put view state in the hash so a view is shareable ───── */
  ak.deepLink = {
    read: function () {
      try { return JSON.parse(decodeURIComponent(location.hash.slice(1)) || "{}"); }
      catch (e) { return {}; }
    },
    write: function (obj) {
      try { history.replaceState(null, "", "#" + encodeURIComponent(JSON.stringify(obj))); } catch (e) {}
    }
  };

  /* ─── re-render charts on resize; they read clientWidth at draw time ─── */
  var rt = null;
  ak.onResize = function (fn) {
    root.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(fn, 120); });
    return ak;
  };

  ak.version = "0.1.0";
  root.ak = ak;
})(window);
