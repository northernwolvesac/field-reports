// nw-proposal.js — Procore-style proposal renderer + exports for the NW estimating module.
// window.NWProposal = { OFFICES, DEFAULT_EXCLUSIONS, defaultSettings, mergeSettings, compute,
//                       render, exportPdf, exportLetter, exportXlsx, rich }   (rich = formatted Scope / Exclusions: see 'Rich text' below)
//
// Consumed by bid-project.html (Proposal tab: preview + Export PDF / Excel) and estimating.html
// (Export proposal PDF → NWProposal.exportLetter, returns a Promise). All numbers come from est-totals.js
// (nwEstTotals / nwLineTotals): Subtotal → Pre-Tax markups → Taxes → Post-Tax markups → Estimate Total.
//
// Per-line paper math (proposal "Material Cost | Labor Cost and Overhead | Total Cost"):
//   matU = unit_material_cost × (1 + waste_pct) × (1 + markup_pct)          (= Procore Unit Sales)
//   labU = unit_labor_hours × labor_factor × laborRate × (1 + labor_markup_pct)
//   ohU  = (matU + labU) × (preTaxTotal / Subtotal)                           (0 when Subtotal is 0)
//   Total Cost = qty × (matU + labU + ohU)   → Σ over all non-optional lines = Subtotal + Pre-Tax
// With waste / markups = 0 and factor = 1 this is exactly the plan's formula.
//
// Load order: styles.css → procore-ui.css → supabase → supabase-config → auth → est-totals.js →
// procore-ui.js → (html2pdf 0.10.1, pdf-lib 1.17.1, jspdf 2.5.1, xlsx 0.18.5 as needed) → nw-proposal.js.
// No deps at load time; each export checks its library at call time (exportLetter lazy-loads jsPDF
// from cdnjs when the page only ships html2pdf.bundle, which does not expose window.jspdf).
(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────
  //  Company data (single source — replaces the hard-coded blocks that lived
  //  in bid-project.html and estimating.html)
  // ─────────────────────────────────────────────────────────────────────────
  var NYC = {
    name: 'Northern Wolves AC',
    addr1: '55 9th St, 55-A2',
    city: 'Brooklyn, NY',
    zip: '11215, US',
    phone: '(347) 463-9248'
  };
  function officeCopy(extra) {
    var o = {};
    Object.keys(NYC).forEach(function (k) { o[k] = NYC[k]; });
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  // Same address for every office until Russ supplies the per-office list.
  var OFFICES = {
    'NYC': officeCopy({ label: 'NYC' }),
    'Long Island': officeCopy({ label: 'Long Island' }),
    'NJ': officeCopy({ label: 'NJ' }),
    'Westchester': officeCopy({ label: 'Westchester' }),
    'Other': officeCopy({ label: 'Other' })
  };
  function officeFor(key) {
    if (key && OFFICES[key]) return OFFICES[key];
    var k = Object.keys(OFFICES).filter(function (o) {
      return key && String(o).toLowerCase() === String(key).toLowerCase();
    })[0];
    return k ? OFFICES[k] : OFFICES.NYC;
  }

  // Moved from estimating.html exportProposalPDF (Kastriot's standard exclusions).
  var DEFAULT_EXCLUSIONS = [
    'BACnet Integration, BMS, EMS and others special Control works.',
    'Overtime (OT work can be performed by demand for NWAC Overtime/Weekend special rates).',
    'Scaffolding with permits.',
    'Cutting and patching roof, structural walls, partitions, and floors',
    'Roof dunnage/steel/iron beams for outdoor equipment.',
    'Structural work for equipment supports',
    'Permits (DOB, DOT, Mechanical Permits, Equipment Use Permits)',
    'Permits and Inspection Fees',
    'Performance and Payment Bonds',
    'Gas Piping, Gas Meter.',
    'Manufacturer Guarantees and Warranties',
    'Warranty for existing equipment'
  ];

  // Page-2 text of the NWAC proposal template (quote 3766, 1810 Randall Ave)
  var R410A_NOTES = [
    'R-410A systems need to be installed by the end of 2026 to comply with NY DEC Variance.',
    'R-410A availability is subject to change. Inventory is not reserved until material is RELEASED.',
    'Pricing is only valid while R-410A units are in stock. Once stock is sold out, no replacements will be made available and pricing is subject to change corresponding to any new units'
  ];
  var TERMS_TEXT = 'Northern Wolves Inc provides one year warranty for the system it will install. In case of technical fault after one year all the repairing cost will be additional. The firm will not be responsible for the warranty claim if the system is externally damaged by any means. Firm only caters the internal design faults.';

  // Scope of Work lines built from the estimate: every equipment item with its quantity, then one standard line per trade present.
  // Order and wording follow the template; the estimator can edit the result (estimates.scope_summary).
  function buildScope(est, lines) {
    est = est || {};
    var sorted = (lines || []).filter(function (l) { return l && !l.is_optional; })
      .sort(function (a, b) { return num(a.sort_order) - num(b.sort_order); });
    var equip = [], byName = {}, has = {};
    sorted.forEach(function (l) {
      var d = String(l.description || '').trim(), cat = l.category || '';
      var qty = num(l.quantity) * groupMultiplier(est, l.group_name);
      if (!(qty > 0)) return;
      if (cat === 'equipment' && d) {
        d = d.replace(/\s*[—-]\s*quote$/i, '');   // lump-sum vendor quote lines ("ADE — quote") read as the group name
        var k = d.toLowerCase();
        if (!byName[k]) { byName[k] = { name: d, qty: 0, unit: uom(l.unit) }; equip.push(byName[k]); }
        byName[k].qty += qty;
      }
      if (cat === 'ductwork') has.duct = true;
      if (cat === 'pipework') has.pipe = true;
      if (cat === 'air_outlets' || /diffuser|grille|register|damper/i.test(d)) has.outlets = true;
      if (/control|thermostat/i.test(d) && !/bms|bacnet/i.test(d)) has.controls = true;
      if (/crane|boom ?truck|rigging/i.test(d)) has.crane = true;
      if (/shop drawing|submittal/i.test(d)) has.submittals = true;
      if (/balanc|testing/i.test(d)) has.tab = true;
      if (/start.?up|commission/i.test(d)) has.startup = true;
    });
    var out = [];
    equip.forEach(function (e) {
      var q = Math.round(e.qty * 100) / 100;
      out.push('Furnish and install ' + e.name + ((e.unit && e.unit !== 'ea') ? '' : ' (' + q + ')') + '.');
    });
    if (has.duct) out.push('Furnish and install All Ductwork with accessories and insulation.');
    if (has.pipe) out.push('Furnish and install All Pipework with accessories and insulation.');
    if (has.outlets) out.push('Furnish and install All air outlets, diffusers, linear diffusers and dampers.');
    if (has.controls) out.push('Furnish and install standalone controls');
    if (has.crane) out.push('Provide Crane rigging');
    if (has.submittals) out.push('Provide all Submittals and Shop Drawings.');
    if (has.tab) out.push('Providing Testing and 3rd Party Air Balancing with reports.');
    if (has.startup) out.push('Provide Start Up.');
    out.push('Provide 1 year Labor Warranty.');
    return out;
  }
  function hasR410a(est, lines) {
    var re = /410\s*-?\s*a/i;
    if (re.test([est && est.name, est && est.scope_summary, est && est.notes, est && est.project_description].join(' '))) return true;
    return (lines || []).some(function (l) { return l && re.test((l.description || '') + ' ' + (l.notes || '')); });
  }

  var TAXABLE_CATS = ['equipment', 'ductwork', 'pipework'];
  var CATEGORIES = [
    ['disconnects', 'Disconnects'], ['equipment', 'Equipment'], ['ductwork', 'Ductwork'],
    ['pipework', 'Pipework'], ['equipment_install', 'Equipment Install'],
    ['air_outlets', 'Air Outlets Install'], ['services', 'Services']
  ];

  // ─────────────────────────────────────────────────────────────────────────
  //  Settings (stored in estimates.settings.proposal)
  // ─────────────────────────────────────────────────────────────────────────
  function defaultSettings() {
    return {
      groupsOnly: false,
      lumpSum: false,
      quantity: true,
      assemblyItems: false,
      itemTotalCost: true,
      combinedUnitCost: false,
      groupSubtotals: false,
      manufacturer: false,
      catalogNumber: false,
      description: false,
      groupBy: 'groups',                      // groups | assemblies | categories
      summary: { laborMaterials: true, taxes: true, overhead: false, profit: false, acceptedBy: true, date: true },
      rounding: { twoDecimals: true, roundTotal: false },
      sqft: { costItems: false, groupSubtotals: false, summary: false, estimateTotal: false },
      layout: 'letter',                       // letter (NWAC template) | detailed (per-group tables)
      drawingsDate: '',                       // 'Mechanical drawings dated:' line of the letter
      r410a: 'auto',                          // auto | on | off — page-2 R-410A system notes
      editMode: false,
      htmlOverride: false,
      coverFileId: null,
      appendixFileId: null,
      contactName: '',
      contactEmail: ''
    };
  }

  // Deep-merge a saved (possibly partial) settings object over the defaults.
  function mergeSettings(saved) {
    var d = defaultSettings();
    if (!saved || typeof saved !== 'object') return d;
    Object.keys(saved).forEach(function (k) {
      var v = saved[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && d[k] && typeof d[k] === 'object') {
        Object.keys(v).forEach(function (kk) { d[k][kk] = v[kk]; });
      } else if (v !== undefined) {
        d[k] = v;
      }
    });
    return d;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Formatting helpers (use PC when present so the numbers match the app)
  // ─────────────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nl2br(s) { return esc(s).replace(/\r?\n/g, '<br>'); }
  function num(v, def) {
    var n = Number(v);
    return (v === null || v === undefined || v === '' || isNaN(n)) ? (def || 0) : n;
  }
  function money(n, decimals) {
    var v = Number(n || 0);
    if (!isFinite(v)) v = 0;
    var d = decimals == null ? 2 : decimals;
    var sign = v < 0 ? '-' : '';
    return sign + '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function uom(u) {
    if (window.PC && typeof PC.uom === 'function') return PC.uom(u);
    var s = String(u || '').trim().toLowerCase();
    if (!s) return '';
    if (s === 'lf' || s === 'ft' || s === 'feet' || s === 'foot') return 'ft';
    if (s === 'sq ft' || s === 'sqft' || s === 'sf' || s === 'sq. ft.') return 'sq ft';
    if (s === 'hours' || s === 'hr' || s === 'hrs' || s === 'hour') return 'hrs';
    if (s === 'each' || s === 'ea') return 'ea';
    return s;
  }
  function qtyFmt(n, unit) {
    var u = uom(unit);
    var v = Number(n || 0);
    var dec = (u === 'ft' || u === 'sq ft' || u === 'lf' || u === 'sf' || u === 'hrs') ? 2 : 0;
    if (dec === 0 && Math.abs(v - Math.round(v)) > 0.005) dec = 2;   // fractional "ea" keeps its decimals
    return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (u ? ' ' + u : '');
  }
  function pctFmt(p) { return (Number(p || 0) * 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' %'; }
  function todayShort() {
    var d = new Date();
    var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return p2(d.getMonth() + 1) + '/' + p2(d.getDate()) + '/' + d.getFullYear();   // MM/DD/YYYY like Procore
  }
  function toast(msg, type) {
    if (window.PC && typeof PC.toast === 'function') PC.toast(msg, type || 'info');
    else if (typeof window.showToast === 'function') window.showToast(msg, type);
    else if (type === 'error') console.error(msg);
    else console.log(msg);
  }
  function safeFile(s) { return String(s || 'estimate').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().substring(0, 80); }
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Totals bridge — nwEstTotals with a fallback to the legacy keys so the
  //  paper still renders before the Procore-shaped block ships in est-totals.js
  // ─────────────────────────────────────────────────────────────────────────
  function settingsOf(est) { return (est && est.settings && typeof est.settings === 'object') ? est.settings : {}; }

  function totalsOf(est, lines) {
    if (typeof window.nwEstTotals !== 'function') {
      throw new Error('est-totals.js (nwEstTotals) must be loaded before nw-proposal.js is used');
    }
    var t = window.nwEstTotals(lines || [], est || {}) || {};
    var rates = t.rates || (typeof window.nwEstRates === 'function' ? window.nwEstRates(est) : { labor: 60, overhead: 0.2, misc: 0.02, tax: 0.08875 });
    var laborRate = num(t.laborRate, rates.labor);
    var subtotal = t.summary ? num(t.summary.subtotal) : num(t.baseSubtotal);
    var preTaxTotal = (t.preTaxTotal != null) ? num(t.preTaxTotal) : (num(t.overhead) + num(t.miscellaneous));
    var laborSales = t.summary ? num(t.summary.labor.sales) : num(t.labor);
    var laborHours = t.summary ? num(t.summary.labor.hours) : num(t.laborHours);
    var taxes = t.taxes || {
      labor: { pct: num(settingsOf(est).labor_tax_rate), amount: 0 },
      materials: { pct: rates.tax, amount: num(t.tax) },
      total: num(t.tax)
    };
    var taxTotal = num(taxes.total);
    var postTaxTotal = num(t.postTaxTotal);
    var total = (t.total != null) ? num(t.total) : num(t.bidPrice);
    var sqft = num(est && est.square_footage);
    return {
      raw: t,
      rates: rates,
      laborRate: laborRate,
      laborHours: laborHours,
      subtotal: subtotal,
      preTax: t.preTax || [
        { id: 'overhead', name: 'Overhead' + (est && est.is_ofci ? ' (OFCI)' : ''), type: 'basic', pct: rates.overhead, amount: num(t.overhead) },
        { id: 'misc', name: 'Miscellaneous', type: 'basic', pct: rates.misc, amount: num(t.miscellaneous) }
      ],
      preTaxTotal: preTaxTotal,
      laborSales: laborSales,
      materialsSales: subtotal - laborSales,   // Procore: everything that is not labor (parts, subcontract, services)
      taxes: taxes,
      taxTotal: taxTotal,
      postTax: t.postTax || [],
      postTaxTotal: postTaxTotal,
      total: total,
      sqft: sqft,
      perSqFt: (t.perSqFt != null) ? t.perSqFt : (sqft > 0 ? total / sqft : null),
      ohRatio: subtotal > 0 ? preTaxTotal / subtotal : 0
    };
  }

  // Group multiplier — delegates to nwGroupMultiplier (est-totals.js) so the paper resolves the
  // same key / same manual_groups shapes ([{name, multiplier}] or {name: {multiplier}} / {name: n})
  // as the Estimating grid. Fallback mirrors that contract when est-totals.js is older.
  function groupMultiplier(est, groupName) {
    if (typeof window.nwGroupMultiplier === 'function') return window.nwGroupMultiplier(est, groupName);
    if (!groupName) return 1;
    var mg = settingsOf(est).manual_groups, m = null;
    if (Array.isArray(mg)) {
      for (var i = 0; i < mg.length; i++) {
        var g = mg[i];
        if (g && (g.name === groupName || g.label === groupName)) { m = g.multiplier; break; }
      }
    } else if (mg && typeof mg === 'object' && mg[groupName] != null) {
      m = (typeof mg[groupName] === 'object') ? mg[groupName].multiplier : mg[groupName];
    }
    m = (m === null || m === undefined || m === '') ? 1 : num(m);
    return m > 0 ? m : 1;
  }

  function isTaxable(line) {
    if (line.is_taxable != null) return !!line.is_taxable;
    return TAXABLE_CATS.indexOf(line.category) >= 0 && !line.is_wet_tap;
  }

  // Per-line paper numbers.
  function lineCalc(line, est, T, mult) {
    var es = settingsOf(est).es_settings || {};
    var rate = (es.individual_labor_rates && num(line.labor_rate)) ? num(line.labor_rate) : T.laborRate;
    var qty = num(line.quantity) * (mult || 1);
    var waste = num(line.waste_pct);
    var markup = num(line.markup_pct);
    var lMarkup = num(line.labor_markup_pct);
    var factor = num(line.labor_factor, 1) || 1;
    var matU = num(line.unit_material_cost) * (1 + waste) * (1 + markup);
    var labU = num(line.unit_labor_hours) * factor * rate * (1 + lMarkup);
    // Wet-tap (subcontract, cost type S) and services (cost type O) lines are not labor in
    // nwEstTotals (their whole amount lands in wetTap / services, not laborSales), so on the
    // paper their labor part is folded into the Material column. That keeps the per-line
    // "Labor Cost and Overhead" column summing to the Summary's Labor figure.
    var isLaborLine = !(line.is_wet_tap || line.category === 'services');
    if (!isLaborLine) { matU += labU; labU = 0; }
    var ohU = (matU + labU) * T.ohRatio;
    var unitTotal = matU + labU + ohU;
    var profit = 0;
    if (typeof window.nwLineTotals === 'function') {
      var lt = window.nwLineTotals(line, est, { groupMultiplier: mult || 1 }) || {};
      profit = num(lt.profit) + num(lt.laborProfit);
    }
    return {
      line: line,
      qty: qty,
      unit: uom(line.unit),
      matU: matU,
      labU: labU,
      ohU: ohU,
      labOhU: labU + ohU,
      unitTotal: unitTotal,
      material: qty * matU,
      laborOh: qty * (labU + ohU),
      total: qty * unitTotal,
      hours: isLaborLine ? qty * num(line.unit_labor_hours) * factor : 0,   // ML lines only, like nwEstTotals.laborHours
      profit: profit,
      taxable: isTaxable(line)
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Grouping
  // ─────────────────────────────────────────────────────────────────────────
  function groupKeyFn(settings, est, lines, ctx) {
    var byId = {};
    (lines || []).forEach(function (l) { if (l && l.id != null) byId[l.id] = l; });
    var cat = (ctx && ctx.catalogById) || {};
    if (settings.groupBy === 'categories') {
      var labels = {};
      CATEGORIES.forEach(function (c) { labels[c[0]] = c[1]; });
      return function (l) { return labels[l.category] || 'Other'; };
    }
    if (settings.groupBy === 'assemblies') {
      return function (l) {
        if (l.parent_id != null && byId[l.parent_id]) return byId[l.parent_id].description || 'Assembly';
        if (l.catalog_item_id != null && cat[l.catalog_item_id] && cat[l.catalog_item_id].item_type === 'assembly') {
          return cat[l.catalog_item_id].name || 'Assembly';
        }
        return l.group_name || 'Default Group';
      };
    }
    return function (l) { return l.group_name || 'Default Group'; };
  }

  function groupOrder(settings, est) {
    if (settings.groupBy === 'categories') return CATEGORIES.map(function (c) { return c[1]; });
    var mg = settingsOf(est).manual_groups;
    if (Array.isArray(mg)) return mg.map(function (g) { return typeof g === 'string' ? g : (g && (g.name || g.label)); }).filter(Boolean);
    return [];
  }

  // Build the paper model (groups, per-line rows, totals). Reused by render() and exportXlsx().
  function compute(est, lines, settings, ctx) {
    est = est || {};
    lines = (lines || []).slice().sort(function (a, b) { return num(a.sort_order) - num(b.sort_order); });
    settings = mergeSettings(settings);
    ctx = ctx || {};
    var T = totalsOf(est, lines);
    var keyOf = groupKeyFn(settings, est, lines, ctx);
    var order = groupOrder(settings, est);
    var groups = {}, seq = [];
    var alternates = [];

    lines.forEach(function (l) {
      if (!l) return;
      // Same multiplier as nwEstTotals.optionalTotal (the line's own group), so the paper's
      // add/deduct matches the Estimating grid.
      var mult = groupMultiplier(est, l.group_name);
      if (l.is_optional) { alternates.push(lineCalc(l, est, T, mult)); return; }
      // sub-rows of an assembly line: only when Assembly Items is on (deferred: catalog sub_items)
      var g = keyOf(l);
      if (!groups[g]) { groups[g] = { name: g, rows: [], material: 0, laborOh: 0, total: 0, hours: 0, profit: 0 }; seq.push(g); }
      var r = lineCalc(l, est, T, mult);
      groups[g].rows.push(r);
      groups[g].material += r.material;
      groups[g].laborOh += r.laborOh;
      groups[g].total += r.total;
      groups[g].hours += r.hours;
      groups[g].profit += r.profit;
    });

    var ordered = [];
    order.forEach(function (n) { if (groups[n] && ordered.indexOf(groups[n]) < 0) ordered.push(groups[n]); });
    seq.forEach(function (n) { if (ordered.indexOf(groups[n]) < 0) ordered.push(groups[n]); });

    var itemsTotal = 0, profitTotal = 0, anyUntaxed = false;
    ordered.forEach(function (g) {
      itemsTotal += g.total; profitTotal += g.profit;
      g.rows.forEach(function (r) { if (!r.taxable) anyUntaxed = true; });
    });

    return {
      est: est,
      lines: lines,
      settings: settings,
      totals: T,
      groups: ordered,
      alternates: alternates,
      itemsTotal: itemsTotal,          // = Subtotal + Pre-Tax markups
      profitTotal: profitTotal,
      anyUntaxed: anyUntaxed,
      quote: est.quote_number || est.estimate_no || '--',
      date: todayShort(),
      office: officeFor(est.office),
      estimatorName: ctx.estimatorName || est.estimator_name || '',
      estimatorEmail: ctx.estimatorEmail || '',
      exclusions: est.exclusions || DEFAULT_EXCLUSIONS.join('\n')
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Paper (HTML string). Layout mirrors Procore's proposal preview:
  //  logo · Quote/Date · office block · Prepared By · rule · Project · Scope of Work ·
  //  per-group tables · footnote · Notes · Summary + Taxes · Total · Alternates · Accepted By
  // ─────────────────────────────────────────────────────────────────────────
  var PAPER_CSS =
    '.nwp-paper{width:8.5in;min-height:11in;box-sizing:border-box;padding:.55in .7in .7in;margin:0 auto;background:#fff;' +
      'color:#1f2933;font:11.5px/1.45 "Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.nwp-paper *{box-sizing:border-box}' +
    '.nwp-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px}' +
    '.nwp-logo{height:70px;width:auto;display:block}' +
    '.nwp-quote{font-size:12px;text-align:right;padding-top:8px}' +
    '.nwp-quote b{font-weight:600}' +
    '.nwp-cols{display:flex;justify-content:space-between;gap:24px;margin-bottom:6px}' +
    '.nwp-office{font-size:11.5px;line-height:1.35}' +
    '.nwp-block{margin-top:12px;font-size:11.5px;line-height:1.35}' +
    '.nwp-block .lbl{color:#1f2933}' +
    '.nwp-block .mail{margin-top:8px}' +
    '.nwp-customer{text-align:right;font-size:11.5px;line-height:1.35}' +
    '.nwp-rule{border:0;border-top:1.5px solid #1f2933;margin:22px 0 14px}' +
    '.nwp-project{margin:0 0 20px;font-size:11.5px}' +
    '.nwp-project .lbl{color:#6b7280;font-size:10.5px}' +
    '.nwp-h{font-size:12.5px;font-weight:700;margin:16px 0 8px}' +
    '.nwp-scope{white-space:normal;margin:0 0 16px}' +
    '.nwp-group{margin:14px 0 6px;font-size:12px;font-weight:700;page-break-after:avoid}' +
    '.nwp-group.only{display:flex;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding:6px 0;font-weight:600}' +
    '.nwp-table{width:100%;border-collapse:collapse;font-size:11px;page-break-inside:auto}' +
    '.nwp-table th{font-weight:400;color:#6b7280;font-size:10px;text-align:right;padding:4px 6px;border-bottom:1px solid #d1d5db;vertical-align:bottom;white-space:normal}' +
    '.nwp-table th.name{text-align:left}' +
    '.nwp-table td{padding:5px 6px;border-bottom:1px solid #eceff3;text-align:right;vertical-align:top;font-variant-numeric:tabular-nums;page-break-inside:avoid}' +
    '.nwp-table td.name{text-align:left;width:52%}' +
    '.nwp-table td.name .sub{display:block;color:#6b7280;font-size:10px}' +
    '.nwp-table tr.sub-total td{font-weight:600;border-top:1px solid #d1d5db;border-bottom:0}' +
    '.nwp-sqft{display:block;color:#6b7280;font-size:9.5px;font-variant-numeric:tabular-nums}' +
    '.nwp-foot{color:#6b7280;font-size:10px;margin:8px 0 0}' +
    '.nwp-notes p{margin:0 0 8px}' +
    '.nwp-notes h4{font-size:11.5px;font-weight:600;margin:8px 0 4px}' +
    '.nwp-summary{display:flex;gap:28px;align-items:flex-start;margin-top:18px;page-break-inside:avoid}' +
    '.nwp-summary .box{flex:1 1 0}' +
    '.nwp-summary .box h3{font-size:12px;font-weight:700;margin:0 0 6px}' +
    '.nwp-summary table{width:100%;border-collapse:collapse;font-size:11px}' +
    '.nwp-summary th{font-weight:400;color:#6b7280;font-size:10px;text-align:left;padding:4px 6px;border-bottom:1px solid #d1d5db}' +
    '.nwp-summary th.num{text-align:right}' +
    '.nwp-summary td{padding:5px 6px;border-bottom:1px solid #eceff3;font-variant-numeric:tabular-nums}' +
    '.nwp-summary td.num{text-align:right}' +
    '.nwp-summary tr.sub-total td{font-weight:600;border-top:1px solid #d1d5db;border-bottom:0}' +
    '.nwp-total{display:flex;justify-content:flex-end;align-items:baseline;gap:18px;margin:18px 0 6px;font-size:13px;page-break-inside:avoid}' +
    '.nwp-total .lbl{font-weight:600}' +
    '.nwp-total .val{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}' +
    '.nwp-total .nwp-sqft{display:inline;margin-left:8px}' +
    '.nwp-alt{margin-top:22px;page-break-inside:avoid}' +
    '.nwp-sign{display:flex;gap:40px;margin-top:44px;page-break-inside:avoid}' +
    '.nwp-sign .line{flex:1 1 0;border-top:1px solid #1f2933;padding-top:6px;font-size:11px}' +
    '.nwp-sign .line.date{flex:0 0 2.2in}' +
    '.nwp-info p{margin:0 0 3px}.nwp-info .lbl{color:#6b7280}' +
    '.nwp-lines p{margin:0 0 6px;line-height:1.4}' +
    '.nwp-lines.ex p{font-style:italic}.nwp-lines.ex.rich p,.nwp-lines.ex.rich li{font-style:normal}' +
    '.nwp-lines ul,.nwp-lines ol{margin:0 0 6px 20px;padding:0}.nwp-lines li{margin:0 0 3px;line-height:1.4}' +
    '.nwp-paper .ff-times,.nwp-paper font[face*="Times"]{font-family:"Times New Roman",Times,serif}.nwp-paper .ff-courier,.nwp-paper font[face*="Courier"]{font-family:"Courier New",Courier,monospace}' +
    '.nwp-paper font[size="1"]{font-size:7pt}.nwp-paper font[size="2"]{font-size:8pt}.nwp-paper font[size="3"]{font-size:8.6pt}.nwp-paper font[size="4"]{font-size:10pt}.nwp-paper font[size="5"]{font-size:12pt}.nwp-paper font[size="6"]{font-size:14pt}.nwp-paper font[size="7"]{font-size:18pt}' +
    '.nwp-page2{page-break-before:always;padding-top:4px}' +
    '.nwp-page2 .nwp-lines.n410 p{margin:0 0 5px}' +
    '.nwp-page2 .nwp-terms{margin:0 0 6px;line-height:1.5}' +
    '.nwp-price{text-align:right;font-size:20px;font-weight:700;margin:28px 0 4px;font-variant-numeric:tabular-nums;page-break-inside:avoid}' +
    '.nwp-alt-row{display:flex;justify-content:space-between;border-bottom:1px solid #eceff3;padding:4px 0;font-variant-numeric:tabular-nums}' +
    '@media print{.nwp-paper{width:auto;min-height:0;margin:0;padding:0}}';

  function sqftSuffix(model, amount) {
    var T = model.totals;
    return '<span class="nwp-sqft">' + (T.sqft > 0 ? money(amount / T.sqft, 2) : '--') + ' / sq ft</span>';
  }

  // NWAC letter — the layout of quote 3766 (1810 Randall Ave): lump-sum price, scope as a list, standard exclusions, terms, acceptance.
  function renderLetter(m, ctx) {
    ctx = ctx || {};
    var S = m.settings, T = m.totals, e = m.est, o = m.office;
    var clean = function (t) { return String(t || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean); };
    var scopeRich = isRich(e.scope_summary), exclRich = isRich(m.exclusions);
    var scope = scopeRich ? [] : ((e.scope_summary && String(e.scope_summary).trim()) ? clean(e.scope_summary) : buildScope(e, m.lines));
    var excl = exclRich ? [] : clean(m.exclusions);
    var show410 = S.r410a === 'on' || (S.r410a !== 'off' && hasR410a(e, m.lines));
    var cust = e.requester_company || e.client_name || '';

    var h = '<style id="nwp-style">' + PAPER_CSS + '</style>';
    h += '<div class="nwp-paper nwp-letter" id="nwpPaper">';

    // header: logo | Quote / Date
    h += '<div class="nwp-head"><img class="nwp-logo" src="logo-full.png" alt="Northern Wolves Air Conditioning">';
    h += '<div class="nwp-quote"><b>Quote:</b> ' + esc(m.quote) + ' / <b>Date:</b> ' + esc(m.date) + '</div></div>';

    // office + prepared by (left) · customer (right)
    h += '<div class="nwp-cols"><div>';
    h += '<div class="nwp-office">' + esc(o.name) + '<br>' + esc(o.addr1) + '<br>' + esc(o.city) + '<br>' + esc(o.zip) + '<br>' + esc(o.phone) + '</div>';
    h += '<div class="nwp-block"><span class="lbl">Prepared By:</span><br>' + esc(m.estimatorName || '--');
    h += '<br>' + esc(ctx.estimatorPhone || o.phone);
    if (m.estimatorEmail) h += '<br>' + esc(m.estimatorEmail);
    h += '</div></div>';
    h += '<div class="nwp-customer"><span style="color:#6b7280">Customer</span><br>' + (cust ? '<b>' + esc(cust) + '</b>' : '<span style="color:#9ca3af">—</span>');
    if (S.contactName) h += '<br>' + esc(S.contactName);
    if (S.contactEmail) h += '<br>' + esc(S.contactEmail);
    h += '</div></div>';

    h += '<hr class="nwp-rule">';

    // project block
    h += '<div class="nwp-info">';
    h += '<p><span class="lbl">Project:</span> <b>' + esc(e.name || '') + '</b></p>';
    if (e.project_address) h += '<p><span class="lbl">Address:</span> ' + esc(String(e.project_address).replace(/\r?\n/g, ', ')) + '</p>';
    if (S.drawingsDate) h += '<p><span class="lbl">Mechanical drawings dated:</span> ' + esc(S.drawingsDate) + '</p>';
    h += '</div>';

    h += '<div class="nwp-h">Scope of Work</div><div class="nwp-lines' + (scopeRich ? ' rich' : '') + '">';
    if (scopeRich) h += richToHtml(e.scope_summary); else scope.forEach(function (t) { h += '<p>' + esc(t) + '</p>'; });
    h += '</div>';

    h += '<div class="nwp-h">Exclusions / Notes</div><div class="nwp-lines ex' + (exclRich ? ' rich' : '') + '">';
    if (exclRich) h += richToHtml(m.exclusions); else excl.forEach(function (t) { h += '<p>' + esc(t) + '</p>'; });
    h += '</div>';

    // page 2
    h += '<div class="nwp-page2">';
    if (show410) {
      h += '<div class="nwp-h" style="margin-top:0">410A System Notes:</div><div class="nwp-lines n410">';
      R410A_NOTES.forEach(function (t, i) { h += '<p>' + (i + 1) + '. ' + esc(t) + '</p>'; });
      h += '</div>';
    }
    h += '<div class="nwp-h">Terms</div><p class="nwp-terms">' + esc(TERMS_TEXT) + '</p>';
    if (m.alternates.length) {
      h += '<div class="nwp-h">Alternates</div>';
      m.alternates.forEach(function (r) {
        h += '<div class="nwp-alt-row"><span>' + esc(r.line.description || '') + '</span><span>' + money(r.total, 2) + '</span></div>';
      });
      h += '<p class="nwp-foot">Alternate pricing excludes taxes; add or deduct from the price below on acceptance.</p>';
    }
    var grand = S.rounding.roundTotal ? Math.round(T.total) : T.total;
    h += '<div class="nwp-price">' + money(grand, S.rounding.roundTotal ? 0 : 2) + '</div>';
    if (S.summary.acceptedBy || S.summary.date) {
      h += '<div class="nwp-sign">';
      if (S.summary.acceptedBy) h += '<div class="line">Accepted By</div>';
      if (S.summary.date) h += '<div class="line date">Date</div>';
      h += '</div>';
    }
    h += '</div>';

    h += '</div>';
    return h;
  }

  function render(est, lines, settings, ctx) {
    var m = compute(est, lines, settings, ctx);
    if (m.settings.layout !== 'detailed') return renderLetter(m, ctx);
    var S = m.settings, T = m.totals;
    var dec = S.rounding.twoDecimals ? 2 : 0;
    var $ = function (n) { return money(n, dec); };
    var e = m.est;
    var o = m.office;
    var cat = (ctx && ctx.catalogById) || {};
    var lump = !!S.lumpSum;
    var groupsOnly = !!S.groupsOnly;
    var showQty = !!S.quantity && !groupsOnly;
    var showTotal = !!S.itemTotalCost && !lump;
    var combined = !!S.combinedUnitCost;
    var showCosts = !lump;

    var h = '<style id="nwp-style">' + PAPER_CSS + '</style>';
    h += '<div class="nwp-paper" id="nwpPaper">';

    // ── Header: logo | Quote / Date
    h += '<div class="nwp-head">';
    h += '<img class="nwp-logo" src="logo-full.png" alt="Northern Wolves Air Conditioning">';
    h += '<div class="nwp-quote"><b>Quote:</b> ' + esc(m.quote) + ' / <b>Date:</b> ' + esc(m.date) + '</div>';
    h += '</div>';

    // ── Office block + customer (right)
    h += '<div class="nwp-cols"><div>';
    h += '<div class="nwp-office">' + esc(o.name) + '<br>' + esc(o.addr1) + '<br>' + esc(o.city) + '<br>' + esc(o.zip) + '<br>' + esc(o.phone) + '</div>';
    h += '<div class="nwp-block"><span class="lbl">Prepared By:</span><br>' + esc(m.estimatorName || '--');
    if (m.estimatorEmail) h += '<div class="mail">' + esc(m.estimatorEmail) + '</div>';
    h += '</div></div>';
    var cust = e.requester_company || e.client_name || '';
    if (cust || S.contactName || S.contactEmail || e.project_address) {
      h += '<div class="nwp-customer">';
      if (cust) h += '<b>' + esc(cust) + '</b><br>';
      if (S.contactName) h += esc(S.contactName) + '<br>';
      if (S.contactEmail) h += esc(S.contactEmail) + '<br>';
      if (e.project_address) h += nl2br(e.project_address);
      h += '</div>';
    }
    h += '</div>';

    h += '<hr class="nwp-rule">';

    // ── Project + scope
    h += '<p class="nwp-project"><span class="lbl">Project: </span><b>' + esc(e.name || '') + '</b>' +
         (e.project_number ? ' <span class="lbl">· Project # ' + esc(e.project_number) + '</span>' : '') + '</p>';
    h += '<div class="nwp-h">Scope of Work</div>';
    var scope = e.scope_summary || e.project_description || '';
    if (scope) h += isRich(scope) ? '<div class="nwp-scope nwp-lines rich">' + richToHtml(scope) + '</div>' : '<p class="nwp-scope">' + nl2br(scope) + '</p>';

    // ── Groups
    function thead() {
      var s = '<thead><tr><th class="name"></th>';
      if (showQty) s += '<th>Quantity</th>';
      if (showCosts) s += combined ? '<th>Unit Cost</th>' : '<th>Material Cost</th><th>Labor Cost and Overhead</th>';
      if (showTotal) s += '<th>Total Cost</th>';
      return s + '</tr></thead>';
    }
    m.groups.forEach(function (g) {
      if (groupsOnly) {
        h += '<div class="nwp-group only"><span>' + esc(g.name) + '</span>' +
             (lump ? '<span></span>' : '<span>' + $(g.total) + (S.sqft.groupSubtotals ? sqftSuffix(m, g.total) : '') + '</span>') + '</div>';
        return;
      }
      h += '<div class="nwp-group">' + esc(g.name) + '</div>';
      h += '<table class="nwp-table">' + thead() + '<tbody>';
      g.rows.forEach(function (r) {
        var l = r.line;
        var ci = (l.catalog_item_id != null && cat[l.catalog_item_id]) || null;
        var name = esc(l.description || '') + (r.taxable ? '' : '*');
        var subs = [];
        if (S.description && (l.notes || (ci && ci.description))) subs.push(esc(l.notes || ci.description));
        if (S.manufacturer && (l.manufacturer || (ci && ci.manufacturer))) subs.push('Manufacturer: ' + esc(l.manufacturer || ci.manufacturer));
        if (S.catalogNumber && (l.vendor_quote_ref || (ci && ci.catalog_number))) subs.push('Catalog #: ' + esc(l.vendor_quote_ref || ci.catalog_number));
        h += '<tr><td class="name">' + name + (subs.length ? '<span class="sub">' + subs.join(' · ') + '</span>' : '') + '</td>';
        if (showQty) h += '<td>' + esc(qtyFmt(r.qty, r.unit)) + '</td>';
        if (showCosts) h += combined ? '<td>' + $(r.unitTotal) + '</td>' : '<td>' + $(r.matU) + '</td><td>' + $(r.labOhU) + '</td>';
        if (showTotal) h += '<td>' + $(r.total) + (S.sqft.costItems ? sqftSuffix(m, r.total) : '') + '</td>';
        h += '</tr>';
      });
      if (S.groupSubtotals && showCosts) {
        h += '<tr class="sub-total"><td class="name">Subtotal ' + esc(g.name) + '</td>';
        if (showQty) h += '<td></td>';
        var gTot = $(g.total) + (S.sqft.groupSubtotals ? sqftSuffix(m, g.total) : '');
        if (showTotal) {
          if (combined) h += '<td></td>'; else h += '<td>' + $(g.material) + '</td><td>' + $(g.laborOh) + '</td>';
          h += '<td>' + gTot + '</td>';
        } else if (combined) {
          h += '<td>' + gTot + '</td>';                                        // group total in the Unit Cost column
        } else {
          h += '<td>' + $(g.material) + '</td><td>' + $(g.laborOh) + '</td>';  // no Total column: per-column subtotals
        }
        h += '</tr>';
      }
      h += '</tbody></table>';
    });
    if (!m.groups.length) h += '<p class="nwp-foot">No cost items in this estimate yet.</p>';
    if (m.anyUntaxed && !groupsOnly) h += '<p class="nwp-foot">* Tax not applied to part or subcomponent</p>';

    // ── Notes / Inclusions / Exclusions
    h += '<div class="nwp-notes"><div class="nwp-h">Notes</div>';
    if (e.notes) h += '<p>' + nl2br(e.notes) + '</p>';
    if (e.inclusions) h += '<h4>Inclusions</h4><p>' + nl2br(e.inclusions) + '</p>';
    h += '<h4>Exclusions</h4>' + (isRich(m.exclusions) ? '<div class="nwp-lines ex rich">' + richToHtml(m.exclusions) + '</div>' : '<p>' + nl2br(m.exclusions) + '</p>');
    h += '</div>';

    // ── Summary + Taxes (side by side)
    if (!lump && (S.summary.laborMaterials || S.summary.taxes)) {
      h += '<div class="nwp-summary">';
      if (S.summary.laborMaterials) {
        h += '<div class="box"><h3>Summary</h3><table><thead><tr><th>Cost Type</th><th class="num">Total</th></tr></thead><tbody>';
        if (S.summary.overhead) {
          h += '<tr><td>Labor</td><td class="num">' + $(T.laborSales) + (S.sqft.summary ? sqftSuffix(m, T.laborSales) : '') + '</td></tr>';
          T.preTax.forEach(function (p) {
            h += '<tr><td>' + esc(p.name) + '</td><td class="num">' + $(p.amount) + '</td></tr>';
          });
        } else {
          var lo = T.laborSales + T.preTaxTotal;
          h += '<tr><td>Labor and Overhead</td><td class="num">' + $(lo) + (S.sqft.summary ? sqftSuffix(m, lo) : '') + '</td></tr>';
        }
        h += '<tr><td>Materials</td><td class="num">' + $(T.materialsSales) + (S.sqft.summary ? sqftSuffix(m, T.materialsSales) : '') + '</td></tr>';
        if (S.summary.profit) h += '<tr><td>Profit</td><td class="num">' + $(m.profitTotal) + '</td></tr>';
        var sub1 = T.subtotal + T.preTaxTotal;
        h += '<tr class="sub-total"><td>Subtotal</td><td class="num">' + $(sub1) + (S.sqft.summary ? sqftSuffix(m, sub1) : '') + '</td></tr>';
        h += '</tbody></table></div>';
      }
      if (S.summary.taxes) {
        h += '<div class="box"><h3>Taxes</h3><table><thead><tr><th>Tax</th><th class="num">Total</th></tr></thead><tbody>';
        h += '<tr><td>Labor Tax</td><td class="num">' + $(num(T.taxes.labor && T.taxes.labor.amount)) + '</td></tr>';
        h += '<tr><td>Material Tax</td><td class="num">' + $(num(T.taxes.materials && T.taxes.materials.amount)) + '</td></tr>';
        T.postTax.forEach(function (p) {
          h += '<tr><td>' + esc(p.name) + '</td><td class="num">' + $(p.amount) + '</td></tr>';
        });
        h += '<tr class="sub-total"><td>Subtotal</td><td class="num">' + $(T.taxTotal + T.postTaxTotal) + '</td></tr>';
        h += '</tbody></table></div>';
      }
      h += '</div>';
    }

    // ── Grand total
    var grand = S.rounding.roundTotal ? Math.round(T.total) : T.total;
    h += '<div class="nwp-total"><span class="lbl">Total</span><span class="val">' + money(grand, S.rounding.roundTotal ? 0 : dec) +
         (S.sqft.estimateTotal ? sqftSuffix(m, T.total) : '') + '</span></div>';

    // ── Alternates (optional lines)
    if (m.alternates.length) {
      h += '<div class="nwp-alt"><div class="nwp-h">Alternates</div>';
      h += '<table class="nwp-table"><thead><tr><th class="name">Alternate</th>' + (showQty ? '<th>Quantity</th>' : '') + '<th>Add / Deduct</th></tr></thead><tbody>';
      m.alternates.forEach(function (r) {
        h += '<tr><td class="name">' + esc(r.line.description || '') + (r.taxable ? '' : '*') + '</td>' +
             (showQty ? '<td>' + esc(qtyFmt(r.qty, r.unit)) + '</td>' : '') +
             '<td>' + $(r.total) + '</td></tr>';
      });
      h += '</tbody></table><p class="nwp-foot">Alternate pricing excludes taxes; add or deduct from the Total above on acceptance.</p></div>';
    }

    // ── Accepted By / Date
    if (S.summary.acceptedBy || S.summary.date) {
      h += '<div class="nwp-sign">';
      if (S.summary.acceptedBy) h += '<div class="line">Accepted By</div>';
      if (S.summary.date) h += '<div class="line date">Date</div>';
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Export PDF — html2pdf (letter, margin 0) → arraybuffer → pdf-lib merge
  //  cover + proposal + appendix → download. Returns a Promise<Uint8Array>.
  // ─────────────────────────────────────────────────────────────────────────
  // Fallback: html2pdf photographs the sheet (picture pages, not selectable). Resolves Uint8Array.
  function rasterPdf(sheet, filename) {
    if (typeof window.html2pdf !== 'function') {
      toast('PDF library (html2pdf) not loaded — refresh the page', 'error');
      return Promise.reject(new Error('html2pdf not loaded'));
    }
    return window.html2pdf().set({
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['p', 'li', 'tr', '.nwp-h', '.nwp-group'] }
    }).from(sheet).outputPdf('arraybuffer').then(function (ab) { return new Uint8Array(ab); });
  }

  // ── Text PDF ─────────────────────────────────────────────────────────────
  // The sheet is laid out by the browser (so the preview, the margins and the line breaks are exactly what the person sees); every line of
  // text, border, background and image is then read back from that layout and drawn with jsPDF as real text. Letter page = 816 × 1056 css px
  // = 612 × 792 pt, so px × 0.75 = pt. Text is measured in Arial and drawn in Helvetica (same advance widths) so lines do not drift.
  var V = { PX: 0.75, PAGE_H: 1056, TOP: 53, BOT: 62, FONT: 'Arial,Helvetica,"Liberation Sans",sans-serif' };
  var KEEP_WITH_NEXT = '.nwp-h, .nwp-group, h1, h2, h3, h4, h5';
  function pdfText(t) {
    return String(t).replace(/[     ]/g, ' ').replace(/[​‌‍﻿]/g, '')
      .replace(/→/g, '->').replace(/←/g, '<-').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/−/g, '-')
      .replace(/[^\x09\x0A\x0D\x20-\x7E¡-ÿ–—‘’“”•…™€]/g, '');
  }
  function cssColor(c) {
    var m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null;
    var p = m[1].split(',').map(function (x) { return parseFloat(x); });
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function imgDataUrl(img) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(1, 900 / w), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  // Everything drawable in the sheet, in sheet pixels: { kind, top, bottom, … }
  function collectDrawables(root) {
    var R0 = root.getBoundingClientRect(), ox = R0.left, oy = R0.top, items = [], forced = [];
    function addLine(x1, y1, x2, y2, w, col) { items.push({ kind: 'line', x1: x1 - ox, y1: y1 - oy, x2: x2 - ox, y2: y2 - oy, w: w, col: col, top: Math.min(y1, y2) - oy, bottom: Math.max(y1, y2) - oy }); }
    function walk(el) {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      var r = el.getBoundingClientRect();
      if (el !== root && (cs.breakBefore === 'page' || cs.pageBreakBefore === 'always')) forced.push(r.top - oy);
      var bg = cssColor(cs.backgroundColor);
      if (bg && bg.a > 0.05 && !(bg.r > 250 && bg.g > 250 && bg.b > 250) && r.width > 0 && r.height > 0 && r.height < 400)
        items.push({ kind: 'rect', x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, col: bg, top: r.top - oy, bottom: r.bottom - oy });
      if (r.width > 0 || r.height > 0) {
        [['Top', r.left, r.top, r.right, r.top], ['Bottom', r.left, r.bottom, r.right, r.bottom], ['Left', r.left, r.top, r.left, r.bottom], ['Right', r.right, r.top, r.right, r.bottom]].forEach(function (s) {
          var w = parseFloat(cs['border' + s[0] + 'Width']) || 0, st = cs['border' + s[0] + 'Style'], col = cssColor(cs['border' + s[0] + 'Color']);
          if (w > 0 && st !== 'none' && st !== 'hidden' && col && col.a > 0.05) addLine(s[1], s[2] - (s[0] === 'Bottom' ? w / 2 : -w / 2), s[3], s[4] - (s[0] === 'Bottom' ? w / 2 : -w / 2), w, col);
        });
      }
      if (el.tagName === 'IMG') {
        if (r.width > 0 && r.height > 0) items.push({ kind: 'img', x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, data: imgDataUrl(el), top: r.top - oy, bottom: r.bottom - oy });
        return;
      }
      if (el.tagName === 'LI' && cs.display === 'list-item' && cs.listStyleType && cs.listStyleType !== 'none') {
        var rg = document.createRange(); rg.selectNodeContents(el);
        var fr = rg.getClientRects()[0], size = parseFloat(cs.fontSize) || 12, col = cssColor(cs.color) || { r: 0, g: 0, b: 0 };
        if (fr) {
          if (/^(decimal|lower|upper)/.test(cs.listStyleType)) {
            var idx = 0, sib = el; while ((sib = sib.previousElementSibling)) if (sib.tagName === 'LI') idx++;
            var start = el.parentNode && el.parentNode.getAttribute && parseInt(el.parentNode.getAttribute('start'), 10); idx += (isNaN(start) || !start ? 1 : start);
            items.push({ kind: 'text', text: idx + '.', x: r.left - ox - size * 0.35, y: fr.top - oy, h: fr.height, size: size, bold: false, italic: false, color: col, align: 'right', top: fr.top - oy, bottom: fr.bottom - oy, keep: false });
          } else {
            items.push({ kind: 'dot', x: r.left - ox - size * 0.85, y: fr.top - oy + fr.height * 0.52, r: size * 0.17, col: col, hollow: cs.listStyleType === 'circle', top: fr.top - oy, bottom: fr.bottom - oy });
          }
        }
      }
      var keep = !!(el.closest && el.closest(KEEP_WITH_NEXT));
      Array.prototype.forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 1) walk(n);
        else if (n.nodeType === 3) textLines(n, cs, keep);
      });
    }
    function textLines(node, cs, keep) {
      var data = node.nodeValue; if (!data || !/\S/.test(data)) return;
      var size = parseFloat(cs.fontSize) || 12, wt = cs.fontWeight, bold = wt === 'bold' || wt === 'bolder' || (parseInt(wt, 10) || 400) >= 600;
      var italic = cs.fontStyle === 'italic' || cs.fontStyle === 'oblique', col = cssColor(cs.color) || { r: 0, g: 0, b: 0 }, under = /underline/.test(cs.textDecorationLine || cs.textDecoration || '');
      var upper = cs.textTransform === 'uppercase', lower = cs.textTransform === 'lowercase';
      var ff = String(cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim().toLowerCase(), family = /^(times|liberation serif)/.test(ff) ? 'times' : /^(courier|liberation mono)/.test(ff) ? 'courier' : 'helvetica';
      var re = /\S+/g, m, lines = [], rng = document.createRange();
      while ((m = re.exec(data))) {
        rng.setStart(node, m.index); rng.setEnd(node, m.index + m[0].length);
        var rc = rng.getClientRects()[0]; if (!rc || (!rc.width && !rc.height)) continue;
        var w = upper ? m[0].toUpperCase() : lower ? m[0].toLowerCase() : m[0], last = lines[lines.length - 1];
        if (last && Math.abs(rc.top - last.rtop) < 2 && rc.left >= last.right - 1) { last.text += ' ' + w; last.right = rc.right; }
        else lines.push({ text: w, left: rc.left, right: rc.right, rtop: rc.top, height: rc.height });
      }
      lines.forEach(function (l) {
        items.push({ kind: 'text', text: l.text, x: l.left - ox, y: l.rtop - oy, h: l.height, w: l.right - l.left, size: size, bold: bold, italic: italic, family: family, color: col, under: under, top: l.rtop - oy, bottom: l.rtop - oy + l.height, keep: keep });
      });
    }
    walk(root);
    return { items: items, forced: forced.sort(function (a, b) { return a - b; }) };
  }

  // Page numbers for every drawable: a line is never cut in half, a heading is not left alone at the bottom, a forced break (page-break-before) starts a new page
  function paginate(items, forced) {
    var order = items.map(function (_, i) { return i; }).sort(function (a, b) { return (items[a].top - items[b].top) || (a - b); });
    var off = [0], page = 0, pageOf = new Array(items.length), fi = 0;
    function limit() { return off[page] + V.PAGE_H - V.BOT; }
    function newPage(k, backtrack) {
      var j = k;
      if (backtrack) while (j > 0 && items[order[j - 1]].kind === 'text' && items[order[j - 1]].keep && pageOf[order[j - 1]] === page && items[order[j - 1]].top > off[page] + 1) j--;
      page++; off[page] = items[order[j]].top - V.TOP;
      for (var t = j; t < k; t++) pageOf[order[t]] = page;
    }
    for (var k = 0; k < order.length; k++) {
      var it = items[order[k]];
      while (fi < forced.length && it.top >= forced[fi] - 0.5) {
        fi++;
        if (it.top - off[page] > V.TOP + 20) newPage(k, false);   // the forced break only matters when the current page already has content
      }
      if (it.bottom - off[page] > limit() - off[page] && (it.bottom - it.top) < 300 && it.top - off[page] > V.TOP + 1) newPage(k, true);
      pageOf[order[k]] = page;
    }
    return { pageOf: pageOf, off: off, pages: page + 1 };
  }

  function vectorPdf(sheet, filename) {
    return ensureJsPdf().then(function (jsPDF) {
      var host = document.createElement('div');
      host.className = 'nwp-vexport';
      host.style.cssText = 'position:fixed;left:-12000px;top:0;width:8.5in;background:#fff;z-index:-1';
      var st = document.createElement('style');
      st.textContent = '.nwp-vexport,.nwp-vexport *{font-family:' + V.FONT + ' !important;-webkit-font-smoothing:auto}' +
        '.nwp-vexport .ff-times{font-family:"Times New Roman","Liberation Serif",Times,serif !important}.nwp-vexport .ff-courier{font-family:"Courier New","Liberation Mono",Courier,monospace !important}';
      host.appendChild(st);
      var clone = sheet.cloneNode(true);
      clone.removeAttribute('contenteditable'); clone.removeAttribute('id');
      // fonts picked in Edit Mode (<font face>, inline font-family) → the classes that survive the Arial override above
      Array.prototype.forEach.call(clone.querySelectorAll('font[face],[style*="font-family"]'), function (el) {
        var f = el.getAttribute('face') || el.style.fontFamily || '';
        if (/times/i.test(f)) el.classList.add('ff-times'); else if (/courier/i.test(f)) el.classList.add('ff-courier');
      });
      clone.style.margin = '0'; clone.style.width = '8.5in'; clone.style.minHeight = '0';
      host.appendChild(clone); document.body.appendChild(host);
      var imgs = Array.prototype.slice.call(clone.querySelectorAll('img'));
      return Promise.all(imgs.map(function (im) {
        return im.complete && im.naturalWidth ? Promise.resolve() : new Promise(function (res) { im.onload = im.onerror = res; });
      })).then(function () {
        var got = collectDrawables(clone), items = got.items;
        if (!items.some(function (i) { return i.kind === 'text'; })) throw new Error('nothing to draw');
        var pg = paginate(items, got.forced);
        var doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true }), PX = V.PX;
        doc.setProperties({ title: String(filename || 'Proposal').replace(/\.pdf$/i, ''), author: 'Northern Wolves Air Conditioning', creator: 'NWAC' });
        for (var p = 0; p < pg.pages; p++) {
          if (p) doc.addPage();
          var order = [];
          items.forEach(function (it, i) { if (pg.pageOf[i] === p) order.push(i); });
          // backgrounds first, then lines / pictures, text on top
          var rank = { rect: 0, img: 1, line: 2, dot: 3, text: 4 };
          order.sort(function (a, b) { return (rank[items[a].kind] - rank[items[b].kind]) || (a - b); });
          order.forEach(function (i) {
            var it = items[i], dy = pg.off[p];
            if (it.kind === 'rect') { doc.setFillColor(it.col.r, it.col.g, it.col.b); doc.rect(it.x * PX, (it.y - dy) * PX, it.w * PX, it.h * PX, 'F'); }
            else if (it.kind === 'img') { try { doc.addImage(it.data, 'PNG', it.x * PX, (it.y - dy) * PX, it.w * PX, it.h * PX); } catch (e) { console.warn('[nw-proposal] image skipped', e); } }
            else if (it.kind === 'line') { doc.setDrawColor(it.col.r, it.col.g, it.col.b); doc.setLineWidth(Math.max(0.4, it.w * PX)); doc.line(it.x1 * PX, (it.y1 - dy) * PX, it.x2 * PX, (it.y2 - dy) * PX); }
            else if (it.kind === 'dot') {
              doc.setFillColor(it.col.r, it.col.g, it.col.b); doc.setDrawColor(it.col.r, it.col.g, it.col.b); doc.setLineWidth(0.6);
              doc.circle(it.x * PX, (it.y - dy) * PX, it.r * PX, it.hollow ? 'S' : 'F');
            } else {
              var txt = pdfText(it.text); if (!txt) return;
              doc.setFont(it.family || 'helvetica', it.bold && it.italic ? 'bolditalic' : it.bold ? 'bold' : it.italic ? 'italic' : 'normal');
              doc.setFontSize(it.size * PX); doc.setTextColor(it.color.r, it.color.g, it.color.b);
              var base = (it.y - dy + it.h * 0.82) * PX;
              doc.text(txt, it.x * PX, base, it.align === 'right' ? { align: 'right' } : undefined);
              if (it.under) { doc.setDrawColor(it.color.r, it.color.g, it.color.b); doc.setLineWidth(0.5); var tw = doc.getTextWidth(txt); doc.line(it.x * PX, base + 1.4, it.x * PX + tw, base + 1.4); }
            }
          });
        }
        return new Uint8Array(doc.output('arraybuffer'));
      }).then(function (bytes) { host.remove(); return bytes; }, function (err) { host.remove(); throw err; });
    });
  }

  function exportPdf(paperEl, opts) {
    opts = opts || {};
    if (typeof paperEl === 'string') paperEl = document.querySelector(paperEl);
    if (!paperEl) return Promise.reject(new Error('exportPdf: paper element not found'));
    var filename = opts.filename || 'proposal.pdf';
    if (!/\.pdf$/i.test(filename)) filename += '.pdf';
    // The Proposal tab hands over its padded wrapper (#propPaper, max 960 px + padding) around the 8.5 in sheet; exporting the wrapper
    // shifted the sheet right and cut its right edge. Always work from the sheet itself.
    var sheet = (paperEl.classList && paperEl.classList.contains('nwp-paper')) ? paperEl : (paperEl.querySelector && paperEl.querySelector('.nwp-paper')) || paperEl;

    // text PDF first (selectable, sharp, small, clean page breaks); the old picture-based export stays as the fallback
    var build = vectorPdf(sheet, filename).catch(function (err) {
      console.warn('[nw-proposal] text PDF failed, falling back to the picture export', err);
      return rasterPdf(sheet, filename);
    });

    return build.then(function (bytes) {
      var hasExtras = (opts.coverBytes && opts.coverBytes.byteLength) || (opts.appendixBytes && opts.appendixBytes.byteLength);
      if (!hasExtras) return bytes;
      if (!window.PDFLib || !window.PDFLib.PDFDocument) {
        toast('pdf-lib not loaded — exporting without cover / appendix', 'error');
        return bytes;
      }
      var PDFDocument = window.PDFLib.PDFDocument;
      return PDFDocument.create().then(function (out) {
        var parts = [opts.coverBytes, bytes, opts.appendixBytes].filter(function (p) { return p && p.byteLength; });
        var chain = Promise.resolve();
        parts.forEach(function (p) {
          chain = chain.then(function () {
            return PDFDocument.load(p, { ignoreEncryption: true }).then(function (src) {
              return out.copyPages(src, src.getPageIndices());
            }).then(function (pages) {
              pages.forEach(function (pg) { out.addPage(pg); });
            });
          });
        });
        return chain.then(function () { return out.save(); });
      });
    }).then(function (finalBytes) {
      downloadBlob(new Blob([finalBytes], { type: 'application/pdf' }), filename);
      toast(filename + ' downloaded', 'success');
      return finalBytes;
    }).catch(function (err) {
      console.error('exportPdf failed', err);
      toast('PDF export failed: ' + (err && err.message ? err.message : err), 'error');
      throw err;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Export the 2-page NWAC letter (moved verbatim from estimating.html
  //  exportProposalPDF — Kastriot's design, Reference/Estimating Standards/
  //  Proposal Template.md). Uses OFFICES + ctx.estimatorEmail instead of the
  //  hard-coded address / email.
  // ─────────────────────────────────────────────────────────────────────────
  var JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var jspdfLoading = null;
  // html2pdf.bundle exposes only the html2pdf global (not window.jspdf), so pages that ship
  // only the bundle (bid-project.html) get jsPDF loaded on demand from the same cdnjs URL
  // estimating.html already uses. Resolves once window.jspdf.jsPDF exists.
  function ensureJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jspdfLoading) return jspdfLoading;
    jspdfLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = JSPDF_CDN;
      s.async = true;
      s.onload = function () {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF loaded but window.jspdf.jsPDF is missing'));
      };
      s.onerror = function () { reject(new Error('could not load jsPDF from cdnjs')); };
      document.head.appendChild(s);
    }).catch(function (err) { jspdfLoading = null; throw err; });
    return jspdfLoading;
  }

  // Returns a Promise<filename>. ctx: { estimatorEmail, estimatorName, revision }
  function exportLetter(est, lines, ctx) {
    return ensureJsPdf().then(function () {
      return exportLetterSync(est, lines, ctx);
    }).catch(function (err) {
      console.error('exportLetter failed', err);
      toast('PDF library (jsPDF) not loaded — ' + (err && err.message ? err.message : 'refresh the page'), 'error');
      throw err;
    });
  }

  function exportLetterSync(est, lines, ctx) {
    ctx = ctx || {};
    est = est || {};
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('window.jspdf.jsPDF is not available on this page');
    }
    var totals = totalsOf(est, lines || []);
    var office = officeFor(est.office);
    var jsPDF  = window.jspdf.jsPDF;
    var doc    = new jsPDF({ unit: 'pt', format: 'letter' });   // 612 × 792
    var pageW  = 612;

    // NWAC palette (from Proposal Template)
    var COLOR_BODY   = [17, 17, 17];       // #111111
    var COLOR_SEC    = [51, 51, 51];       // #333333
    var COLOR_META   = [107, 107, 107];    // #6B6B6B
    var COLOR_HDR    = [34, 107, 138];     // #226B8A — teal-blue section headers
    var COLOR_DIV    = [212, 212, 212];    // #D4D4D4 — hairline dividers

    // Layout constants (per template spec)
    var HANG_X   = 60;   // section headers + total box hang here
    var BODY_X   = 78;   // body copy under section headers
    var RIGHT_X  = pageW - 60;
    var y = 60;

    // Letter-space uppercase (tracked)
    function tracked(txt) { return txt.split('').join(' '); }

    // Section header (hung left at HANG_X, tracked uppercase, teal, with divider above)
    function sectionHeader(label, divider) {
      if (divider) {
        doc.setDrawColor.apply(doc, COLOR_DIV);
        doc.setLineWidth(0.5);
        doc.line(BODY_X, y, RIGHT_X, y);
        y += 12;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, COLOR_HDR);
      doc.text(tracked(label.toUpperCase()), HANG_X, y);
      y += 14;
      doc.setTextColor.apply(doc, COLOR_BODY);
    }

    // Hairline rule at current y (used between scope lines and exclusion lines)
    function hairline() {
      doc.setDrawColor.apply(doc, COLOR_DIV);
      doc.setLineWidth(0.5);
      doc.line(BODY_X, y, RIGHT_X, y);
    }

    // ─── LOGO placeholder (centered, top) ───
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor.apply(doc, COLOR_HDR);
    doc.text('NORTHERN WOLVES AC', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, COLOR_META);
    doc.text('mechanical contractor', pageW / 2, y, { align: 'center' });
    y += 24;

    // ─── Two-column header row (below logo) ───
    var headerTop = y;
    // Left: company + estimator
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, COLOR_BODY);
    doc.text(office.name, HANG_X, headerTop);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, COLOR_SEC);
    doc.text(office.addr1 + ', ' + office.city + ' ' + office.zip + ' · ' + office.phone,
             HANG_X, headerTop + 11);
    var estName  = est.estimator_name || ctx.estimatorName || '';
    var estEmail = ctx.estimatorEmail || '';
    doc.text((estName ? estName + ' · ' : '') + 'Estimator', HANG_X, headerTop + 24);
    if (estEmail) doc.text(estEmail, HANG_X, headerTop + 35);

    // Right: Quote/Date/Revision/Customer, right-aligned
    var quoteNo = est.quote_number || est.estimate_no || '—';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, COLOR_META);
    doc.text('Quote:', RIGHT_X - 100, headerTop);
    doc.text('Date:', RIGHT_X - 100, headerTop + 11);
    doc.text('Revision:', RIGHT_X - 100, headerTop + 22);
    doc.text('Customer:', RIGHT_X - 100, headerTop + 33);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor.apply(doc, COLOR_BODY);
    var todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.text(String(quoteNo), RIGHT_X, headerTop, { align: 'right' });
    doc.text(todayStr, RIGHT_X, headerTop + 11, { align: 'right' });
    doc.text(String(ctx.revision || '—'), RIGHT_X, headerTop + 22, { align: 'right' });
    doc.text(est.client_name || est.requester_company || 'All Bidders', RIGHT_X, headerTop + 33, { align: 'right' });
    y = headerTop + 50;

    // ─── Project info (below header) ───
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor.apply(doc, COLOR_BODY);
    doc.text(est.name || '', HANG_X, y);
    y += 12;
    if (est.project_address) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, COLOR_SEC);
      var addrLines = String(est.project_address).split('\n');
      addrLines.forEach(function(line) { doc.text(line, HANG_X, y); y += 11; });
    }
    if (est.bid_due_date) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('Bid due: ' + est.bid_due_date, HANG_X, y);
      y += 12;
    }
    y += 8;

    // ─── SCOPE OF WORK (hairline per line, no divider above — first section) ───
    hairline(); y += 8;
    sectionHeader('Scope of Work', false);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, COLOR_BODY);
    var scopeLines = richToText(est.scope_summary)
      .split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    scopeLines.forEach(function(line, idx) {
      var wrapped = doc.splitTextToSize(line, RIGHT_X - BODY_X);
      wrapped.forEach(function(w) { doc.text(w, BODY_X, y); y += 11; });
      y += 4;
      if (idx < scopeLines.length - 1) { hairline(); y += 6; }
    });
    if (!scopeLines.length) {
      doc.setTextColor.apply(doc, COLOR_META);
      doc.text('(No scope entered — add lines in Edit details → Scope of work summary)', BODY_X, y);
      y += 14;
    }
    y += 8;

    // ─── EXCLUSIONS / NOTES (italic, divider above, hairline per line) ───
    sectionHeader('Exclusions / Notes', true);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, COLOR_BODY);
    var exclLines = richToText(est.exclusions || DEFAULT_EXCLUSIONS.join('\n'))
      .split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    exclLines.forEach(function(line, idx) {
      var wrapped = doc.splitTextToSize(line, RIGHT_X - BODY_X);
      wrapped.forEach(function(w) { doc.text(w, BODY_X, y); y += 11; });
      y += 4;
      if (idx < exclLines.length - 1) { hairline(); y += 6; }
    });
    y += 8;

    // Force page 2 if still on page 1 (per template's PageBreakIfPage1 logic)
    if (doc.internal.getCurrentPageInfo().pageNumber === 1) {
      doc.addPage();
      y = 60;
    }

    // ─── TERMS (divider above) ───
    sectionHeader('Terms', true);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, COLOR_BODY);
    var terms = TERMS_TEXT;
    var tw = doc.splitTextToSize(terms, RIGHT_X - BODY_X);
    tw.forEach(function(line) { doc.text(line, BODY_X, y); y += 11; });
    y += 14;

    // ─── BOXED TOTAL (hung at HANG_X, ~3.25" wide, no "TOTAL" label) ───
    var boxW = 234;   // ~3.25"
    var boxH = 42;
    doc.setDrawColor.apply(doc, COLOR_HDR);
    doc.setLineWidth(1.2);
    doc.rect(HANG_X, y, boxW, boxH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor.apply(doc, COLOR_HDR);
    doc.text(money(totals.total), HANG_X + boxW / 2, y + boxH / 2 + 5, { align: 'center' });
    y += boxH + 14;

    // ─── ALTERNATES (optional lines) — one row each, add/deduct amount ───
    var alts = (lines || []).filter(function (l) { return l && l.is_optional; });
    if (alts.length) {
      sectionHeader('Alternates', true);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor.apply(doc, COLOR_BODY);
      alts.forEach(function (l) {
        var r = lineCalc(l, est, totals, groupMultiplier(est, l.group_name));
        var label = doc.splitTextToSize(String(l.description || ''), RIGHT_X - BODY_X - 90)[0] || '';
        doc.text(label, BODY_X, y);
        doc.text(money(r.total), RIGHT_X, y, { align: 'right' });
        y += 12;
        if (y > 740) { doc.addPage(); y = 60; }
      });
      y += 8;
    }

    // ─── FOOTER on every page ───
    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor.apply(doc, COLOR_META);
      doc.text(office.name + ' · bid.(' + (est.name || 'project') + ')  ·  Quote #' + quoteNo,
               HANG_X, 780);
      doc.text('Page ' + p + ' of ' + pageCount, RIGHT_X, 780, { align: 'right' });
      doc.setTextColor.apply(doc, COLOR_BODY);
    }

    // Filename per Kastriot's naming convention: bid.(Project Name).pdf
    var fileName = 'bid.(' + safeFile(est.name) + ').pdf';
    doc.save(fileName);
    toast(fileName + ' downloaded', 'success');
    return fileName;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Export Excel (SheetJS): Group | Cost item | Qty | UoM | Material Cost |
  //  Labor Cost and Overhead | Total Cost  (+ group subtotals + summary block)
  // ─────────────────────────────────────────────────────────────────────────
  function exportXlsx(est, lines, settings, ctx) {
    if (!window.XLSX) { toast('Excel library (xlsx) not loaded — refresh the page', 'error'); return null; }
    var m = compute(est, lines, settings, ctx);
    var S = m.settings, T = m.totals;
    var rows = [];
    rows.push([m.office.name, '', '', '', '', 'Quote', m.quote]);
    rows.push(['Project', m.est.name || '', '', '', '', 'Date', m.date]);
    rows.push([]);
    rows.push(['Group', 'Cost item', 'Qty', 'UoM', 'Material Cost', 'Labor Cost and Overhead', 'Total Cost']);
    m.groups.forEach(function (g) {
      g.rows.forEach(function (r) {
        rows.push([g.name, (r.line.description || '') + (r.taxable ? '' : ' *'), r.qty, r.unit,
                   round2(r.matU), round2(r.labOhU), round2(r.total)]);
      });
      if (S.groupSubtotals || m.groups.length > 1) {
        rows.push([g.name, 'Subtotal ' + g.name, '', '', round2(g.material), round2(g.laborOh), round2(g.total)]);
      }
    });
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['', 'Labor and Overhead', '', '', '', '', round2(T.laborSales + T.preTaxTotal)]);
    rows.push(['', 'Materials', '', '', '', '', round2(T.materialsSales)]);
    rows.push(['', 'Subtotal', '', '', '', '', round2(T.subtotal + T.preTaxTotal)]);
    rows.push(['', 'Labor Tax', '', '', '', '', round2(num(T.taxes.labor && T.taxes.labor.amount))]);
    rows.push(['', 'Material Tax', '', '', '', '', round2(num(T.taxes.materials && T.taxes.materials.amount))]);
    T.postTax.forEach(function (p) { rows.push(['', p.name, '', '', '', '', round2(p.amount)]); });
    rows.push(['', 'Total', '', '', '', '', round2(S.rounding.roundTotal ? Math.round(T.total) : T.total)]);
    if (m.alternates.length) {
      rows.push([]);
      rows.push(['Alternates', 'Alternate', 'Qty', 'UoM', '', '', 'Add / Deduct']);
      m.alternates.forEach(function (r) {
        rows.push(['', r.line.description || '', r.qty, r.unit, '', '', round2(r.total)]);
      });
    }
    if (m.anyUntaxed) { rows.push([]); rows.push(['* Tax not applied to part or subcomponent']); }

    var ws = window.XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 22 }, { wch: 44 }, { wch: 10 }, { wch: 7 }, { wch: 15 }, { wch: 22 }, { wch: 15 }];
    var wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Proposal');
    var fileName = (m.est.quote_number ? 'Q' + m.est.quote_number + '_' : '') + safeFile(m.est.name).replace(/\s+/g, '_') + '_proposal.xlsx';
    window.XLSX.writeFile(wb, fileName);
    toast(fileName + ' downloaded', 'success');
    return fileName;
  }
  function round2(n) { return Math.round(num(n) * 100) / 100; }

    // ─────────────────────────────────────────────────────────────────────────
  //  Rich text for the letter fields (Scope of Work · Exclusions / Notes)
  //  estimates.scope_summary / exclusions hold EITHER plain text (one paragraph per line — the old format, still what an
  //  unformatted field is) OR '<!--nwrich-->' + canonical HTML: <p> / <ul> / <ol><li> blocks whose text may carry <b> <i> <u>
  //  and <span> with color / font-size (pt) / font-family (Arial · Times New Roman · Courier New — the three families the PDF
  //  can draw) only. Everything else a browser or Word adds on edit / paste is dropped by sanitize().
  // ─────────────────────────────────────────────────────────────────────────
  var RICH_TAG = '<!--nwrich-->';
  var RICH_FONTS = { 'arial': 'Arial', 'helvetica': 'Arial', 'times new roman': 'Times New Roman', 'times': 'Times New Roman', 'courier new': 'Courier New', 'courier': 'Courier New' };
  var RICH_SIZES = [7, 8, 8.6, 10, 12, 14, 18];   // pt for <font size="1".."7"> (3 = the letter's normal size, 8.6 pt = 11.5 px)
  var BASE_PT = 8.6;
  function isRich(s) { return typeof s === 'string' && s.indexOf(RICH_TAG) === 0; }
  function rColor(c) {
    c = String(c || '').trim().toLowerCase();
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
    if (m) return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c;
    m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c);
    if (m) return '#' + [m[1], m[2], m[3]].map(function (x) { return ('0' + Math.min(255, +x).toString(16)).slice(-2); }).join('');
    return '';
  }
  function rSize(v) {
    var m = /^([\d.]+)(pt|px)$/.exec(String(v || '').trim().toLowerCase()); if (!m) return 0;
    var pt = m[2] === 'px' ? +m[1] * 0.75 : +m[1];
    return pt >= 6 && pt <= 48 ? Math.round(pt * 10) / 10 : 0;
  }
  function rFont(v) { return RICH_FONTS[String(v || '').split(',')[0].replace(/["']/g, '').trim().toLowerCase()] || ''; }
  function rKey(st) { return [st.b ? 1 : 0, st.i ? 1 : 0, st.u ? 1 : 0, st.c || '', st.s || '', st.f || ''].join('|'); }
  function rPlainStyle(st, baseItalic) { return !st.b && !st.u && !st.c && !(st.s && Math.abs(st.s - BASE_PT) > 0.05) && !(st.f && st.f !== 'Arial') && (baseItalic ? true : !st.i); }

  // HTML (anything a contenteditable / Word / the web produces) → blocks: [{k:'p', runs:[{t,st}|{br}]}, {k:'ul'|'ol', items:[runs…]}]
  function richBlocks(html) {
    var root;
    try { root = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html').body; } catch (e) { return []; }
    var blocks = [], cur = null;
    function flush() {
      if (cur && cur.some(function (r) { return r.br || /\S/.test(r.t); })) {
        while (cur.length && cur[0].t != null && !/\S/.test(cur[0].t)) cur.shift();
        while (cur.length && cur[cur.length - 1].t != null && !/\S/.test(cur[cur.length - 1].t)) cur.pop();
        blocks.push({ k: 'p', runs: cur });
      }
      cur = null;
    }
    function style(n, st) {
      var s = Object.assign({}, st), tag = n.tagName, cs = n.style || {}, v;
      if (tag === 'B' || tag === 'STRONG') s.b = 1;
      if (tag === 'I' || tag === 'EM') s.i = 1;
      if (tag === 'U') s.u = 1;
      if (tag === 'FONT') {
        if ((v = rColor(n.getAttribute('color')))) s.c = v;
        if ((v = rFont(n.getAttribute('face')))) s.f = v;
        var sz = parseInt(n.getAttribute('size'), 10); if (sz >= 1 && sz <= 7) s.s = RICH_SIZES[sz - 1];
      }
      if ((v = rColor(cs.color))) s.c = v;
      if ((v = rSize(cs.fontSize))) s.s = v;
      if ((v = rFont(cs.fontFamily))) s.f = v;
      if (cs.fontWeight) s.b = (cs.fontWeight === 'bold' || cs.fontWeight === 'bolder' || (parseInt(cs.fontWeight, 10) || 400) >= 600) ? 1 : 0;
      if (cs.fontStyle) s.i = /italic|oblique/.test(cs.fontStyle) ? 1 : 0;
      if (/underline/.test(cs.textDecoration || cs.textDecorationLine || '')) s.u = 1;
      return s;
    }
    function inline(n, st) {
      if (n.nodeType === 3) {
        var t = n.nodeValue.replace(/[ ​]/g, ' ').replace(/[\r\n\t ]+/g, ' ');
        if (t) (cur = cur || []).push({ t: t, st: st });
        return;
      }
      if (n.nodeType !== 1) return;
      var tag = n.tagName;
      if (/^(SCRIPT|STYLE|HEAD|META|LINK|TITLE|TEMPLATE)$/.test(tag)) return;
      if (tag === 'BR') { (cur = cur || []).push({ br: true }); return; }
      if (tag === 'UL' || tag === 'OL') { flush(); var items = []; listItems(n, st, items); if (items.length) blocks.push({ k: tag.toLowerCase(), items: items }); return; }
      var s = style(n, st);
      if (/^(DIV|P|H[1-6]|BLOCKQUOTE|PRE|SECTION|ARTICLE|TABLE|TBODY|TR|TD|TH|LI)$/.test(tag)) { flush(); kids(n, s); flush(); return; }
      kids(n, s);
    }
    function kids(n, s) { Array.prototype.forEach.call(n.childNodes, function (c) { inline(c, s); }); }
    function listItems(list, st, items) {
      Array.prototype.forEach.call(list.children, function (li) {
        if (li.tagName !== 'LI') return;
        var s = style(li, st); cur = null;
        Array.prototype.forEach.call(li.childNodes, function (c) {
          if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) {
            if (cur && cur.some(function (r) { return r.br || /\S/.test(r.t); })) { items.push(cur); } cur = null; listItems(c, s, items);
          } else inline(c, s);
        });
        if (cur && cur.some(function (r) { return r.br || /\S/.test(r.t); })) { while (cur.length && cur[0].t != null && !/\S/.test(cur[0].t)) cur.shift(); items.push(cur); }
        cur = null;
      });
    }
    kids(root, {}); flush();
    return blocks;
  }
  function rRunsHtml(runs) {
    var out = '', i = 0;
    while (i < runs.length) {
      var r = runs[i];
      if (r.br) { out += '<br>'; i++; continue; }
      var key = rKey(r.st), t = '';
      while (i < runs.length && !runs[i].br && rKey(runs[i].st) === key) { t += runs[i].t; i++; }
      var st = r.st, inner = esc(t);
      if (st.u) inner = '<u>' + inner + '</u>';
      if (st.i) inner = '<i>' + inner + '</i>';
      if (st.b) inner = '<b>' + inner + '</b>';
      var css = [], cls = '';
      if (st.c) css.push('color:' + st.c);
      if (st.s && Math.abs(st.s - BASE_PT) > 0.05) css.push('font-size:' + st.s + 'pt');
      if (st.f && st.f !== 'Arial') { css.push("font-family:'" + st.f + "'"); cls = st.f === 'Times New Roman' ? 'ff-times' : 'ff-courier'; }
      if (css.length) inner = '<span' + (cls ? ' class="' + cls + '"' : '') + ' style="' + css.join(';') + '">' + inner + '</span>';
      out += inner;
    }
    return out;
  }
  function blocksHtml(blocks) {
    return blocks.map(function (b) {
      return b.k === 'p' ? '<p>' + rRunsHtml(b.runs) + '</p>' : '<' + b.k + '>' + b.items.map(function (it) { return '<li>' + rRunsHtml(it) + '</li>'; }).join('') + '</' + b.k + '>';
    }).join('');
  }
  function richSanitize(html) { return blocksHtml(richBlocks(html)); }
  function runsText(runs) { return runs.map(function (r) { return r.br ? '\n' : r.t; }).join('').replace(/[ \t]*\n[ \t]*/g, '\n').trim(); }
  function blocksText(blocks) {
    var out = [];
    blocks.forEach(function (b) {
      if (b.k === 'p') runsText(b.runs).split('\n').forEach(function (l) { if (l.trim()) out.push(l.trim()); });
      else b.items.forEach(function (it, n) { var t = runsText(it).replace(/\n+/g, ' '); if (t) out.push((b.k === 'ol' ? (n + 1) + '. ' : '- ') + t); });
    });
    return out.join('\n');
  }
  // stored value → plain text lines (for every consumer that cannot show formatting)
  function richToText(s) { return isRich(s) ? blocksText(richBlocks(s.slice(RICH_TAG.length))) : String(s == null ? '' : s); }
  // stored value → paragraphs for the letter / the editor. Plain text: one <p> per non-empty line.
  function richToHtml(s, opts) {
    opts = opts || {};
    if (isRich(s)) return richSanitize(s.slice(RICH_TAG.length));
    return String(s || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return '<p>' + (opts.baseItalic ? '<i>' + esc(x) + '</i>' : esc(x)) + '</p>'; }).join('');
  }
  // editor HTML → value to store. Without any formatting it stays PLAIN text (so an untouched / unformatted field keeps working
  // everywhere); with formatting or lists it becomes '<!--nwrich-->…'.
  function richFromEditor(html, opts) {
    opts = opts || {};
    var blocks = richBlocks(html);
    if (!blocks.length) return '';
    var plain = blocks.every(function (b) { return b.k === 'p' && b.runs.every(function (r) { return r.br || rPlainStyle(r.st, opts.baseItalic) && (!opts.baseItalic || r.st.i || !/\S/.test(r.t)); }); });
    if (plain) return blocksText(blocks);
    return RICH_TAG + blocksHtml(blocks);
  }

  // ── editor: toolbar (font · size · color · B I U · lists · Undo / Redo) + contenteditable ─────────────
  var RICH_SWATCHES = ['#1f2933', '#dc2626', '#1a66e0', '#16a34a', '#d97706', '#7c3aed'];
  function injectRichCss() {
    if (document.getElementById('nwr-style')) return;
    var s = document.createElement('style'); s.id = 'nwr-style';
    var fs = ''; RICH_SIZES.forEach(function (pt, i) { fs += '.nwr-ed font[size="' + (i + 1) + '"]{font-size:' + pt + 'pt}'; });
    s.textContent =
      '.nwr-wrap{border:1px solid #75838a;border-radius:4px;background:#fff;font-size:12px}' +
      '.nwr-wrap.dis{background:#f9fafb}' +
      '.nwr-bar{display:flex;flex-wrap:wrap;gap:3px;align-items:center;padding:5px;border-bottom:1px solid #e5e7eb;background:#f4f5f6;border-radius:4px 4px 0 0}' +
      '.nwr-bar select{height:26px;border:1px solid #cfd5d9;border-radius:3px;background:#fff;font:inherit;font-size:12px;padding:0 2px;max-width:96px}.nwr-bar select[data-f=size]{max-width:66px}' +
      '.nwr-bar button{min-width:26px;height:26px;border:1px solid transparent;border-radius:3px;background:transparent;cursor:pointer;font:inherit;font-size:13px;padding:0 5px;color:#232729}' +
      '.nwr-bar button:hover{background:#e4e7e9}.nwr-bar button:disabled{opacity:.4;cursor:default}' +
      '.nwr-bar .sw{width:16px;min-width:16px;height:16px;border-radius:50%;padding:0;border:1px solid rgba(0,0,0,.2);margin:0 1px}' +
      '.nwr-bar input[type=color]{width:24px;height:24px;padding:0;border:0;background:none;cursor:pointer}' +
      '.nwr-bar .sep{width:1px;height:18px;background:#d6dadc;margin:0 3px}' +
      '.nwr-ed{min-height:150px;max-height:420px;overflow:auto;padding:8px 10px;outline:0;font:11.5px/1.4 Arial,Helvetica,sans-serif;color:#1f2933}' +
      '.nwr-ed:focus{box-shadow:inset 0 0 0 2px #e8f0fe}' +
      '.nwr-ed p{margin:0 0 6px}.nwr-ed ul,.nwr-ed ol{margin:0 0 6px 18px;padding:0}.nwr-ed li{margin:0 0 3px}' +
      '.nwr-ed .ff-times,.nwr-ed font[face*="Times"]{font-family:"Times New Roman",Times,serif}.nwr-ed .ff-courier,.nwr-ed font[face*="Courier"]{font-family:"Courier New",Courier,monospace}' + fs;
    document.head.appendChild(s);
  }
  // wires formatting controls to a contenteditable. ctl = { font, size, color (input), swatches (container), bold, italic, underline, ul, ol, undo, redo, clear } (elements, all optional)
  function wireFormatControls(ed, ctl, onEdit, opts) {
    var saved = null;
    function saveSel() { var sel = window.getSelection(); if (sel && sel.rangeCount && ed.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange(); }
    function restore() { ed.focus(); if (saved) { var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(saved); } }
    document.addEventListener('selectionchange', function () { if (document.activeElement === ed) saveSel(); });
    ed.addEventListener('blur', saveSel); ed.addEventListener('mouseup', saveSel); ed.addEventListener('keyup', saveSel);
    function exec(cmd, val) { restore(); try { document.execCommand('styleWithCSS', false, false); document.execCommand(cmd, false, val == null ? null : val); } catch (e) { console.warn('[nw-proposal] ' + cmd, e); } saveSel(); if (onEdit) onEdit(); }
    function keepFocus(b) { if (b) b.addEventListener('mousedown', function (e) { e.preventDefault(); }); }
    [['bold', 'bold'], ['italic', 'italic'], ['underline', 'underline'], ['ul', 'insertUnorderedList'], ['ol', 'insertOrderedList'], ['undo', 'undo'], ['redo', 'redo']].forEach(function (p) {
      var b = ctl[p[0]]; if (!b) return; keepFocus(b); b.addEventListener('click', function () { exec(p[1]); });
    });
    if (ctl.clear) { keepFocus(ctl.clear); ctl.clear.addEventListener('click', function () { exec('removeFormat'); }); }
    if (ctl.font) ctl.font.addEventListener('change', function () { if (this.value) exec('fontName', this.value); this.selectedIndex = 0; });
    if (ctl.size) ctl.size.addEventListener('change', function () { if (this.value) exec('fontSize', this.value); this.selectedIndex = 0; });
    if (ctl.color) { ctl.color.addEventListener('input', function () { exec('foreColor', this.value); }); }
    if (ctl.swatches) Array.prototype.forEach.call(ctl.swatches.querySelectorAll('[data-c]'), function (b) { keepFocus(b); b.addEventListener('click', function () { exec('foreColor', b.getAttribute('data-c')); }); });
    ed.addEventListener('focus', function () { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {} });
    // paste: keep the formatting that survives sanitize() (colors, sizes, fonts, bold…), drop everything else Word / web pages bring
    if (!(opts && opts.noPaste)) ed.addEventListener('paste', function (e) {
      var cd = e.clipboardData; if (!cd) return;
      e.preventDefault();
      var h = cd.getData('text/html'), t = cd.getData('text/plain');
      var out = h ? richSanitize(h) : String(t || '').split(/\r?\n/).filter(function (x) { return x.trim(); }).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('');
      if (out) { document.execCommand('insertHTML', false, out); if (onEdit) onEdit(); }
    });
    return { exec: exec, restore: restore };
  }
  function richEditor(host, opts) {
    opts = opts || {};
    injectRichCss();
    var dis = !!opts.disabled;
    host.innerHTML =
      '<div class="nwr-wrap' + (dis ? ' dis' : '') + '"><div class="nwr-bar">' +
        '<select data-f="font" title="Font"><option value="">Font</option><option>Arial</option><option>Times New Roman</option><option>Courier New</option></select>' +
        '<select data-f="size" title="Size"><option value="">Size</option><option value="1">7 pt</option><option value="2">8 pt</option><option value="3">Normal</option><option value="4">10 pt</option><option value="5">12 pt</option><option value="6">14 pt</option><option value="7">18 pt</option></select>' +
        '<span class="sep"></span><button type="button" data-f="bold" title="Bold (Ctrl+B)"><b>B</b></button><button type="button" data-f="italic" title="Italic (Ctrl+I)"><i>I</i></button><button type="button" data-f="underline" title="Underline (Ctrl+U)"><u>U</u></button>' +
        '<span class="sep"></span><button type="button" data-f="ul" title="Bulleted list">&bull;&ndash;</button><button type="button" data-f="ol" title="Numbered list">1.</button>' +
        '<span class="sep"></span><span data-f="swatches">' + RICH_SWATCHES.map(function (c) { return '<button type="button" class="sw" data-c="' + c + '" style="background:' + c + '" title="Text color"></button>'; }).join('') + '</span><input type="color" data-f="color" value="#1f2933" title="Any text color">' +
        '<span class="sep"></span><button type="button" data-f="undo" title="Undo (Ctrl+Z)">&#8630;</button><button type="button" data-f="redo" title="Redo (Ctrl+Y)">&#8631;</button><button type="button" data-f="clear" title="Clear formatting of the selection">T<sub style="font-size:9px">x</sub></button>' +
      '</div><div class="nwr-ed" contenteditable="' + (dis ? 'false' : 'true') + '" spellcheck="true"' + (opts.placeholder ? ' data-placeholder="' + esc(opts.placeholder) + '"' : '') + '></div></div>';
    var ed = host.querySelector('.nwr-ed'), q = function (f) { return host.querySelector('[data-f="' + f + '"]'); };
    var timer = null;
    function fire() { if (opts.onChange && !dis) opts.onChange(getValue()); }
    function schedule() { clearTimeout(timer); timer = setTimeout(fire, opts.delay || 700); }
    function getValue() { return richFromEditor(ed.innerHTML, { baseItalic: opts.baseItalic }); }
    function setValue(v) { ed.innerHTML = richToHtml(v, { baseItalic: opts.baseItalic }) || '<p><br></p>'; }
    setValue(opts.value);
    if (dis) host.querySelectorAll('.nwr-bar select, .nwr-bar button, .nwr-bar input').forEach(function (x) { x.disabled = true; });
    else {
      wireFormatControls(ed, { font: q('font'), size: q('size'), color: q('color'), swatches: q('swatches'), bold: q('bold'), italic: q('italic'), underline: q('underline'), ul: q('ul'), ol: q('ol'), undo: q('undo'), redo: q('redo'), clear: q('clear') }, schedule);
      ed.addEventListener('input', schedule);
      ed.addEventListener('blur', function () { clearTimeout(timer); fire(); });
    }
    return { el: ed, getValue: getValue, setValue: setValue, flush: function () { clearTimeout(timer); fire(); } };
  }

  // ─────────────────────────────────────────────────────────────────────────
  window.NWProposal = {
    OFFICES: OFFICES,
    DEFAULT_EXCLUSIONS: DEFAULT_EXCLUSIONS,
    R410A_NOTES: R410A_NOTES,
    TERMS_TEXT: TERMS_TEXT,
    buildScope: buildScope,
    hasR410a: hasR410a,
    CATEGORIES: CATEGORIES,
    PAPER_CSS: PAPER_CSS,
    defaultSettings: defaultSettings,
    mergeSettings: mergeSettings,
    officeFor: officeFor,
    compute: compute,
    lineCalc: lineCalc,
    totalsOf: totalsOf,
    render: render,
    exportPdf: exportPdf,
    vectorPdf: vectorPdf,   // text PDF of a sheet (used by exportPdf; exposed for checks)
    exportLetter: exportLetter,
    exportXlsx: exportXlsx,
    rich: { TAG: RICH_TAG, isRich: isRich, toText: richToText, toHtml: richToHtml, sanitize: richSanitize, fromEditor: richFromEditor, editor: richEditor, wire: wireFormatControls },
    money: money,
    qty: qtyFmt,
    pct: pctFmt
  };
})();
