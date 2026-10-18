/* nw-duct-weight.js — sheet-metal weight per foot for duct sizes (2026-10-18)
   Drawings and the takeoff give FEET; shops quote POUNDS. This module turns a duct size into lb/ft so every
   estimate shows both numbers and the shop quote can be checked against the estimate.

   window.NWDuct = {
     parse(text)                 → { kind:'rect'|'round'|'oval', w, h } (inches) or null  — from a catalog name / layer name / size label
     gauge(size, pressure)       → 26 | 24 | 22 | 20 | 18 | 16  (SMACNA-style schedule by longest side / diameter)
     weight(size, opts)          → { kind, gauge, perim_in, lb_ft_bare, lb_ft }   opts: { pressure:'low'|'medium', fitting_pct }
     weightOf(text, opts)        → weight() of parse(text), or null
     metalCost(lb, kind)         → $ (shop rate per lb by kind)
     RATES, FITTING_PCT, SHEET_LB_SQFT, GAUGE_LOW, GAUGE_MEDIUM
   }
   Russ 2026-10-18: fittings allowance 25 %; shop rates rectangular $4/lb, spiral round $5/lb, spiral flat oval $7/lb;
   mains = medium pressure (4" w.g.) gauge, branches / returns = low pressure (2" w.g.). */
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

  function parse(text) {
    var s = String(text || '').replace(/[×Xx]/g, 'x').replace(/[”″]/g, '"');
    var m;
    if (/rectangular|rect\b|\bR6\b|\bR8\b/i.test(s) && (m = /(\d{1,3})\s*x\s*(\d{1,3})/.exec(s))) return { kind: 'rect', w: +m[1], h: +m[2] };
    if (/round\/oval|oval|spiral|round/i.test(s) && (m = /(\d{1,3})\s*x\s*(\d{1,3})/.exec(s))) { var a = +m[1], b = +m[2]; return a === b ? { kind: 'round', w: a, h: a } : { kind: 'oval', w: Math.max(a, b), h: Math.min(a, b) }; }
    if ((m = /(\d{1,3})\s*(?:"|in)?\s*(?:Ø|ø|⌀|dia\b|rd\b|round)/i.exec(s))) return { kind: 'round', w: +m[1], h: +m[1] };
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
    var g = gauge(size, opts.pressure), per = perimeter(size), bare = per / 12 * SHEET_LB_SQFT[g];
    var pct = opts.fitting_pct != null ? Number(opts.fitting_pct) : FITTING_PCT;
    var lb = bare * (1 + pct / 100);
    return { kind: size.kind, w: size.w, h: size.h, gauge: g, perim_in: Math.round(per * 10) / 10, lb_ft_bare: Math.round(bare * 100) / 100, lb_ft: Math.round(lb * 100) / 100, fitting_pct: pct, pressure: opts.pressure === 'medium' ? 'medium' : 'low' };
  }
  function weightOf(text, opts) { var s = parse(text); return s ? weight(s, opts) : null; }
  function metalCost(lb, kind) { return Number(lb || 0) * (RATES[kind] || RATES.rect); }
  window.NWDuct = { parse: parse, gauge: gauge, perimeter: perimeter, weight: weight, weightOf: weightOf, metalCost: metalCost,
    RATES: RATES, FITTING_PCT: FITTING_PCT, SHEET_LB_SQFT: SHEET_LB_SQFT, GAUGE_LOW: GAUGE_LOW, GAUGE_MEDIUM: GAUGE_MEDIUM };
})();
