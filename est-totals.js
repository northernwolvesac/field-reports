// One cost formula for every estimating page (estimating.html, bid-project.html, takeoff.html,
// ai-estimator.html, nw-proposal.js, PC.estStrip). No dependencies — never requires PC.
//
// FORMULA CONTRACT (Procore Estimating shape — everyone uses these words):
//   line labor cost   = hours × labor rate            (hours = Total Quantity × Unit Labor Time × Difficulty Factor)
//   line labor sales  = hours × labor SALES rate × (1 + labor markup)   (sales rate = settings.labor_sales_rate,
//                       falls back to the labor cost rate when the setting is empty / 0 → sales = cost)
//   line Total Sales  = Subtotal Item Sales + Total Labor Sales
//   Subtotal          = Σ line Total Sales             (optional / alternate lines excluded everywhere)
//   Pre-Tax Markups   = on Subtotal: Overhead (20 %, 30 % OFCI), Miscellaneous (2 %), + settings.markups stage 'pre'
//   Taxes             = Materials Tax (8.875 % NY) on taxable material sales + Labor Tax (settings.labor_tax_rate, 0)
//                       (taxable material sales = Σ line taxableSales of EVERY non-optional line, whatever its cost type,
//                        so a wet-tap / services line with is_taxable = true is taxed like the grid says)
//   Post-Tax Markups  = settings.markups stage 'post' on Subtotal + Pre-Tax + Taxes
//   Estimate Total    = Subtotal + Pre-Tax + Taxes + Post-Tax        (bidPrice === total)
//
// Kastriot's Cost Breakdown Template maps onto it 1:1 (legacy keys are kept for every old caller):
//   Equipment/Material           = equipment quotes + ductwork material + piping material    → materialTotal
//     (legacy bucket — the TAX BASE is taxes.materials.taxableSales, which honours line.is_taxable)
//   Labor              (untaxed) = hours × rate on every ML line                              → labor / laborHours
//   Wet-tap            (untaxed) = every wet-tap line (cost type S = subcontractor)           → wetTap
//   Services           (untaxed) = shop drawings, TAB, rigging, crane… (cost type O = other)  → services
//   Base Subtotal = Subtotal; Overhead / Miscellaneous = Pre-Tax; Sales Tax = Materials Tax; PROJECT TOTAL = Estimate Total
//
// Line columns read: category, quantity, unit, unit_material_cost, unit_labor_hours, labor_crew_type, is_wet_tap,
//   is_optional, group_name, and (procore-ui-schema.sql, all optional / nullable) waste_pct, markup_pct,
//   labor_markup_pct, labor_factor, labor_rate, is_taxable.  Percent columns are FRACTIONS (0.05 = 5 %), the same
//   convention as estimates.overhead_pct / tax_rate.  (Takeoff layers and est_catalog_items store waste_pct as a
//   whole percent — divide by 100 when rolling a layer / catalog item into a line.  Safety net: a line waste_pct
//   greater than 1 is treated as a whole percent (5 → 0.05) so a mis-scaled row cannot multiply the estimate.)
// TAKEOFF-LINKED LINES (layer_id set): takeoff.html syncLayerLines() owns quantity, unit, unit_material_cost (layer
//   waste already baked in), unit_labor_hours (layer labor_factor already baked in), group_name, description, category,
//   catalog_item_id and notes, and rewrites them after every takeoff change; those lines keep waste_pct / labor_factor
//   NULL and estimating.html shows the columns read-only for them (LAYER_FIELDS). Markups, labor_rate, is_taxable,
//   vendor fields and flags stay editable on the estimate side.
// Estimate columns read: labor_rate, overhead_pct, miscellaneous_pct, tax_rate, is_ofci, square_footage, settings
//   (JSONB or JSON string): markups[] {id,name,type:'basic'|'compound'|'lump',pct,amount,stage:'pre'|'post'},
//   labor_tax_rate, labor_sales_rate, manual_groups[] {name,multiplier} (or {name:{multiplier}}),
//   es_settings { individual_labor_rates, round_ea, count_install_material } — booleans (true or 'true' count as on):
//     individual_labor_rates  per-line labor_rate replaces the global labor cost rate
//     round_ea                Total Quantity of 'ea' lines is rounded to a whole number BEFORE pricing (Procore)
//     count_install_material  material on disconnects / equipment_install / air_outlets lines is priced (Procore:
//                             material is material) and is taxable by default.  Default OFF = legacy behaviour:
//                             that material is dropped from Subtotal (the line reports materialDropped: true).
//                             Turning it on re-prices every estimate rolled up from a takeoff with priced
//                             diffusers / VAVs / dampers — flip it only with Russ's sign-off.
// laborBreakdown counts hours by labor_crew_type only for the four known crews; a line with a null / '' crew is
//   priced but not counted in any crew bucket (same as the pre-Procore formula).
//
// UNIT TEST (defaults: labor 60, overhead 20 %, misc 2 %, tax 8.875 %; no waste / markup / factor / extra markups):
//   A  equipment  qty 2  unit_material_cost 1000  unit_labor_hours 4   → material 2000, 8 hrs, labor 480
//   B  pipework   qty 1  unit_material_cost 500   unit_labor_hours 10  is_wet_tap → wetTap 500 + 600 = 1100
//   C  services   qty 1  unit_material_cost 1500  unit_labor_hours 0   → services 1500
//   nwEstTotals([A,B,C], {})  →  materialTotal 2000 · labor 480 · laborHours 8 · wetTap 1100 · services 1500
//     baseSubtotal 5080 · overhead 1016 · miscellaneous 101.60 · tax 177.50 · bidPrice = total = 6375.10
//   (identical to the pre-Procore formula; see scratchpad/new/est-totals.test.js)
(function () {
  var TAXABLE_CATS = { equipment: true, ductwork: true, pipework: true };
  var KNOWN_CREWS = { sm: true, pipe: true, startup: true, other: true };

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  // an empty setting falls back to the company standard; an explicit 0 stays 0
  function pct(v, def) { return (v === null || v === undefined || v === '') ? def : num(v); }
  // es_settings flags arrive as JSONB booleans, but a form may have stored the string 'true' / 'false'
  function flag(v) { return v === true || v === 'true'; }

  function nwEstRates(est) {
    est = est || {};
    return {
      labor: Number(est.labor_rate || 60),
      overhead: pct(est.overhead_pct, est.is_ofci ? 0.30 : 0.20),
      misc: pct(est.miscellaneous_pct, 0.02),
      tax: pct(est.tax_rate, 0.08875)
    };
  }

  // estimates.settings may arrive as JSONB object, JSON string, null or garbage — always returns an object
  function nwEstSettings(est) {
    var s = est && est.settings;
    if (typeof s === 'string') { try { s = JSON.parse(s); } catch (e) { s = null; } }
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = {};
    return s;
  }

  // Global labor SALES rate (settings.labor_sales_rate); falls back to the labor cost rate (sales = cost)
  function laborSalesRate(settings, rates) {
    var v = num(settings && settings.labor_sales_rate);
    return v > 0 ? v : rates.labor;
  }

  // Group multiplier from settings.manual_groups — accepts [{name, multiplier}] or {name: {multiplier}} / {name: n}
  function nwGroupMultiplier(est, groupName) {
    if (!groupName) return 1;
    var mg = nwEstSettings(est).manual_groups, m = null;
    if (Array.isArray(mg)) {
      for (var i = 0; i < mg.length; i++) { if (mg[i] && mg[i].name === groupName) { m = mg[i].multiplier; break; } }
    } else if (mg && typeof mg === 'object' && mg[groupName] != null) {
      m = (typeof mg[groupName] === 'object') ? mg[groupName].multiplier : mg[groupName];
    }
    m = (m === null || m === undefined || m === '') ? 1 : num(m);
    return m > 0 ? m : 1;
  }

  // Every Procore grid column for one line. ctx: {groupMultiplier, rates, settings} (rates/settings are optional caches).
  function nwLineTotals(line, est, ctx) {
    line = line || {}; est = est || {}; ctx = ctx || {};
    var rates = ctx.rates || nwEstRates(est);
    var settings = ctx.settings || nwEstSettings(est);
    var es = settings.es_settings || {};
    var cat = line.category || '';
    var wet = !!line.is_wet_tap;
    var unit = String(line.unit || '');
    var costType = wet ? 'S' : (cat === 'services' ? 'O' : 'ML');
    var installCat = costType === 'ML' && !TAXABLE_CATS[cat];   // disconnects / equipment_install / air_outlets
    var countInstall = flag(es.count_install_material);
    var materialDropped = installCat && !countInstall;

    var qty = num(line.quantity);
    var gm = (ctx.groupMultiplier === null || ctx.groupMultiplier === undefined) ? 1 : num(ctx.groupMultiplier) || 1;
    var totalQty = qty * gm;
    if (flag(es.round_ea) && /^ea$/i.test(unit.trim())) totalQty = Math.round(totalQty);

    var unitCost = num(line.unit_material_cost);
    var pricedUnitCost = materialDropped ? 0 : unitCost;   // legacy: install-category material is not priced
    var wastePct = num(line.waste_pct);
    if (wastePct > 1) wastePct = wastePct / 100;           // whole percent slipped through (catalog / layer scale)
    var subtotalItemCost = totalQty * pricedUnitCost * (1 + wastePct);
    var markupPct = num(line.markup_pct);
    var unitSales = pricedUnitCost * (1 + markupPct);
    var subtotalItemSales = subtotalItemCost * (1 + markupPct);
    var profit = subtotalItemSales - subtotalItemCost;

    var unitLaborTime = num(line.unit_labor_hours);
    var indiv = flag(es.individual_labor_rates);
    var laborRate = (indiv && num(line.labor_rate) > 0) ? num(line.labor_rate) : rates.labor;
    var globalSalesRate = num(settings.labor_sales_rate);
    var salesRate = globalSalesRate > 0 ? globalSalesRate : laborRate;   // no setting → sales rate = this line's cost rate
    var difficulty = num(line.labor_factor) || 1;
    var totalLaborTime = totalQty * unitLaborTime * difficulty;
    var laborCost = totalLaborTime * laborRate;
    var laborMarkupPct = num(line.labor_markup_pct);
    var totalLaborSales = totalLaborTime * salesRate * (1 + laborMarkupPct);
    var laborProfit = totalLaborSales - laborCost;

    var totalSales = subtotalItemSales + totalLaborSales;
    var totalCost = subtotalItemCost + laborCost;
    // default taxable rule: equipment / ductwork / pipework material, not wet-tap; install-category material joins
    // the rule once it is priced (count_install_material) — NY sales tax applies to diffusers / grilles / dampers
    var defaultTaxable = !wet && (!!TAXABLE_CATS[cat] || (installCat && countInstall));
    var taxable = (line.is_taxable !== null && line.is_taxable !== undefined) ? !!line.is_taxable : defaultTaxable;
    var crew = String(line.labor_crew_type || '');

    return {
      qty: qty, totalQty: totalQty, groupMultiplier: gm, unit: unit,
      unitCost: unitCost, wastePct: wastePct, subtotalItemCost: subtotalItemCost,
      markupPct: markupPct, marginPct: subtotalItemSales > 0 ? profit / subtotalItemSales : 0,
      unitSales: unitSales, subtotalItemSales: subtotalItemSales, profit: profit,
      unitLaborTime: unitLaborTime, laborRate: laborRate, laborSalesRate: salesRate, difficulty: difficulty,
      totalLaborTime: totalLaborTime, laborCost: laborCost, laborMarkupPct: laborMarkupPct,
      laborMarginPct: totalLaborSales > 0 ? laborProfit / totalLaborSales : 0,
      totalLaborSales: totalLaborSales, laborProfit: laborProfit,
      totalSales: totalSales, totalCost: totalCost, totalProfit: totalSales - totalCost,
      costType: costType, category: cat, crew: crew,
      // Procore cost-type buckets (only one of the three is non-zero, + labor for ML lines)
      materialCost: (costType === 'ML' && TAXABLE_CATS[cat]) ? subtotalItemCost : 0,   // equipment / ductwork / pipework material
      otherMaterialCost: installCat ? subtotalItemCost : 0,                            // priced install-line material (0 unless count_install_material)
      materialDropped: materialDropped,                                                // install material present in the line but not priced
      droppedMaterialCost: materialDropped ? totalQty * unitCost * (1 + wastePct) : 0,
      subcontractorCost: costType === 'S' ? totalCost : 0,
      otherCost: costType === 'O' ? totalCost : 0,
      taxable: taxable,
      taxableSales: taxable ? subtotalItemSales : 0,
      isOptional: !!line.is_optional
    };
  }

  // amount of one markup row against a base (basic = base × pct, compound = (base + earlier rows) × pct, lump = amount)
  function markupAmount(m, base, earlier) {
    var type = m.type || 'basic';
    if (type === 'lump') return num(m.amount);
    var p = num(m.pct);
    if (type === 'compound') return (base + earlier) * p;
    return base * p;
  }

  function nwEstTotals(lines, est) {
    est = est || {};
    var r = nwEstRates(est);
    var settings = nwEstSettings(est);

    var equipMat = 0, ductMat = 0, pipeMat = 0, otherMat = 0, droppedMat = 0;
    var labor = 0, laborHours = 0, laborRawHours = 0, laborSales = 0;
    var matCost = 0, matSales = 0, matBase = 0, matWaste = 0, taxableSales = 0;
    var wetTap = 0, wetTapSales = 0, services = 0, servicesSales = 0;
    var subtotal = 0, count = 0, optionalTotal = 0;
    var breakdown = { sm: 0, pipe: 0, startup: 0, other: 0 };

    (lines || []).forEach(function (li) {
      if (!li) return;
      var lt = nwLineTotals(li, est, { rates: r, settings: settings, groupMultiplier: nwGroupMultiplier(est, li.group_name) });
      if (li.is_optional) { optionalTotal += lt.totalSales; return; }
      count++;
      subtotal += lt.totalSales;
      taxableSales += lt.taxableSales;   // every cost type — a taxable wet-tap / services line is taxed too

      if (lt.costType === 'S') { wetTap += lt.subcontractorCost; wetTapSales += lt.totalSales; return; }
      if (lt.costType === 'O') { services += lt.otherCost; servicesSales += lt.totalSales; return; }

      // ML lines: material + labor
      if (lt.category === 'equipment') equipMat += lt.materialCost;
      else if (lt.category === 'ductwork') ductMat += lt.materialCost;
      else if (lt.category === 'pipework') pipeMat += lt.materialCost;
      else { otherMat += lt.otherMaterialCost; droppedMat += lt.droppedMaterialCost; }   // disconnects / equipment_install / air_outlets
      matCost += lt.subtotalItemCost;
      matSales += lt.subtotalItemSales;
      matBase += lt.totalQty * (lt.materialDropped ? 0 : lt.unitCost);
      matWaste += lt.totalQty * (lt.materialDropped ? 0 : lt.unitCost) * lt.wastePct;

      labor += lt.laborCost;
      laborHours += lt.totalLaborTime;
      laborRawHours += lt.totalQty * lt.unitLaborTime;
      laborSales += lt.totalLaborSales;
      if (KNOWN_CREWS[lt.crew]) breakdown[lt.crew] += lt.totalLaborTime;
    });

    // equipment + ductwork + pipework material (legacy bucket; the tax base is taxes.materials.taxableSales)
    var materialTotal = equipMat + ductMat + pipeMat;

    // ── Pre-Tax markups on Subtotal ──
    var preTax = [
      { id: 'overhead', name: 'Overhead' + (est.is_ofci ? ' (OFCI)' : ''), type: 'basic', pct: r.overhead, amount: subtotal * r.overhead, builtin: true },
      { id: 'misc', name: 'Miscellaneous', type: 'basic', pct: r.misc, amount: subtotal * r.misc, builtin: true }
    ];
    var preTaxTotal = preTax[0].amount + preTax[1].amount;
    var markups = Array.isArray(settings.markups) ? settings.markups : [];
    markups.forEach(function (m) {
      if (!m || (m.stage || 'pre') !== 'pre') return;
      var amt = markupAmount(m, subtotal, preTaxTotal);
      preTax.push({ id: m.id || m.name, name: m.name || 'Untitled markup', type: m.type || 'basic', pct: num(m.pct), amount: amt, builtin: false });
      preTaxTotal += amt;
    });

    // ── Taxes ──
    var laborTaxPct = num(settings.labor_tax_rate);
    var taxes = {
      labor: { pct: laborTaxPct, amount: laborSales * laborTaxPct },
      materials: { pct: r.tax, amount: taxableSales * r.tax, taxableSales: taxableSales }
    };
    taxes.total = taxes.labor.amount + taxes.materials.amount;

    // ── Post-Tax markups on Subtotal + Pre-Tax + Taxes ──
    var postBase = subtotal + preTaxTotal + taxes.total;
    var postTax = [], postTaxTotal = 0;
    markups.forEach(function (m) {
      if (!m || m.stage !== 'post') return;
      var amt = markupAmount(m, postBase, postTaxTotal);
      postTax.push({ id: m.id || m.name, name: m.name || 'Untitled markup', type: m.type || 'basic', pct: num(m.pct), amount: amt, builtin: false });
      postTaxTotal += amt;
    });

    var total = subtotal + preTaxTotal + taxes.total + postTaxTotal;
    var sqft = num(est.square_footage);

    var summary = {
      labor: {
        hours: laborHours,
        factor: laborRawHours > 0 ? laborHours / laborRawHours : 1,
        waste: 0,
        cost: labor,
        markupPct: labor > 0 ? (laborSales - labor) / labor : 0,
        sales: laborSales,
        profit: laborSales - labor,
        rate: r.labor,                          // global labor cost rate
        salesRate: laborSalesRate(settings, r)  // global labor sales rate (= rate when settings.labor_sales_rate is empty)
      },
      materials: {
        cost: matCost,
        waste: matBase > 0 ? matWaste / matBase : 0,
        markupPct: matCost > 0 ? (matSales - matCost) / matCost : 0,
        sales: matSales,
        profit: matSales - matCost,
        dropped: droppedMat                     // install-line material left out of pricing (count_install_material off)
      },
      subcontractor: { cost: wetTap, sales: wetTapSales, profit: wetTapSales - wetTap },
      services: { cost: services, sales: servicesSales, profit: servicesSales - services },
      subtotal: subtotal
    };

    return {
      // ── legacy keys (Kastriot's template) — unchanged for every existing caller ──
      equipmentMaterial: equipMat, ductworkMaterial: ductMat, pipeworkMaterial: pipeMat,
      materialTotal: materialTotal, otherMaterial: otherMat, droppedMaterial: droppedMat,
      labor: labor, laborHours: laborHours, laborBreakdown: breakdown, laborRate: r.labor,
      wetTap: wetTap, services: services,
      baseSubtotal: subtotal,
      overhead: preTax[0].amount, miscellaneous: preTax[1].amount,
      tax: taxes.total, materialsTax: taxes.materials.amount, laborTax: taxes.labor.amount,
      extraMarkups: (preTaxTotal - preTax[0].amount - preTax[1].amount) + postTaxTotal,
      bidPrice: total,
      rates: r, settings: settings,
      // legacy aliases for existing callers
      material: materialTotal, baseCost: subtotal,
      // ── Procore-shaped block ──
      summary: summary,
      preTax: preTax, preTaxTotal: preTaxTotal,
      taxes: taxes,
      postTax: postTax, postTaxTotal: postTaxTotal,
      subtotal: subtotal,
      total: total,
      perSqFt: sqft > 0 ? total / sqft : null,
      squareFootage: sqft > 0 ? sqft : null,
      count: count,
      optionalTotal: optionalTotal
    };
  }

  // Sums of every $ / hrs column for a group row or the grid footer.
  // mult: a number (explicit group multiplier) or ctx {groupMultiplier, includeOptional}. Without it each line
  // uses its own group's multiplier from est.settings.manual_groups.
  function nwGroupTotals(lines, est, mult) {
    est = est || {};
    var ctx = (mult && typeof mult === 'object') ? mult : { groupMultiplier: mult };
    var r = nwEstRates(est), settings = nwEstSettings(est);
    var g = {
      qty: 0, totalQty: 0,
      subtotalItemCost: 0, subtotalItemSales: 0, profit: 0,
      totalLaborTime: 0, laborCost: 0, totalLaborSales: 0, laborProfit: 0,
      totalSales: 0, totalCost: 0, totalProfit: 0,
      materialCost: 0, subcontractorCost: 0, otherCost: 0, taxableSales: 0,
      count: 0, uom: ''
    };
    var units = {};
    (lines || []).forEach(function (li) {
      if (!li) return;
      if (li.is_optional && !ctx.includeOptional) return;
      var gm = (ctx.groupMultiplier === null || ctx.groupMultiplier === undefined) ? nwGroupMultiplier(est, li.group_name) : ctx.groupMultiplier;
      var lt = nwLineTotals(li, est, { rates: r, settings: settings, groupMultiplier: gm });
      g.qty += lt.qty; g.totalQty += lt.totalQty;
      g.subtotalItemCost += lt.subtotalItemCost; g.subtotalItemSales += lt.subtotalItemSales; g.profit += lt.profit;
      g.totalLaborTime += lt.totalLaborTime; g.laborCost += lt.laborCost; g.totalLaborSales += lt.totalLaborSales; g.laborProfit += lt.laborProfit;
      g.totalSales += lt.totalSales; g.totalCost += lt.totalCost; g.totalProfit += lt.totalProfit;
      g.materialCost += lt.materialCost + lt.otherMaterialCost; g.subcontractorCost += lt.subcontractorCost; g.otherCost += lt.otherCost;
      g.taxableSales += lt.taxableSales;
      g.count++;
      var u = String(li.unit || '').trim().toLowerCase();
      if (u) units[u] = true;   // blank units do not make a group 'Mixed'
    });
    var keys = Object.keys(units);
    g.uom = keys.length === 0 ? '' : keys.length === 1 ? keys[0] : 'Mixed';
    g.marginPct = g.subtotalItemSales > 0 ? g.profit / g.subtotalItemSales : 0;
    g.markupPct = g.subtotalItemCost > 0 ? g.profit / g.subtotalItemCost : 0;
    g.laborMarkupPct = g.laborCost > 0 ? g.laborProfit / g.laborCost : 0;
    return g;
  }

  // Dependency-free money formatter (same output as PC.money): '$1,234.56' / '-$1,234.56'
  function nwEstMoney(n, decimals) {
    var d = (decimals === null || decimals === undefined) ? 2 : decimals;
    var v = num(n);
    var s = Math.abs(v).toFixed(d);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (v < 0 ? '-$' : '$') + parts.join('.');
  }

  window.nwEstRates = nwEstRates;
  window.nwEstSettings = nwEstSettings;
  window.nwGroupMultiplier = nwGroupMultiplier;
  window.nwLineTotals = nwLineTotals;
  window.nwEstTotals = nwEstTotals;
  window.nwGroupTotals = nwGroupTotals;
  window.nwEstMoney = nwEstMoney;
})();
