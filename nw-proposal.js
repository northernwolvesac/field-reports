// nw-proposal.js — Procore-style proposal renderer + exports for the NW estimating module.
// window.NWProposal = { OFFICES, DEFAULT_EXCLUSIONS, defaultSettings, mergeSettings, compute,
//                       render, exportPdf, exportLetter, exportXlsx }
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
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
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
    '.nwp-lines.ex p{font-style:italic}' +
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
    var scope = (e.scope_summary && String(e.scope_summary).trim()) ? clean(e.scope_summary) : buildScope(e, m.lines);
    var excl = clean(m.exclusions);
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

    h += '<div class="nwp-h">Scope of Work</div><div class="nwp-lines">';
    scope.forEach(function (t) { h += '<p>' + esc(t) + '</p>'; });
    h += '</div>';

    h += '<div class="nwp-h">Exclusions / Notes</div><div class="nwp-lines ex">';
    excl.forEach(function (t) { h += '<p>' + esc(t) + '</p>'; });
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
    if (scope) h += '<p class="nwp-scope">' + nl2br(scope) + '</p>';

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
    h += '<h4>Exclusions</h4><p>' + nl2br(m.exclusions) + '</p>';
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
  function exportPdf(paperEl, opts) {
    opts = opts || {};
    if (typeof window.html2pdf !== 'function') {
      toast('PDF library (html2pdf) not loaded — refresh the page', 'error');
      return Promise.reject(new Error('html2pdf not loaded'));
    }
    if (typeof paperEl === 'string') paperEl = document.querySelector(paperEl);
    if (!paperEl) return Promise.reject(new Error('exportPdf: paper element not found'));
    var filename = opts.filename || 'proposal.pdf';
    if (!/\.pdf$/i.test(filename)) filename += '.pdf';

    var worker = window.html2pdf().set({
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(paperEl);

    return worker.outputPdf('arraybuffer').then(function (ab) {
      var bytes = new Uint8Array(ab);
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
    var scopeLines = String(est.scope_summary || '')
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
    var exclLines = String(est.exclusions || DEFAULT_EXCLUSIONS.join('\n'))
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
    exportLetter: exportLetter,
    exportXlsx: exportXlsx,
    money: money,
    qty: qtyFmt,
    pct: pctFmt
  };
})();
