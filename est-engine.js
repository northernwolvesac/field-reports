// NWAC pricing engine — turns what the AI read on every sheet + the vendor quotes into a cost breakdown,
// using Kastriot's Estimating Standards (Reference/Estimating Standards) and NWAC's Procore unit rates (est_norms).
// Output lines use the estimate_line_items shape, so they drop straight into estimating.html.
// Every line carries `basis` (where the number comes from) and `flag` (what a person must check).
(function () {
  var LABOR_RATE = 60;

  // ── Kastriot's standards ─────────────────────────────────────────────
  var STD = {
    airOutlet: 1.6, linearPerFt: 0.8, vavOrDamper: 2.67, fpb: 8,           // Air Outlets Installation Standards
    wetTap: 10000,                                                          // Pricing and Markup Standards
    ductSD: 2500, pipeSD: 1300, tab: 2500,                                  // Shop Drawings and Testing (per floor)
    thermostat: 500, sensor: 400, tstatWiring: 50, vavControls: 1000        // Standalone Controls Standards
  };
  // Equipment Installation Standards: man-hours per unit
  function installHours(eq) {
    var t = (eq.type || '').toLowerCase(), w = Number(eq.weight_lb || 0);
    if (/air curtain/.test(t)) return { h: 16, basis: 'air curtain — 1/day, 2 men' };
    if (/baseboard/.test(t)) return { h: 8, basis: 'baseboard — 2/day, 2 men' };
    if (/ptac/.test(t)) return { h: 16 / 6, basis: 'PTAC — 6/day, 2 men' };
    if (/kitchen/.test(t) && /fan/.test(t)) return { h: 16, basis: 'kitchen exhaust fan — 1/day, 2 men' };
    if (!w && /induction|fan ?coil|fcu|cabinet|unit heater|thermostat|sensor|condensate pump|inline fan|cabinet fan|exhaust fan|ceiling fan/.test(t))
      return { h: /fan ?coil|fcu/.test(t) ? 16 : 8, basis: 'weight not shown — small terminal unit (' + (/fan ?coil|fcu/.test(t) ? '100–190 lb tier' : '40–90 lb tier') + ')', flag: 'weight unknown' };
    if (!w) return { h: 32, basis: 'weight not shown — priced as 200–500 lb (1 day, 4 men)', flag: 'weight unknown' };
    if (w <= 35) return { h: 4, basis: '1–30 lb — 1/4 day, 2 men' };
    if (w <= 95) return { h: 8, basis: '40–90 lb — 1/2 day, 2 men' };
    if (w <= 195) return { h: 16, basis: '100–190 lb — 1 day, 2 men' };
    if (w <= 550) return { h: 32, basis: '200–500 lb — 1 day, 4 men' };
    return { h: 48, basis: '600 lb+ — 1 day, 6 men' };
  }
  // Rigging Standards
  function rigging(items, highRise) {
    var out = [], indoor = items.filter(function (r) { return r.where !== 'roof' && r.weight_lb >= 800; }),
      roof = items.filter(function (r) { return r.where === 'roof' && r.weight_lb >= 400; });
    indoor.forEach(function (r) {
      out.push({ d: 'Indoor rigging — ' + (r.tag || 'unit') + ' (' + r.weight_lb + ' lb)', amt: r.weight_lb > 3000 ? 4000 : 1000,
        basis: r.weight_lb > 3000 ? '3,100 lb+ — $4,000/unit' : 'up to 3,000 lb — $1,000/unit' });
    });
    if (roof.length) {
      if (highRise) out.push({ d: 'Crane — ' + roof.length + ' rooftop unit(s)', amt: 25000, basis: 'crane above 10th floor — $25,000/day (no permits)', flag: 'confirm floor height / permits' });
      else {
        var heavy = roof.filter(function (r) { return r.weight_lb >= 4000; }), light = roof.length - heavy.length;
        if (light) out.push({ d: 'Boom truck — ' + light + ' rooftop unit(s) 400–3,000 lb', amt: light <= 2 ? 3000 : Math.ceil(light / 5) * 6000,
          basis: '$3,000 half day / $6,000 full day, max 5/day' });
        if (heavy.length) out.push({ d: 'Boom truck — ' + heavy.length + ' rooftop unit(s) 4,000 lb+', amt: heavy.length * 3000, basis: '$3,000/unit' });
      }
    }
    return out;
  }

  // ── duct / pipe unit rates (NWAC Procore catalog) ────────────────────
  function sizeOf(s) {
    s = String(s || '').replace(/["”″]/g, '').replace(/×/g, 'x').toLowerCase();
    var m = s.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
    if (m) return { w: +m[1], h: +m[2], round: false };
    m = s.match(/(\d+(?:\.\d+)?)/);
    return m ? { w: +m[1], h: +m[1], round: true } : null;
  }
  function perim(z) { return z.round ? Math.PI * z.w : 2 * (z.w + z.h); }

  function makeRates(norms) {
    var duct = { rect: [], round: [] }, pipe = [], byName = {};
    (norms || []).forEach(function (n) {
      byName[(n.item || '').toLowerCase()] = n;
      if (n.kind === 'duct' && n.unit === 'Ft') {
        var z = sizeOf(n.item); if (!z) return;
        var fam = /round|oval|spiral/i.test(n.item) ? 'round' : 'rect';
        if (!/1" acl/i.test(n.item)) return;                 // standard family: 1" acoustic lining
        duct[fam].push({ z: z, p: perim(z), cost: +n.unit_cost, hrs: +n.labor_hrs, item: n.item, projects: n.projects });
      }
      if (n.kind === 'pipe' && n.unit === 'Ft') pipe.push(n);
    });
    return { duct: duct, pipe: pipe, byName: byName };
  }

  function ductRate(R, size, shape) {
    var z = sizeOf(size); if (!z) return null;
    var fam = (shape === 'round' || z.round) ? 'round' : 'rect';
    if (fam === 'round') z = { w: z.w, h: z.w, round: false };      // Procore names round ducts "8x8 round/oval"
    var list = R.duct[fam], p = 2 * (z.w + z.h);
    var exact = list.find(function (x) { return x.z.w === z.w && x.z.h === z.h; }) ||
      list.find(function (x) { return x.z.w === z.h && x.z.h === z.w; });
    if (exact) return { cost: exact.cost, hrs: exact.hrs, basis: 'Procore rate "' + exact.item + '" (' + exact.projects + ' jobs)' };
    if (list.length) {
      var near = list.slice().sort(function (a, b) { return Math.abs(a.p - p) - Math.abs(b.p - p); })[0];
      return { cost: +(near.cost * p / near.p).toFixed(3), hrs: near.hrs, basis: 'scaled from Procore "' + near.item + '" by perimeter', flag: 'size not in catalog' };
    }
    // no norms loaded yet: catalog formula (median $0.99/in perimeter, 42/63/105 min per ft by size)
    return { cost: +(0.99 * p).toFixed(3), hrs: p <= 80 ? 0.7 : p <= 140 ? 1.05 : 1.75, basis: 'catalog formula ($0.99 per inch of perimeter)', flag: 'rate table not loaded' };
  }

  function pipeRate(R, run) {
    var svc = (run.service || '').toLowerCase(), mat = (run.material || '').toLowerCase();
    if (/refrig|rs\/rl|\brl\b|\brs\b/.test(svc)) {
      var rf = R.byName['refrigerant lines (2 pipes) 2/ insulation'];
      return rf ? { cost: +rf.unit_cost, hrs: +rf.labor_hrs, basis: 'Procore "refrigerant lines (2 pipes) w/ insulation"' }
        : { cost: 21, hrs: 0.28, basis: 'Procore refrigerant line set rate' };
    }
    var ps = pipeSize(run.size);
    if (!ps) return { cost: 30, hrs: 0.6, basis: 'budget — size not read', flag: 'pipe size not read — confirm' };
    var pvc = /pvc|condensate|drain/.test(mat + ' ' + svc);
    var cands = R.pipe.filter(function (n) {
      var nm = n.item.toLowerCase(), z = pipeSize(nm);
      return z && Math.abs(z.d - ps.d) < 0.01 && (/pvc/.test(nm) === pvc);
    });
    if (cands.length) {
      var c = cands.sort(function (a, b) { return b.projects - a.projects; })[0];
      return { cost: +c.unit_cost, hrs: +c.labor_hrs, basis: 'Procore rate "' + c.item + '" (' + c.projects + ' jobs)',
        flag: /steel|black|sch/.test(mat) ? 'copper rate used for steel pipe — confirm' : null };
    }
    // bigger than the catalog (NWAC rates stop at 4"): extend the copper curve per inch of diameter
    var big = R.pipe.filter(function (n) { var z = pipeSize(n.item); return z && !/pvc/i.test(n.item); }).sort(function (a, b) { return pipeSize(b.item).d - pipeSize(a.item).d; })[0];
    if (big && ps.d > pipeSize(big.item).d)
      return { cost: +(big.unit_cost * ps.d / pipeSize(big.item).d).toFixed(2), hrs: +(big.labor_hrs * Math.sqrt(ps.d / pipeSize(big.item).d)).toFixed(3),
        basis: 'scaled from Procore "' + big.item + '"', flag: ps.label + ' pipe is above the NWAC catalog — get a piping sub price' };
    return { cost: +(12 + 18 * ps.d).toFixed(2), hrs: 0.6, basis: 'budget $/ft by diameter', flag: 'no Procore rate for ' + ps.label + ' — confirm' };
  }
  // "2 1/2", "2-1/2", "2½", "2.5", '3/4"' → { d: 2.5, label: '2-1/2"' }
  function pipeSize(s) {
    s = String(s || '').replace(/½/g, '-1/2').replace(/¼/g, '-1/4').replace(/¾/g, '-3/4').replace(/["”″]/g, '"');
    var m = s.match(/(\d+)\s*[- ]\s*(\d)\/(\d)/) || null, d;
    if (m) d = +m[1] + (+m[2] / +m[3]);
    else if ((m = s.match(/(^|[^\d])(\d)\/(\d)/))) d = +m[2] / +m[3];
    else if ((m = s.match(/(\d+(?:\.\d+)?)/))) d = +m[1];
    if (!d || d > 48) return null;
    var whole = Math.floor(d), frac = d - whole, f = frac ? ({ 0.25: '1/4', 0.5: '1/2', 0.75: '3/4' }[Math.round(frac * 4) / 4] || '') : '';
    return { d: d, label: (whole ? whole : '') + (whole && f ? '-' : '') + f + '"' };
  }

  // ── read the AI sheet results ────────────────────────────────────────
  function norm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }   // AC1-1 = AC-1-1

  function collect(pages) {
    var sheets = pages.filter(function (p) { return p.result && !p.result.parse_error && p.sheet_type !== 'quote'; });
    var quotes = pages.filter(function (p) { return p.sheet_type === 'quote' && p.result && !p.result.parse_error && p.result.use !== false; });
    var sched = {}, planEq = {}, devices = {}, duct = {}, pipe = {}, demo = [], notes = [], questions = [], rig = [], floors = {}, wetTaps = 0, skipped = [];
    sheets.forEach(function (p) {
      var r = p.result, sh = r.sheet_no || ('p' + p.page_no), type = r.sheet_type || p.sheet_type || '';
      var isDemo = type === 'demo' || /removal|demo/i.test(r.sheet_title || '');
      if (r.floor && /^\d+$|roof|cellar|basement|mezz/i.test(r.floor)) floors[String(r.floor).toLowerCase()] = 1;
      var eqList = [];
      (r.equipment || []).forEach(function (e0) {
        var tags = expandTags(e0.tag);
        tags.forEach(function (t) { eqList.push(Object.assign({}, e0, { tag: t, qty: tags.length > 1 ? 1 : e0.qty })); });
      });
      eqList.forEach(function (e) {
        var tag = norm(e.tag); if (!tag) return;
        if (type === 'schedule' || type === 'enlarged' || type === 'riser') {
          var s = sched[tag] = sched[tag] || { tag: tag, label: String(e.tag).trim(), qty: 0, sheets: [] };
          ['type', 'manufacturer', 'model', 'capacity', 'weight_lb', 'furnished_by', 'electrical', 'notes', 'location'].forEach(function (k) { if (e[k] && !s[k]) s[k] = e[k]; });
          if (type === 'schedule') s.qty = Math.max(s.qty, Number(e.qty || 0));
          s.sheets.push(sh);
        } else if (!isDemo) {
          var q = planEq[tag] = planEq[tag] || { tag: tag, label: String(e.tag).trim(), qty: 0, sheets: [], per: {} };
          var fl = String(r.floor || sh), f = q.per[fl] = q.per[fl] || {};
          f[type] = (f[type] || 0) + Number(e.qty || 1); q.sheets.push(sh);
          q.qty = Object.keys(q.per).reduce(function (a, k) { return a + Math.max.apply(null, Object.values(q.per[k])); }, 0);
          if (!q.type && e.type) q.type = e.type;
          if (!q.notes && e.notes) q.notes = e.notes;
          if (!q.weight_lb && e.weight_lb) q.weight_lb = e.weight_lb;
        }
      });
      // quantities come from the floor plans only; enlarged plans, details, risers and controls repeat what the plans show
      var takeoffSheet = type === 'duct_plan' || type === 'pipe_plan' || (type === 'other' && /plan/i.test(r.sheet_title || '') && !/enlarged/i.test(r.sheet_title || ''));
      if (!isDemo && !takeoffSheet && ((r.duct_runs || []).length || (r.pipe_runs || []).length || (r.air_devices || []).length))
        skipped.push(sh + ' (' + (type || 'sheet') + ')');
      if (!isDemo && takeoffSheet) {
        (r.air_devices || []).forEach(function (a) {
          var k = (a.type || 'other') + '|' + norm(a.tag) + '|' + (a.tag ? '' : (a.size || ''));
          var d = devices[k] = devices[k] || { type: a.type || 'other', tag: a.tag || '', size: a.size || '', notes: a.notes || '', qty: 0, lf: 0, sheets: [], per: {} };
          var fl = String(r.floor || sh), f = d.per[fl] = d.per[fl] || {}, ft = f[type] = f[type] || { q: 0, lf: 0 };
          ft.q += Number(a.qty || 0); ft.lf += Number(a.linear_ft || 0); d.sheets.push(sh);
          d.qty = 0; d.lf = 0;
          Object.keys(d.per).forEach(function (fk) {
            var best = Object.values(d.per[fk]).sort(function (x, y) { return y.q - x.q; })[0];
            d.qty += best.q; d.lf += best.lf;
          });
        });
        {
          (r.duct_runs || []).forEach(function (x) {
            var z = sizeOf(x.size); if (!z) return;
            var shape = x.shape === 'round' || x.shape === 'oval' || z.round ? 'round' : 'rect';
            var k = shape + '|' + (z.round ? z.w : z.w + 'x' + z.h);
            var o = duct[k] = duct[k] || { shape: shape, size: z.round ? z.w + '"Ø' : z.w + 'x' + z.h, lf: 0, sheets: [] };
            o.lf += Number(x.lf || 0); o.sheets.push(sh);
          });
          (r.pipe_runs || []).forEach(function (x) {
            var k = (x.service || '') + '|' + (x.size || '') + '|' + (x.material || '');
            var o = pipe[k] = pipe[k] || { service: x.service || '', size: x.size || '', material: x.material || '', lf: 0, sheets: [] };
            o.lf += Number(x.lf || 0); o.sheets.push(sh);
          });
        }
      }
      if (isDemo) (r.demo || []).forEach(function (d) { demo.push({ item: d.item, qty: Number(d.qty || 0), sheet: sh }); });
      wetTaps += Number(r.wet_taps || 0);
      (r.rigging || []).forEach(function (x) { rig.push({ tag: String(x.tag || '').trim(), key: norm(x.tag), weight_lb: Number(x.weight_lb || 0), where: x.where, floor: x.floor, sheet: sh }); });
      (r.scope_notes || []).forEach(function (n) { if (n.mech_scope) notes.push({ sheet: sh, source: n.source, text: n.text, often_missed: !!n.often_missed }); });
      (r.questions || []).forEach(function (q) { questions.push({ sheet: sh, q: q }); });
    });
    return { sched: sched, planEq: planEq, devices: devices, duct: duct, pipe: pipe, demo: demo, notes: notes, questions: questions,
      rig: rig, floors: Object.keys(floors), wetTaps: wetTaps, skipped: skipped, quotes: quotes.map(function (p) { return p.result; }) };
  }

  // ── build the breakdown ──────────────────────────────────────────────
  function build(pages, opts) {
    opts = opts || {};
    var R = makeRates(opts.norms), C = collect(pages), lines = [], flags = [], sort = 0;
    function add(cat, d, qty, unit, mat, hrs, basis, extra) {
      var l = Object.assign({ category: cat, description: d, quantity: +(+qty).toFixed(4), unit: unit, unit_material_cost: +(+mat || 0).toFixed(4),
        unit_labor_hours: +(+hrs || 0).toFixed(4), labor_crew_type: cat === 'pipework' ? 'pipe' : cat === 'services' ? 'none' : 'sm',
        is_firm: true, is_wet_tap: false, sort_order: ++sort, basis: basis }, extra || {});
      if (l.flag) flags.push({ category: cat, item: d, flag: l.flag });
      lines.push(l); return l;
    }
    var floors = Number(opts.floors) || C.floors.filter(function (f) { return /^\d+$/.test(f); }).length || 1;

    // 1. Disconnects
    var dq = C.demo.reduce(function (a, d) { return a + (d.qty || 0); }, 0);
    if (dq) add('disconnects', 'Disconnect / remove existing HVAC items (' + C.demo.length + ' types on demo sheets)', dq, 'ea', 0, 1.16,
      'NWAC Procore norm — 1.16 hr per disconnect');

    // 2. Equipment — vendor quotes, then scheduled tags nobody quoted
    var quoted = {};
    var today = new Date().toISOString().slice(0, 10);
    C.quotes.forEach(function (q) {
      var expired = q.valid_until && /^\d{4}-\d{2}-\d{2}$/.test(q.valid_until) && q.valid_until < today;
      var qflag = expired ? 'quote expired ' + q.valid_until + ' — re-quote' : null;
      if (!q.total) { add('equipment', (q.vendor || 'Vendor') + ' — ' + (q.quote_no || 'quote') + ' (no total found)', 1, 'ls', 0, 0, 'quote', { is_firm: false, flag: 'quote total not read — enter by hand', vendor_name: q.vendor, vendor_quote_ref: q.quote_no }); return; }
      if (/tab|rigging|crane/.test(q.kind || '')) {
        add('services', (q.vendor || 'Sub') + ' — ' + (q.quote_no || '') + ' ' + (q.kind || ''), 1, 'ls', q.total, 0, 'subcontractor quote', { vendor_name: q.vendor, vendor_quote_ref: q.quote_no, flag: qflag });
      } else if (q.kind === 'sheetmetal' || q.kind === 'insulation') {
        add('ductwork', (q.vendor || 'Sub') + ' — ' + (q.quote_no || '') + ' ' + q.kind, 1, 'ls', q.total, 0, 'subcontractor quote — check it does not overlap the takeoff below', { vendor_name: q.vendor, vendor_quote_ref: q.quote_no, flag: 'sub quote + takeoff may double count' });
      } else {
        add('equipment', (q.vendor || 'Vendor') + ' — ' + (q.quote_no || 'quote') + (q.kind && q.kind !== 'equipment' ? ' (' + q.kind + ')' : ''), 1, 'ls', q.total, 0, 'vendor quote' + (q.date ? ' ' + q.date : ''), { vendor_name: q.vendor, vendor_quote_ref: q.quote_no, flag: qflag, is_firm: !expired });
      }
      (q.lines || []).forEach(function (l) { (l.tags || []).forEach(function (t) { quoted[norm(t)] = q.vendor || true; }); });
    });
    var bms = C.quotes.some(function (q) { return q.kind === 'controls'; });
    Object.keys(C.sched).sort().forEach(function (tag) {
      var s = C.sched[tag];
      if (quoted[tag] || /owner/i.test(s.furnished_by || '')) return;
      if (/diffuser|grille|register|vav|damper|louver/i.test(s.type || '')) return;   // air devices are counted below
      add('equipment', (s.label || tag) + ' — ' + [s.type, s.manufacturer, s.model, s.capacity].filter(Boolean).join(' · '), Math.max(1, s.qty || (C.planEq[tag] && C.planEq[tag].qty) || 1), 'ea', 0, 0,
        'on schedule ' + s.sheets[0] + ' — no quote yet', { is_firm: false, flag: 'quote needed' });
    });

    // 3. Ductwork
    var ductFt = 0;
    Object.keys(C.duct).forEach(function (k) {
      var d = C.duct[k]; if (!d.lf) return;
      var r = ductRate(R, d.size, d.shape); ductFt += d.lf;
      add('ductwork', d.size + ' ' + (d.shape === 'round' ? 'round' : 'rectangular') + ' duct w/ 1" ACL — ' + Math.round(d.lf) + ' ft', d.lf, 'lf', r.cost, r.hrs, r.basis + ' · AI-measured on ' + uniq(d.sheets).join(', '),
        { flag: r.flag || null });
    });
    var outletCount = 0, linearFt = 0;
    Object.keys(C.devices).forEach(function (k) { var d = C.devices[k]; if (/diffuser|grille|register|vav|fpb/.test(d.type)) outletCount += d.qty; if (d.type === 'linear') linearFt += d.lf || d.qty * 4; });
    var ductCheck = null;
    if (outletCount) {
      ductCheck = { outlets: outletCount, measured_ft: Math.round(ductFt), expected_ft: [Math.round(outletCount * 9.6), Math.round(outletCount * 13.3), Math.round(outletCount * 18.3)] };
      if (ductFt < ductCheck.expected_ft[0] * 0.8 || ductFt > ductCheck.expected_ft[2] * 1.25)
        flags.push({ category: 'ductwork', item: 'Duct footage check', flag: 'measured ' + Math.round(ductFt) + ' ft vs ' + ductCheck.expected_ft[0] + '–' + ductCheck.expected_ft[2] + ' ft expected for ' + outletCount + ' air devices (NWAC history: 13.3 ft per outlet)' });
    }

    // 4. Pipework
    var hasPipe = false;
    Object.keys(C.pipe).forEach(function (k) {
      var p = C.pipe[k]; if (!p.lf) return; hasPipe = true;
      var r = pipeRate(R, p);
      add('pipework', [p.size, p.material, p.service].filter(Boolean).join(' ') + ' — ' + Math.round(p.lf) + ' ft', p.lf, 'lf', r.cost, r.hrs, r.basis + ' · AI-measured on ' + uniq(p.sheets).join(', '), { flag: r.flag || null });
    });
    if (C.wetTaps) add('pipework', 'Wet-tap connection' + (C.wetTaps > 1 ? 's' : ''), C.wetTaps, 'ea', STD.wetTap, 0, 'Standard — $10,000 per connection (sub)', { is_wet_tap: true, labor_crew_type: 'none' });

    // 5. Equipment install (every scheduled unit we furnish or set; units shown only on plans too)
    var eqTags = Object.keys(C.sched);
    Object.keys(C.planEq).forEach(function (tag) { if (!C.sched[tag]) eqTags.push(tag); });
    eqTags.sort().forEach(function (tag) {
      var s = C.sched[tag] || C.planEq[tag];
      if (!C.sched[tag] && !/unit|fan|pump|heater|ac|hp|fcu|ahu|rtu|doas|curtain|cooler|tank|separator|humidifier|crac|split|vrf|condens/i.test((s.type || '') + ' ' + tag)) return;
      if (/diffuser|grille|register|vav|damper|louver/i.test(s.type || '')) return;
      var about = [s.type, s.notes, s.location, s.furnished_by].join(' ');
      if (/existing|to remain|reference only|base building|by others|owner[- ]furnished|n\.?i\.?c/i.test(about)) return;
      var alt = /alternate|\balt\b|add alt/i.test(about);
      var qty = Math.max(1, (C.planEq[tag] && C.planEq[tag].qty) || s.qty || 1), ih = installHours(s);
      add('equipment_install', 'Install ' + (s.label || tag) + (s.type ? ' — ' + s.type : '') + (s.weight_lb ? ' (' + s.weight_lb + ' lb)' : '') + (alt ? ' [ALTERNATE]' : ''), qty, 'ea', 0, ih.h, 'Equipment Installation Standards — ' + ih.basis,
        { flag: alt ? 'alternate — not in the base price' : (ih.flag || (C.planEq[tag] && s.qty && C.planEq[tag].qty !== s.qty ? 'plan count ' + C.planEq[tag].qty + ' ≠ schedule ' + s.qty : null)),
          is_optional: alt, labor_crew_type: 'startup' });
    });

    // 6. Air outlets install (labor only — material is in the vendor quote)
    var ao = { outlet: 0, linear: 0, vavd: 0, fpb: 0 };
    Object.keys(C.devices).forEach(function (k) {
      var d = C.devices[k];
      var manual = /^(VD|MVD|BD|COD|OD|CD)\d*$/.test(norm(d.tag)) || /volume|balanc|manual|cable|opposed/i.test((d.notes || '') + ' ' + d.size);
      if (/diffuser|grille|register/.test(d.type)) ao.outlet += d.qty;
      else if (d.type === 'linear') { if (d.lf) ao.linear += d.lf; else { ao.linear += d.qty * 4; ao.linearGuess = true; } }
      else if (d.type === 'vav') ao.vavd += d.qty;
      else if ((d.type === 'fsd' || d.type === 'motorized_damper') && !manual) ao.vavd += d.qty;
      else if (d.type === 'fpb') ao.fpb += d.qty;
    });
    if (ao.outlet) add('air_outlets', 'Diffusers / grilles / registers', ao.outlet, 'ea', 0, STD.airOutlet, 'Air Outlets Standards — 1.6 hr each');
    if (ao.linear) add('air_outlets', 'Linear diffusers', ao.linear, 'lf', 0, STD.linearPerFt, 'Air Outlets Standards — 0.8 hr/ft', ao.linearGuess ? { flag: 'some lengths not shown — counted 4 ft per piece; check the plans' } : null);
    if (ao.vavd) add('air_outlets', 'VAV boxes / fire-smoke / motorized dampers', ao.vavd, 'ea', 0, STD.vavOrDamper, 'Air Outlets Standards — 2.67 hr each');
    if (ao.fpb) add('air_outlets', 'Fan-powered boxes', ao.fpb, 'ea', 0, STD.fpb, 'Air Outlets Standards — 8 hr each');

    // standalone controls only when there is no BMS quote (Standalone Controls Standards)
    var vavCount = Object.keys(C.devices).reduce(function (a, k) { return a + (C.devices[k].type === 'vav' || C.devices[k].type === 'fpb' ? C.devices[k].qty : 0); }, 0);
    if (!bms && vavCount) add('equipment', 'Standalone VAV controls (no BMS quote)', vavCount, 'ea', STD.vavControls + STD.thermostat + STD.tstatWiring, 1.6,
      'Standalone Controls — $1,000/VAV + thermostat $500 + wiring $50; 10/day install', { is_firm: false, flag: 'replace with BMS quote if one comes in' });

    // 7. Services
    add('services', 'Ductwork shop drawings — ' + floors + ' floor' + (floors > 1 ? 's' : ''), floors, 'floor', STD.ductSD, 0, 'Standard — $2,500/floor');
    if (hasPipe) add('services', 'Piping shop drawings — ' + floors + ' floor' + (floors > 1 ? 's' : ''), floors, 'floor', STD.pipeSD, 0, 'Standard — $1,300/floor (piping scope only)');
    if (!C.quotes.some(function (q) { return q.kind === 'tab'; }))
      add('services', 'Testing & balancing — ' + floors + ' floor' + (floors > 1 ? 's' : ''), floors, 'floor', STD.tab, 0, 'Standard — $2,500/floor');
    // heavy scheduled units the sheet readers did not list under rigging: roof ≥ 400 lb, indoor ≥ 800 lb
    var rigTags = {}; C.rig.forEach(function (x) { rigTags[x.key || norm(x.tag)] = 1; });
    Object.keys(C.sched).forEach(function (tag) {
      var s = C.sched[tag], w = Number(s.weight_lb || 0); if (!w || rigTags[tag]) return;
      var roof = /roof|rtu|doas|dry ?cooler|condens|cooling tower|accu|exhaust fan/i.test((s.type || '') + ' ' + tag);
      if (w >= (roof ? 400 : 800)) {
        var qty = Math.max(1, (C.planEq[tag] && C.planEq[tag].qty) || s.qty || 1);
        for (var i = 0; i < qty; i++) C.rig.push({ tag: s.label || tag, weight_lb: w, where: roof ? 'roof' : 'indoor', guessed: true });
      }
    });
    if (C.rig.some(function (x) { return x.guessed; })) flags.push({ category: 'services', item: 'Rigging', flag: 'roof / indoor location guessed from the equipment type — confirm on the plans' });
    if (C.rig.some(function (x) { return x.weight_lb >= 10000; })) flags.push({ category: 'services', item: 'Rigging', flag: 'unit over 10,000 lb — confirm crane size and street permits with the rigger' });
    rigging(C.rig, !!opts.highRise).forEach(function (r) { add('services', r.d, 1, 'ls', r.amt, 0, 'Rigging Standards — ' + r.basis, { flag: r.flag || null }); });

    var totals = window.nwEstTotals ? window.nwEstTotals(lines, { labor_rate: LABOR_RATE, is_ofci: !!opts.ofci }) : null;
    if (C.skipped.length) flags.push({ category: 'takeoff', item: 'Not added to quantities', flag: 'duct/pipe/air devices on ' + C.skipped.join(', ') + ' — these sheets repeat the floor plans; check that nothing shown only there is missing' });
    var seenNote = {}, uniqNotes = C.notes.filter(function (n) {
      var k = String(n.text || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 70);
      if (!n.often_missed || seenNote[k]) return false; seenNote[k] = 1; return true;
    });
    uniqNotes.slice(0, 25).forEach(function (n) { flags.push({ category: 'scope', item: n.source + ' (' + n.sheet + ')', flag: n.text }); });
    if (uniqNotes.length > 25) flags.push({ category: 'scope', item: (uniqNotes.length - 25) + ' more notes', flag: 'see the AI scope review' });
    // the same warning on many lines → one entry with a count
    var grouped = [], byKey = {};
    flags.forEach(function (f) {
      var k = f.category === 'scope' || f.category === 'takeoff' ? f.category + '|' + f.item + '|' + f.flag : f.category + '|' + f.flag.replace(/\d[\d,.]*/g, '#');
      if (byKey[k]) { byKey[k].n++; if (byKey[k].items.length < 6) byKey[k].items.push(f.item); return; }
      byKey[k] = { category: f.category, flag: f.flag, item: f.item, items: [f.item], n: 1 }; grouped.push(byKey[k]);
    });
    grouped.forEach(function (g) { if (g.n > 1) { g.item = g.n + ' lines (' + g.items.slice(0, 3).map(function (s) { return String(s).split(' — ')[0]; }).join(', ') + (g.n > 3 ? '…' : '') + ')'; } });
    return { lines: lines, totals: totals, flags: grouped, collected: C, floors: floors, ductCheck: ductCheck };
  }

  // "IDU-35-A,B" → IDU-35-A, IDU-35-B ; "AC-1-1/1-2" → AC-1-1, AC-1-2 ; "EF-1 & EF-2" → EF-1, EF-2
  function expandTags(raw) {
    var t = String(raw || '').trim(); if (!t) return [];
    var parts = t.split(/\s*(?:,|\/|&|\band\b)\s*/i).filter(Boolean);
    if (parts.length < 2) return [t];
    var first = parts[0], out = [first];
    parts.slice(1).forEach(function (p) {
      if (/^[A-Z]{1,5}-?\d/i.test(p) && /[A-Z]{2,}/i.test(p.replace(/\d.*$/, ''))) { out.push(p); return; }   // full tag
      var cut = first.lastIndexOf('-', first.length - p.length - 1);
      var byLen = first.slice(0, first.length - p.length);
      out.push((/[-]$/.test(byLen) || cut < 0 ? byLen : first.slice(0, cut + 1)) + p);
    });
    return out;
  }

  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  window.NWEngine = { build: build, collect: collect, ductRate: ductRate, installHours: installHours, STD: STD };
})();
