/* nw-standards.js — industry-standard defaults for the Engineer's read (2026-10-27)
   The specifications and the drawing notes ALWAYS rule; these tables are what an HVAC engineer assumes when the bid documents are silent,
   so every take-off line can carry material, insulation, hangers and anchors instead of a bare length.
   Sources (summaries — NOT the licensed books; Russ uploads MCAA / SMACNA manuals to the knowledge library for exact figures):
     MSS SP-58 / SP-69 (pipe hangers, supports, spacing), ASME B31.1 Table 121.5, MCAA Labor Estimating Manual groupings,
     SMACNA HVAC Duct Construction Standards ch. 5 (hangers & supports), ASHRAE 90.1 Table 6.8.3-1 (pipe insulation), IMC / NYC Mechanical Code.
   Every figure is a DEFAULT with verify:true until Russ (or the spec) confirms it. Nothing here changes prices — it feeds notes and the breakdown.

   window.NWStd = {
     sizeIn(text)                       → nominal pipe size in inches (number) from "1-1/2\"", "2 1/2 in", "3/4", or null
     pipeMaterialDefault(service)       → { material, joints, basis }
     pipeHanger(material, size)         → { spacing_ft, rod_in, basis }
     pipeInsulationDefault(service, size) → { type, thickness_in, jacket, basis } or null (not insulated)
     ductHanger(kind)                   → { spacing_ft, hanger, rod_in, basis }
     anchorDefault(structure)           → { type, basis }
     serviceInfo(code)                  → { name, temp_f, kind }
     breakdown(lines, spec)             → { pipes:[…], ducts:[…], totals:{…}, notes:[…] }   lines = session.result.engine.lines; spec = databook overrides
   } */
(function () {
  'use strict';

  var SERVICES = {
    HWS: { name: 'Heating hot water supply', temp: 180, kind: 'heating' }, HWR: { name: 'Heating hot water return', temp: 160, kind: 'heating' },
    HHWS: { name: 'Heating hot water supply', temp: 180, kind: 'heating' }, HHWR: { name: 'Heating hot water return', temp: 160, kind: 'heating' },
    CHWS: { name: 'Chilled water supply', temp: 44, kind: 'cooling' }, CHWR: { name: 'Chilled water return', temp: 54, kind: 'cooling' },
    CWS: { name: 'Condenser / heat-pump loop supply', temp: 85, kind: 'loop' }, CWR: { name: 'Condenser / heat-pump loop return', temp: 95, kind: 'loop' },
    CD: { name: 'Condensate drain', temp: 55, kind: 'drain' }, COND: { name: 'Condensate drain', temp: 55, kind: 'drain' }, DTWS: { name: 'Condensate drain', temp: 55, kind: 'drain' },
    REFRIGERANT: { name: 'Refrigerant', temp: 40, kind: 'refrigerant' }, RS: { name: 'Refrigerant suction', temp: 40, kind: 'refrigerant' }, RL: { name: 'Refrigerant liquid', temp: 100, kind: 'refrigerant' },
    GAS: { name: 'Natural gas', temp: 70, kind: 'gas' }, G: { name: 'Natural gas', temp: 70, kind: 'gas' }
  };
  function serviceInfo(code) {
    var c = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (SERVICES[c]) return Object.assign({ code: c }, SERVICES[c]);
    if (/refrig/i.test(code)) return Object.assign({ code: 'REFRIGERANT' }, SERVICES.REFRIGERANT);
    if (/condensate|drain/i.test(code)) return Object.assign({ code: 'CD' }, SERVICES.CD);
    if (/chilled|chw/i.test(code)) return Object.assign({ code: 'CHWS' }, SERVICES.CHWS);
    if (/hot water|heating|hw/i.test(code)) return Object.assign({ code: 'HWS' }, SERVICES.HWS);
    return { code: c || '?', name: String(code || 'unknown service'), temp: null, kind: 'unknown' };
  }

  function sizeIn(text) {
    var s = String(text || '').replace(/[″”]/g, '"'), m;
    if ((m = /(\d+)\s*[- ]\s*(\d+)\s*\/\s*(\d+)/.exec(s))) return +m[1] + (+m[2]) / (+m[3]);   // 1-1/2, 2 1/2
    if ((m = /(\d+)\s*\/\s*(\d+)/.exec(s))) return (+m[1]) / (+m[2]);                              // 3/4, 3/8
    if ((m = /(\d+(?:\.\d+)?)/.exec(s))) return +m[1];
    return null;
  }

  // ── pipe material when the documents are silent: typical NY / NJ commercial practice (the spec or the engineer's legend overrides) ──
  function pipeMaterialDefault(service) {
    var k = serviceInfo(service).kind;
    if (k === 'heating' || k === 'cooling' || k === 'loop') return { material: 'Black steel Sch 40 (ASTM A53) — up to 2" Type L copper allowed when specified', joints: 'threaded ≤ 2", welded or grooved > 2"', basis: 'typical commercial HVAC water piping; Type L copper (brazed / 95-5) is the common alternative ≤ 2"' };
    if (k === 'drain') return { material: 'Type M copper (or Sch 40 PVC where code allows — not in return-air plenums)', joints: 'soldered / solvent', basis: 'condensate drain; plenum rating decides PVC vs copper' };
    if (k === 'refrigerant') return { material: 'ACR hard-drawn copper (Type L / K for field-bent), nitrogen-purged brazed joints', joints: 'brazed with nitrogen purge, 15 % silver', basis: 'refrigerant lines; line sizes per the equipment manufacturer' };
    if (k === 'gas') return { material: 'Black steel Sch 40, malleable-iron fittings', joints: 'threaded ≤ 2", welded > 2"', basis: 'fuel gas per NYC Fuel Gas Code / NFPA 54' };
    return { material: 'by the specification', joints: '', basis: 'service not recognized' };
  }

  // ── hanger spacing and rod size (MSS SP-69 / ASME B31.1 Table 121.5 / IPC 308.5) ──
  var STEEL = [[0.75, 7, 0.375], [1, 7, 0.375], [1.25, 7, 0.375], [1.5, 9, 0.375], [2, 10, 0.375], [2.5, 11, 0.5], [3, 12, 0.5], [3.5, 13, 0.5], [4, 14, 0.625], [5, 16, 0.625], [6, 17, 0.75], [8, 19, 0.875], [10, 22, 0.875], [12, 23, 0.875]];
  var COPPER = [[0.75, 5, 0.375], [1, 6, 0.375], [1.25, 7, 0.375], [1.5, 8, 0.375], [2, 8, 0.375], [2.5, 9, 0.5], [3, 10, 0.5], [3.5, 11, 0.5], [4, 12, 0.625], [5, 13, 0.625], [6, 14, 0.75], [8, 16, 0.875]];
  function pick(tbl, size) { var s = size == null ? 1 : size; for (var i = 0; i < tbl.length; i++) if (s <= tbl[i][0] + 1e-9) return tbl[i]; return tbl[tbl.length - 1]; }
  function pipeHanger(material, size) {
    var m = String(material || '').toLowerCase(), s = size;
    if (/pvc|cpvc|plastic/.test(m)) return { spacing_ft: /cpvc/.test(m) && s != null && s <= 1 ? 3 : 4, rod_in: 0.375, basis: 'plastic pipe: continuous support for 4 ft max (3 ft CPVC ≤ 1"); IPC 308.5' };
    if (/cast iron|no[- ]hub/.test(m)) return { spacing_ft: 5, rod_in: 0.5, basis: 'cast iron: every 5 ft and at every joint (IPC 308.5)' };
    if (/copper|acr|type [klm]/.test(m)) {
      if (/refrig|acr/.test(m) && s != null && s <= 1.125) return { spacing_ft: 5, rod_in: 0.25, basis: 'refrigerant tubing ≤ 1-1/8": 5 ft (clevis or strut clamp, insulated)' };
      var c = pick(COPPER, s); return { spacing_ft: c[1], rod_in: c[2], basis: 'copper tube: MSS SP-69 — ' + c[1] + ' ft, ' + c[2] + '" rod' };
    }
    var t = pick(STEEL, s); return { spacing_ft: t[1], rod_in: t[2], basis: 'steel pipe: MSS SP-69 / B31.1 — ' + t[1] + ' ft, ' + t[2] + '" rod' };
  }

  // ── pipe insulation (ASHRAE 90.1 Table 6.8.3-1, conductivity 0.21–0.27) by fluid temperature and pipe size ──
  var INS_BANDS = [   // [minF, maxF, <1", 1–<1.5", 1.5–<4", 4–<8", ≥8"]
    [201, 250, 2.5, 2.5, 2.5, 3, 3], [141, 200, 1.5, 1.5, 2, 2, 2], [105, 140, 1, 1, 1.5, 1.5, 1.5], [40, 60, 0.5, 0.5, 1, 1, 1], [-40, 39, 0.5, 1, 1, 1, 1.5]
  ];
  function pipeInsulationDefault(service, size) {
    var sv = serviceInfo(service), s = size == null ? 1 : size;
    if (sv.kind === 'loop' || sv.kind === 'gas') return null;
    if (sv.kind === 'drain') return { type: 'Cellular glass or elastomeric (sweat prevention, optional)', thickness_in: 0.5, jacket: 'none', basis: 'condensate drain: 1/2" only where the spec or sweating risk calls for it' };
    if (sv.kind === 'refrigerant') return { type: 'Closed-cell elastomeric (Armaflex-type), UV-protected outdoors', thickness_in: /liquid|rl/i.test(sv.code) ? 0 : (s <= 1.5 ? 0.75 : 1), jacket: 'aluminum / PVC outdoors', basis: 'suction line insulated (1/2"–1" by size and ambient), liquid line only outdoors or in heat; confirm with the manufacturer' };
    var T = sv.temp; if (T == null) return null;
    for (var i = 0; i < INS_BANDS.length; i++) if (T >= INS_BANDS[i][0] && T <= INS_BANDS[i][1]) {
      var col = s < 1 ? 2 : s < 1.5 ? 3 : s < 4 ? 4 : s < 8 ? 5 : 6;
      return { type: sv.kind === 'cooling' ? 'Fiberglass with vapor barrier (ASJ), or cellular glass / elastomeric in wet areas' : 'Fiberglass (ASJ)', thickness_in: INS_BANDS[i][col], jacket: sv.kind === 'cooling' ? 'ASJ with sealed vapor-barrier joints; PVC jacket exposed / mech rooms' : 'ASJ; PVC or aluminum jacket exposed / outdoors', basis: 'ASHRAE 90.1 Table 6.8.3-1 for ' + T + ' °F, ' + (s < 1 ? '< 1"' : s < 1.5 ? '1 to < 1.5"' : s < 4 ? '1.5 to < 4"' : s < 8 ? '4 to < 8"' : '≥ 8"') + ' pipe' };
    }
    return null;
  }

  // ── duct hangers and supports (SMACNA HVAC Duct Construction Standards, ch. 5) ──
  function ductHanger(kind) {
    if (kind === 'round' || kind === 'oval') return { spacing_ft: 12, hanger: '1" × 22 ga galvanized strap, or 3/8" rod with trapeze', rod_in: 0.375, basis: 'round / spiral duct: strap or rod at 12 ft max (10 ft where SMACNA table calls for it)' };
    return { spacing_ft: 8, hanger: '1" × 22 ga strap up to 60" perimeter; trapeze with 3/8" rods and angle iron above', rod_in: 0.375, basis: 'rectangular duct: 8 ft max (10 ft with heavier hangers) — SMACNA ch. 5' };
  }
  function anchorDefault(structure) {
    var s = String(structure || '').toLowerCase();
    if (/steel|joist|beam/.test(s)) return { type: 'Beam clamps / C-clamps with retainer clips (no welding or drilling of structure without the engineer)', basis: 'hangers from structural steel' };
    if (/metal deck|deck/.test(s)) return { type: 'Deck inserts or top-of-deck hanger fittings; powder-actuated pins only where the spec allows', basis: 'composite / metal deck' };
    return { type: 'Post-installed wedge / expansion anchors (ICC-ES listed), embedment per manufacturer; cast-in inserts where drawn', basis: 'concrete slab — default' };
  }

  // ── break an engine estimate down into what an engineer would list: material, insulation, hangers per pipe size / duct kind ──
  var PIPE_RE = /^\s*([\d][\d\-\s\/]*)\s*(?:"|in)\s+(.+?)\s+([A-Za-z]{2,12})\s+—\s+(\d[\d,]*)\s*ft/;
  function breakdown(lines, spec) {
    spec = spec || {}; lines = lines || [];
    var pipes = {}, ducts = { rect: 0, round: 0, oval: 0 }, notes = [];
    lines.forEach(function (l) {
      var d = String(l.description || ''), q = Number(l.quantity) || 0;
      if (l.category === 'pipework') {
        var m = PIPE_RE.exec(d), size, mat, svc;
        if (m) {
          size = sizeIn(m[1]); mat = m[2].trim(); svc = m[3].toUpperCase();
          if (/refrig/i.test(mat)) { svc = /liquid/i.test(svc) ? 'RL' : /gas|suction/i.test(svc) ? 'RS' : 'REFRIGERANT'; mat = mat.replace(/\s*refrigerant/i, '').trim() + ' (ACR)'; }
        }
        else if (/refrigerant line sets/i.test(d)) { size = 0.875; mat = 'copper (ACR) — liquid + suction pair on shared hangers, allowance'; svc = 'REFRIGERANT'; }
        else return;
        var key = [svc, mat.toLowerCase(), size].join('|');
        var p = pipes[key] = pipes[key] || { service: svc, material: mat, size: size, ft: 0, sheets: 0 };
        p.ft += q;
      } else if (l.category === 'ductwork') {
        var ft = String(l.unit || '').toLowerCase() === 'lf' ? q : 0; if (!ft) return;
        if (/round|spiral/i.test(d)) ducts.round += ft; else if (/oval/i.test(d)) ducts.oval += ft; else ducts.rect += ft;
      }
    });
    var rows = Object.keys(pipes).map(function (k) {
      var p = pipes[k], sv = serviceInfo(p.service), mat = (spec.material && spec.material[sv.kind]) || p.material;
      var h = pipeHanger(mat, p.size), ins = pipeInsulationDefault(p.service, p.size);
      return { service: p.service, service_name: sv.name, material: p.material, size: p.size, ft: Math.round(p.ft), hanger_spacing_ft: h.spacing_ft, rod_in: h.rod_in, hangers: Math.ceil(p.ft / h.spacing_ft) + 1, hanger_basis: h.basis, insulation: ins };
    }).sort(function (a, b) { return a.service < b.service ? -1 : a.service > b.service ? 1 : (a.size || 0) - (b.size || 0); });
    var drows = [];
    ['rect', 'round', 'oval'].forEach(function (k) { if (ducts[k] > 0) { var h = ductHanger(k); drows.push({ kind: k, ft: Math.round(ducts[k]), spacing_ft: h.spacing_ft, hangers: Math.ceil(ducts[k] / h.spacing_ft) + 1, hanger: h.hanger, rod_in: h.rod_in, basis: h.basis }); } });
    var tot = { pipe_ft: rows.reduce(function (a, r) { return a + r.ft; }, 0), pipe_hangers: rows.reduce(function (a, r) { return a + r.hangers; }, 0), duct_ft: drows.reduce(function (a, r) { return a + r.ft; }, 0), duct_hangers: drows.reduce(function (a, r) { return a + r.hangers; }, 0) };
    if (!rows.length && !drows.length) notes.push('no measured piping or ductwork yet — price the session first');
    return { pipes: rows, ducts: drows, totals: tot, notes: notes };
  }

  window.NWStd = { sizeIn: sizeIn, serviceInfo: serviceInfo, pipeMaterialDefault: pipeMaterialDefault, pipeHanger: pipeHanger, pipeInsulationDefault: pipeInsulationDefault, ductHanger: ductHanger, anchorDefault: anchorDefault, breakdown: breakdown, verified: false };
})();
