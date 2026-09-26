// One cost formula for every estimating page (estimating.html, bid-project.html).
// Kastriot's Cost Breakdown Template — 4 base components + overhead + misc + tax:
//   Equipment/Material (TAXABLE) = equipment quotes + ductwork material + piping material
//   Labor              (untaxed) = disconnects + ductwork lab + pipework lab + eqp install + air outlets
//   Wet-tap            (untaxed) = every wet-tap line (in Piping section)
//   Services           (untaxed) = shop drawings + TAB + rigging + crane + scaffolding
//   Base Subtotal      = sum of the 4 above
//   Overhead           = Base Subtotal × 20% (30% if OFCI)
//   Miscellaneous      = Base Subtotal × 2%   (peer to overhead, never compounded)
//   Sales Tax          = Equipment/Material × 8.875% (NY)
//   PROJECT TOTAL      = Base Subtotal + Overhead + Miscellaneous + Sales Tax
// Lines need: category, quantity, unit_material_cost, unit_labor_hours, labor_crew_type, is_wet_tap, is_optional.
(function () {
  // an empty setting falls back to the company standard; an explicit 0 stays 0
  function pct(v, def) { return (v === null || v === undefined || v === '') ? def : Number(v); }

  function nwEstRates(est) {
    est = est || {};
    return {
      labor: Number(est.labor_rate || 60),
      overhead: pct(est.overhead_pct, est.is_ofci ? 0.30 : 0.20),
      misc: pct(est.miscellaneous_pct, 0.02),
      tax: pct(est.tax_rate, 0.08875)
    };
  }

  function nwEstTotals(lines, est) {
    var r = nwEstRates(est);
    var equipMat = 0, ductMat = 0, pipeMat = 0, labor = 0, laborHours = 0, wetTap = 0, services = 0;
    var breakdown = { sm: 0, pipe: 0, startup: 0, other: 0 };

    (lines || []).forEach(function (li) {
      if (li.is_optional) return;
      var q = Number(li.quantity || 0);
      var mat = q * Number(li.unit_material_cost || 0);
      var hrs = q * Number(li.unit_labor_hours || 0);
      var lab = hrs * r.labor;

      if (li.is_wet_tap) wetTap += mat + lab;               // subcontract line, flat cost
      else if (li.category === 'equipment') equipMat += mat;
      else if (li.category === 'ductwork') ductMat += mat;
      else if (li.category === 'pipework') pipeMat += mat;
      else if (li.category === 'services') services += mat + lab;   // services use material $ as the line amount
      // disconnects / equipment_install / air_outlets: material typically 0

      if (!li.is_wet_tap && li.category !== 'services') {
        labor += lab;
        laborHours += hrs;
        if (breakdown[li.labor_crew_type] != null) breakdown[li.labor_crew_type] += hrs;
      }
    });

    var materialTotal = equipMat + ductMat + pipeMat;   // TAXABLE base
    var baseSubtotal = materialTotal + labor + wetTap + services;
    var overhead = baseSubtotal * r.overhead;
    var misc = baseSubtotal * r.misc;
    var tax = materialTotal * r.tax;
    return {
      equipmentMaterial: equipMat, ductworkMaterial: ductMat, pipeworkMaterial: pipeMat,
      materialTotal: materialTotal,
      labor: labor, laborHours: laborHours, laborBreakdown: breakdown, laborRate: r.labor,
      wetTap: wetTap, services: services,
      baseSubtotal: baseSubtotal, overhead: overhead, miscellaneous: misc, tax: tax,
      bidPrice: baseSubtotal + overhead + misc + tax,
      rates: r,
      // legacy aliases for existing callers
      material: materialTotal, baseCost: baseSubtotal
    };
  }

  window.nwEstRates = nwEstRates;
  window.nwEstTotals = nwEstTotals;
})();
