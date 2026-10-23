/* nw-duct-weight.js — sheet-metal weight per foot for duct sizes (2026-10-18)
   Drawings and the takeoff give FEET; shops quote POUNDS. This module turns a duct size into lb/ft so every
   estimate shows both numbers and the shop quote can be checked against the estimate.

   window.NWDuct = {
     parse(text)                 → { kind:'rect'|'round'|'oval', w, h } (inches) or null  — from a catalog name / layer name / size label
     gauge(size, pressure)       → 26 | 24 | 22 | 20 | 18 | 16  (SMACNA-style schedule by longest side / diameter)
     weight(size, opts)          → { kind, gauge, perim_in, metal_perim_in, liner_in, lb_ft_bare, lb_ft }   opts: { pressure:'low'|'medium', fitting_pct, liner_in }
     weightOf(text, opts)        → weight() of parse(text), or null
     metalCost(lb, kind)         → $ (shop rate per lb by kind)
     RATES, FITTING_PCT, SHEET_LB_SQFT, GAUGE_LOW, GAUGE_MEDIUM
   }
   Russ 2026-10-18: fittings allowance 25 %; shop rates rectangular $4/lb, spiral round $5/lb, spiral flat oval $7/lb;
   mains = medium pressure (4" w.g.) gauge, branches / returns = low pressure (2" w.g.).
   Russ 2026-10-22: lined duct (ACL) is sized to the CLEAR inside dimension — the sheet metal is bigger by the liner
   thickness on every side (1" ACL: 24x12 clear = 26x14 metal), so lb and gauge use the metal size; perim_in stays the
   clear perimeter (liner area), metal_perim_in is the outside. parse() returns liner_in (ACL/lined/liner, default 1"). */
(function () {
  'use strict';
  var SHEET_LB_SQFT = { 28: 0.781, 26: 0.906, 24: 1.156, 22: 1.406, 20: 1.656, 18: 2.156, 16: 2.656 };   // galvanized G90
  // SMACNA 2" w.g. positive, unreinforced-friendly shop practice: gauge by the longest side (rect) / diameter (round, oval major)
  var GAUGE_LOW = [[12, 26], [30, 24], [54, 22], [84, 20], [1e9, 18]];
  // 4" w.g. (medium pressure mains): one gauge heavier
  var GAUGE_MEDIUM = [[12, 24], [30, 22], [54, 20], [84, 18], [1e9, 16]];
  var GAUGE_ROUND_LOW = [[14, 26], [26, 24], [36, 22], [50, 20], [60, 18], [1e9, 16]];
  var GAUGE_ROUND_MEDIUM = [[14, 24], [26, 22], [36, 20], [50, 18], [1e9, 16]];
  var RATES = { rect: 4, round: 5, oval: 7 };    // $ per lb, shop material + fabrication (no insulation, no install)
  var FITTING_PCT = 25;

  function linerOf(s) {
    if (!/\bACL\b|\bA\.?L\.?\b|lined|liner/i.test(s) || /unlined|no liner|without liner/i.test(s)) return 0;
    var m = /(\d(?:\.\d+)?|\d\s*-\s*\d\/\d|\d\/\d)\s*(?:"|in\.?|inch)?\s*(?:thick\s*)?(?:ACL|A\.?L\.?\b|acoustic|lined|liner)/i.exec(s);
    if (!m) return 1;
    var t = m[1].replace(/\s/g, ''), v;
    if (/-/.test(t)) { var a = t.split('-'), f = a[1].split('/'); v = +a[0] + f[0] / f[1]; }
    else if (/\//.test(t)) { var g2 = t.split('/'); v = g2[0] / g2[1]; }
    else v = +t;
    return v > 0 && v <= 3 ? v : 1;
  }
  function parse(text) {
    var r = parse0(text);
    if (r) r.liner_in = linerOf(String(text || '').replace(/[”″]/g, '"'));
    return r;
  }
  function parse0(text) {
    var s = String(text || '').replace(/[×Xx]/g, 'x').replace(/[”″]/g, '"');
    var m;
    if (/rectangular|rect\b|\bR6\b|\bR8\b/i.test(s) && (m = /(\d{1,3})\s*x\s*(\d{1,3})/.exec(s))) return { kind: 'rect', w: +m[1], h: +m[2] };
    if (/round\/oval|oval|spiral|round/i.test(s) && (m = /(\d{1,3})\s*x\s*(\d{1,3})/.exec(s))) { var a = +m[1], b = +m[2]; return a === b ? { kind: 'round', w: a, h: a } : { kind: 'oval', w: Math.max(a, b), h: Math.min(a, b) }; }
    if ((m = /(\d{1,3})\s*(?:"|in)?\s*(?:Ø|ø|⌀|dia\b|rd\b|round)/i.exec(s))) return { kind: 'round', w: +m[1], h: +m[1] };
    if (/spiral|snap-?lock|round pipe|flex duct/i.test(s) && (m = /(\d{1,3})\s*"/.exec(s))) return { kind: 'round', w: +m[1], h: +m[1] };   // 'Spiral galvanized duct 14" bare'
    if ((m = /(\d{1,3})\s*x\s*(\d{1,3})/.exec(s)) && /duct|galv|ACL|lined|wrap/i.test(s)) return { kind: 'rect', w: +m[1], h: +m[2] };
    if ((m = /^\s*(\d{1,3})\s*x\s*(\d{1,3})\s*$/.exec(s))) return { kind: 'rect', w: +m[1], h: +m[2] };
    return null;
  }
  function pick(table, v) { for (var i = 0; i < table.length; i++) if (v <= table[i][0]) return table[i][1]; return table[table.length - 1][1]; }
  function gauge(size, pressure) {
    var med = pressure === 'medium';
    if (size.kind === 'rect') return pick(med ? GAUGE_MEDIUM : GAUGE_LOW, Math.max(size.w, size.h));
    return pick(med ? GAUGE_ROUND_MEDIUM : GAUGE_ROUND_LOW, Math.max(size.w, size.h));
  }
  function perimeter(size) {
    if (size.kind === 'rect') return 2 * (size.w + size.h);
    if (size.kind === 'round') return Math.PI * size.w;
    return 2 * (size.w - size.h) + Math.PI * size.h;          // flat oval: two flats + the round ends
  }
  function weight(size, opts) {
    opts = opts || {};
    var t = opts.liner_in != null ? Number(opts.liner_in) || 0 : (Number(size.liner_in) || 0);
    var metal = { kind: size.kind, w: size.w + 2 * t, h: size.h + 2 * t };      // liner on every side → bigger sheet metal
    var g = gauge(metal, opts.pressure), per = perimeter(size), mper = perimeter(metal), bare = mper / 12 * SHEET_LB_SQFT[g];
    var pct = opts.fitting_pct != null ? Number(opts.fitting_pct) : FITTING_PCT;
    var lb = bare * (1 + pct / 100);
    return { kind: size.kind, w: size.w, h: size.h, gauge: g, perim_in: Math.round(per * 10) / 10, metal_perim_in: Math.round(mper * 10) / 10, liner_in: t, metal_w: metal.w, metal_h: metal.h,
      lb_ft_bare: Math.round(bare * 100) / 100, lb_ft: Math.round(lb * 100) / 100, fitting_pct: pct, pressure: opts.pressure === 'medium' ? 'medium' : 'low' };
  }
  function weightOf(text, opts) { var s = parse(text); return s ? weight(s, opts) : null; }
  function metalCost(lb, kind) { return Number(lb || 0) * (RATES[kind] || RATES.rect); }
  window.NWDuct = { parse: parse, linerOf: linerOf, gauge: gauge, perimeter: perimeter, weight: weight, weightOf: weightOf, metalCost: metalCost,
    RATES: RATES, FITTING_PCT: FITTING_PCT, SHEET_LB_SQFT: SHEET_LB_SQFT, GAUGE_LOW: GAUGE_LOW, GAUGE_MEDIUM: GAUGE_MEDIUM };
})();
