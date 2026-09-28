// NWAC pricing engine — turns what the AI read on every sheet + the vendor quotes into a cost breakdown,
// using Kastriot's Estimating Standards (Reference/Estimating Standards) and NWAC's Procore unit rates (est_norms).
// Output lines use the estimate_line_items shape, so they drop straight into estimating.html.
// Every line carries `basis` (where the number comes from) and `flag` (what a person must check).
(function () {
  var LABOR_RATE = 60;
  var GEO_FITTINGS = 1.08;   // elbows, transitions, tees are not straight wall pairs — calibrated on 4 NWAC bids (L'Catteron −17 %, April Tax −14 %, Sage −2 %, Crozier +3 % raw)

  // ── Kastriot's standards ─────────────────────────────────────────────
  var STD = {
    airOutlet: 1.6, linearPerFt: 0.8, vavOrDamper: 2.67, fpb: 8,           // Air Outlets Installation Standards
    wetTap: 10000,                                                          // Pricing and Markup Standards
    ductSD: 2500, pipeSD: 1300, tab: 2500,                                  // Shop Drawings and Testing (per floor)
    thermostat: 500, sensor: 400, tstatWiring: 50, vavControls: 1000        // Standalone Controls Standards
  };
  // Equipment Installation Standards: man-hours per unit
  // a unit is something with a tag on it (EF-1, AC-10-2, AH-1.10, EDH-G-1); detail titles and legend rows ("AC UNIT (ceiling mounted",
  // "Fan-Coil (hanging)", "EF (typical)") that the reader lists as equipment are not units — Sage carried 9 such phantoms (288 h)
  function isRealTag(t) { t = String(t || '').trim(); return /^[A-Za-z]{1,6}([-\s]?[A-Za-z]{1,2})?[-\s]?\d[\w.\-\/]*$/.test(t) && !/\(|typ/i.test(t); }
  function installHours(eq) {
    var t = (eq.type || '').toLowerCase(), w = Number(eq.weight_lb || 0);
    if (/air curtain/.test(t)) return { h: 16, basis: 'air curtain — 1/day, 2 men' };
    if (/baseboard/.test(t)) return { h: 8, basis: 'baseboard — 2/day, 2 men' };
    if (/ptac/.test(t)) return { h: 16 / 6, basis: 'PTAC — 6/day, 2 men' };
    if (/kitchen/.test(t) && /fan/.test(t)) return { h: 16, basis: 'kitchen exhaust fan — 1/day, 2 men' };
    if (!w && /induction|fan ?coil|fcu|cabinet|unit heater|thermostat|sensor|condensate pump|inline fan|cabinet fan|exhaust fan|ceiling fan/.test(t))
      return { h: /fan ?coil|fcu/.test(t) ? 16 : 8, basis: 'weight not shown — small terminal unit (' + (/fan ?coil|fcu/.test(t) ? '100–190 lb tier' : '40–90 lb tier') + ')', flag: 'weight unknown' };
    // no weight on the schedule: Kastriot prices by what the thing is — light fans / duct heaters 4 h, pumps 8 h, ductless split parts 16 h,
    // rooftop / make-up air / hoods as 600 lb+ (48 h); everything else stays at the 200–500 lb tier
    if (!w && /\bfan\b|exhaust|transfer|duct heater|\bedh\b|electric heater|thermostat|damper|louver/.test(t)) return { h: 4, basis: 'weight not shown — light fan / duct heater (4/day, 2 men)', flag: 'weight unknown' };
    if (!w && /pump/.test(t)) return { h: 8, basis: 'weight not shown — small pump (1/2 day, 2 men)', flag: 'weight unknown' };
    if (!w && /ductless|mini[- ]split|dscu|dseu|cassette|wall[- ]mount|evaporator/.test(t)) return { h: 16, basis: 'weight not shown — ductless split component (1 day, 2 men)', flag: 'weight unknown' };
    if (!w && /rooftop|\brtu\b|make[- ]?up air|\bmua\b|hood|\bkeh\b|packaged unit|doas/.test(t)) return { h: 48, basis: 'weight not shown — rooftop / make-up air / hood priced as 600 lb+ (1 day, 6 men)', flag: 'weight unknown' };
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
      // a unit over 10,000 lb is beyond a boom truck: Kastriot carries a crane day as a placeholder until the rigger quotes
      // (Crozier DOAS-3-1, 18,300 lb → Procore "Crane" $25,000); the other roof units go up on the same crane day(s)
      var critical = roof.filter(function (r) { return r.weight_lb >= 10000; });
      if (highRise || critical.length) {
        var days = Math.ceil(roof.length / 12);
        out.push({ d: 'Crane — ' + roof.length + ' rooftop / outdoor unit(s)' + (days > 1 ? ', ' + days + ' days' : '') +
            (critical.length ? ' (heaviest ' + critical.map(function (r) { return (r.tag || 'unit') + ' ' + r.weight_lb.toLocaleString() + ' lb'; }).join(', ') + ')' : ''),
          amt: 25000 * days,
          basis: (critical.length ? 'unit over 10,000 lb is beyond a boom truck' : 'crane above 10th floor') + ' — $25,000/day, max 12 units/day (no permits)',
          flag: critical.length ? 'placeholder — critical pick: get a crane / rigger quote (DOB/MTA permits can make it $50,000/day)' : 'confirm floor height / permits' });
      } else {
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

  // NWAC Procore duct families (catalog suffix after the size)
  var DUCT_FAMILIES = {
    rect_lined_1:   { rect: 'rectangular with 1" acl', round: 'round/oval with 1" acl',   label: 'rectangular, 1" acoustic lining' },
    rect_wrap_1:    { rect: 'rectangular with 1"',     round: 'round/oval with 1" acl',   label: 'rectangular, 1" external wrap' },
    rect_15:        { rect: 'rectangular with 1.5"',   round: 'round/oval with 1.5" acl', label: 'rectangular, 1-1/2" insulation' },
    oval_lined_1:   { rect: 'round/oval with 1" acl',  round: 'round/oval with 1" acl',   label: 'round / flat oval, 1" lining or wrap' },
    oval_15:        { rect: 'round/oval with 1.5" acl', round: 'round/oval with 1.5" acl', label: 'round / flat oval, 1-1/2" insulation' },
    oval_2:         { rect: 'round/oval with 2" acl',  round: 'round/oval with 2" acl',   label: 'round / flat oval, 2" insulation' }
  };
  // Shape from the specs picks the family. Insulation stays 1" ACL: NWAC Procore history (1,187 jobs) prices 1" ACL even when the spec
  // calls 1-1/2" liner or wrap (Sage, April Tax); 1.5"/2" families appear on only ~50 jobs — so thicker specs raise a note, not a new rate.
  function familyFor(spec) {
    if (!spec) return 'rect_lined_1';
    if (spec.choice && DUCT_FAMILIES[spec.choice]) return spec.choice;
    return /oval|round|spiral/i.test(spec.shape || '') ? 'oval_lined_1' : 'rect_lined_1';
  }
  function specNote(spec) {
    if (!spec || spec.choice) return '';
    var kind = String(spec.insulation_type || ''), t = spec.lining_in != null ? Number(spec.lining_in || 0) : 0;
    if (t >= 1.4) return 'spec calls ' + (t >= 1.9 ? '2"' : '1-1/2"') + ' liner — priced at the usual 1" ACL rate (NWAC practice); pick the ' + (t >= 1.9 ? '2"' : '1-1/2"') + ' family if you want it carried';
    if (/wrap|external/i.test(kind) && !/lin/i.test(kind)) return 'spec calls external wrap, not liner — priced at the usual 1" ACL rate; wrap by the insulation sub';
    return '';
  }

  function makeRates(norms) {
    var fam = {}, pipe = [], byName = {};
    (norms || []).forEach(function (n) {
      byName[(n.item || '').toLowerCase()] = n;
      if (n.kind === 'duct' && n.unit === 'Ft') {
        var m = String(n.item || '').match(/^\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s+(.*)$/i); if (!m) return;
        var z = { w: +m[1], h: +m[2], round: false }, suf = m[3].toLowerCase().replace(/\s+/g, ' ').trim();
        (fam[suf] = fam[suf] || []).push({ z: z, p: perim(z), cost: +n.unit_cost, hrs: +n.labor_hrs, item: n.item, projects: n.projects });
      }
      if (n.kind === 'pipe' && n.unit === 'Ft') pipe.push(n);
    });
    return { fam: fam, pipe: pipe, byName: byName };
  }

  function ductRate(R, size, shape, familyKey) {
    var z = sizeOf(size); if (!z) return null;
    var F = DUCT_FAMILIES[familyKey] || DUCT_FAMILIES.rect_lined_1;
    var isRound = shape === 'round' || z.round;
    if (isRound) z = { w: z.w, h: z.w, round: false };      // Procore names round ducts "8x8 round/oval"
    var suf = isRound ? F.round : F.rect, base = DUCT_FAMILIES.rect_lined_1.rect;
    var list = (R.fam && R.fam[suf]) || [], p = 2 * (z.w + z.h), scale = 1, note = '';
    if (list.length < 3 && R.fam && R.fam[base]) { list = R.fam[base]; scale = suf === base ? 1 : 1.1; note = ' (family ' + suf + ' not in catalog, +10% on the lined rate)'; }
    var exact = list.find(function (x) { return x.z.w === z.w && x.z.h === z.h; }) || list.find(function (x) { return x.z.w === z.h && x.z.h === z.w; });
    if (exact) return { cost: +(exact.cost * scale).toFixed(3), hrs: +(exact.hrs * scale).toFixed(3), basis: 'Procore rate "' + exact.item + '" (' + exact.projects + ' jobs)' + note };
    if (list.length) {
      var near = list.slice().sort(function (a, b) { return Math.abs(a.p - p) - Math.abs(b.p - p); })[0];
      return { cost: +(near.cost * p / near.p * scale).toFixed(3), hrs: +(near.hrs * scale).toFixed(3), basis: 'scaled from Procore "' + near.item + '" by perimeter' + note, flag: 'size not in catalog' };
    }
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
      if (/refrig|\(\d+ pipes\)/.test(nm)) return false;            // "refrigerant lines (2 pipes)" is not a 2" pipe
      return z && Math.abs(z.d - ps.d) < 0.01 && (/pvc/.test(nm) === pvc);
    });
    if (cands.length) {
      var c = cands.sort(function (a, b) { return b.projects - a.projects; })[0];
      return { cost: +c.unit_cost, hrs: +c.labor_hrs, basis: 'Procore rate "' + c.item + '" (' + c.projects + ' jobs)',
        flag: /steel|black|sch/.test(mat) ? 'copper rate used for steel pipe — confirm' : null };
    }
    // bigger than the catalog (NWAC rates stop at 4"): extend the copper curve per inch of diameter
    var big = R.pipe.filter(function (n) { var z = pipeSize(n.item); return z && !/pvc|refrig/i.test(n.item); }).sort(function (a, b) { return pipeSize(b.item).d - pipeSize(a.item).d; })[0];
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
  // "15", "ground", "roof"… from whatever the reader put in floor; null when it is not a level
  function levelKey(floor) {
    var fl = String(floor || '').trim().toLowerCase().replace(/^(level|floor|flr\.?)\s*/, '').replace(/(st|nd|rd|th)\s*(floor|fl\.?)?$/, '').trim();
    if (/^\d+$/.test(fl) || /^(g|gf|ground|lobby|ll|lower level|cellar|basement|b\d?|mezz\w*|roof|ph|penthouse)$/.test(fl)) return fl.replace(/^(gf|lobby|g)$/, 'ground');
    return null;
  }
  function sheetLabels(groups) { return Object.keys(groups).map(function (k) { var v = groups[k]; return v.length > 1 ? k + ' (' + v.join(' + ') + ')' : v[0]; }); }

  function collect(pages) {
    var sheets = pages.filter(function (p) { return p.result && !p.result.parse_error && p.sheet_type !== 'quote'; });
    var quotes = pages.filter(function (p) { return p.sheet_type === 'quote' && p.result && !p.result.parse_error && p.result.use !== false; });
    var sched = {}, planEq = {}, devices = {}, duct = {}, pipe = {}, demo = [], notes = [], questions = [], rig = [], floors = {}, wetTaps = 0, skipped = [], risers = [], pipeFloors = {}, geoCheck = [], ductSheets = {}, pipeSheets = {}, schedVav = {};
    // an overall plan at a small scale that repeats what the enlarged plans show (Sky Zone: M1.0 at 3/32" vs M2.0 at 3/16") must not be measured twice
    var enlargedPtft = 0, enlargedLabels = 0, ductDrops = false, coarseSet = {}, ductGeoPlans = 0;
    sheets.forEach(function (p) { var r = p.result, t = r.sheet_type || p.sheet_type || ''; if (t === 'enlarged' && r.geo && r.geo.total_ft > 0) { enlargedPtft = Math.max(enlargedPtft, r.geo.ptft || 0); enlargedLabels = Math.max(enlargedLabels, r.geo.labels || 0); } });
    sheets.forEach(function (p) {
      var r = p.result, t = r.sheet_type || p.sheet_type || '', sh0 = r.sheet_no || ('p' + p.page_no);
      if (t !== 'duct_plan' || !(r.geo && r.geo.total_ft > 0)) return;
      if (enlargedPtft > 0 && (r.geo.ptft || 0) <= 0.6 * enlargedPtft && (r.geo.labels || 0) < 12 && enlargedLabels >= 3 * (r.geo.labels || 0)) coarseSet[sh0] = 1; else ductGeoPlans++;
    });
    // enlarged plans carry the duct takeoff only when they replace a coarse overall plan (or nothing else was measurable)
    var useEnlargedGeo = Object.keys(coarseSet).length > 0 || ductGeoPlans === 0;
    sheets.forEach(function (p) {
      var r = p.result, sh = r.sheet_no || ('p' + p.page_no), type = r.sheet_type || p.sheet_type || '';
      var isDemo = type === 'demo' || /removal|demo/i.test(r.sheet_title || '');
      // "full size duct drop down from mechanical equipment on roof" — the drops are vertical and never appear as plan lines
      if (!isDemo && /drop[^.]{0,40}(down|from)[^.]{0,80}roof|roof[^.]{0,60}drop/i.test(JSON.stringify([r.notes, r.scope_notes, r.questions, r.equipment].filter(Boolean)))) ductDrops = true;
      // every level with work counts for shop drawings / T&B — numbered floors plus ground, cellar, mezzanine, roof, penthouse
      var fl = String(r.floor || '').trim().toLowerCase().replace(/^(level|floor|flr\.?)\s*/, '').replace(/(st|nd|rd|th)\s*(floor|fl\.?)?$/, '');
      if (fl && !/^(specs|legend|schedule|details|controls|riser)$/.test(type) && (/^\d+$/.test(fl) || /^(g|gf|ground|lobby|ll|lower level|cellar|basement|b\d?|mezz\w*|roof|ph|penthouse)$/.test(fl))) floors[fl.replace(/^(gf|lobby)$/, 'ground').replace(/^g$/, 'ground')] = 1;
      // shop drawings / T&B are priced per plan sheet that carries new work, not per level: Kastriot's Crozier = 5 duct plans + 2 enlarged
      // mechanical-room plans = 7, L'Catteron 2, Sage 1; T&B equals the ductwork SD count in 74% of NWAC's Procore estimates. Demo plans never count.
      if (!isDemo) {
        var ductRuns = (r.duct_runs || []).length, pipeRuns = (r.pipe_runs || []).length, planLike = type === 'enlarged' || (type === 'other' && /plan/i.test(r.sheet_title || ''));
        // Esquire M-101A/M-101B are one floor = one shop drawing (Kastriot: 3 floors, not 6 sheets); L'Catteron M-101/M-102 are both the 6th floor = 1;
        // Crozier's enlarged mechanical-room plans M-401/402 stay separate (his 7); a roof plan carrying only a couple of drops and an overall
        // plan superseded by enlarged plans (Sky Zone M1.0) do not count
        var lvl = levelKey(r.floor), dKey = (type === 'duct_plan' && lvl) ? 'level ' + lvl : sh, pKey = (type === 'pipe_plan' && lvl) ? 'level ' + lvl : sh;
        var roofOnly = lvl === 'roof' && ductRuns < 3 && !((r.geo || {}).total_ft > 50);
        if (!coarseSet[sh] && !roofOnly && ((type === 'duct_plan' && (ductRuns || (r.geo || {}).total_ft > 0)) || (planLike && ductRuns))) (ductSheets[dKey] = ductSheets[dKey] || []).push(sh);
        if ((type === 'pipe_plan' && (pipeRuns || (r.geo_pipe || {}).total_ft > 0)) || (planLike && pipeRuns)) (pipeSheets[pKey] = pipeSheets[pKey] || []).push(sh);
      }
      var eqList = [];
      (r.equipment || []).forEach(function (e0) {
        var tags = expandTags(e0.tag);
        tags.forEach(function (t) { eqList.push(Object.assign({}, e0, { tag: t, qty: tags.length > 1 ? 1 : e0.qty })); });
      });
      eqList.forEach(function (e) {
        var tag = norm(e.tag); if (!tag) return;
        if (type === 'schedule' || type === 'enlarged' || type === 'riser') {
          var s = sched[tag] = sched[tag] || { tag: tag, label: String(e.tag).trim(), qty: 0, sheets: [] };
          ['type', 'manufacturer', 'model', 'capacity', 'cfm', 'weight_lb', 'furnished_by', 'electrical', 'notes', 'location'].forEach(function (k) { if (e[k] && !s[k]) s[k] = e[k]; });
          if (type === 'schedule') s.qty = Math.max(s.qty, Number(e.qty || 0));
          s.sheets.push(sh);
        } else if (!isDemo) {
          var q = planEq[tag] = planEq[tag] || { tag: tag, label: String(e.tag).trim(), qty: 0, sheets: [], per: {} };
          var fl = String(r.floor || sh), f = q.per[fl] = q.per[fl] || {};
          f[type] = (f[type] || 0) + Number(e.qty || 1); q.sheets.push(sh);
          var perFloor = Object.keys(q.per).map(function (k) { return Math.max.apply(null, Object.values(q.per[k])); });
          q.qty = /\d/.test(tag) ? Math.max.apply(null, perFloor) : perFloor.reduce(function (a, b) { return a + b; }, 0);   // BOSS AHU-1 on M-100 + M-101, Esquire RTU-1 on floor + roof = 1 each
          if (!q.type && e.type) q.type = e.type;
          if (!q.notes && e.notes) q.notes = e.notes;
          if (!q.weight_lb && e.weight_lb) q.weight_lb = e.weight_lb;
          ['capacity', 'cfm', 'location'].forEach(function (k) { if (!q[k] && e[k]) q[k] = e[k]; });
        }
      });
      // a VAV / FPB schedule is the authoritative box count (plans repeat tags across sheet halves and ranges — Esquire: plans 71, schedule 43)
      if (type === 'schedule') (r.air_devices || []).forEach(function (a) { if (/vav|fpb/i.test(a.type || '') && a.tag) expandTags(a.tag).forEach(function (t) { schedVav[norm(t)] = 1; }); });
      // quantities come from the floor plans only; enlarged plans, details, risers and controls repeat what the plans show
      var takeoffSheet = type === 'duct_plan' || type === 'pipe_plan' || (type === 'other' && /plan/i.test(r.sheet_title || '') && !/enlarged/i.test(r.sheet_title || ''));
      if (!isDemo && !takeoffSheet && ((r.duct_runs || []).length || (r.pipe_runs || []).length || (r.air_devices || []).length))
        skipped.push(sh + ' (' + (type || 'sheet') + ')');
      var enlargedGeoSheet = !takeoffSheet && type === 'enlarged' && useEnlargedGeo && r.geo && r.geo.total_ft > 0;
      if (!isDemo && (takeoffSheet || enlargedGeoSheet)) {
        if (takeoffSheet) (r.air_devices || []).forEach(function (a) {
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
          var aiFt = (r.duct_runs || []).reduce(function (a, x) { return a + Number(x.lf || 0); }, 0);
          var coarseDup = !!coarseSet[sh];
          if (coarseDup) skipped.push(sh + ' (overall plan at a smaller scale — the enlarged plans cover it)');
          var weakGeo = r.geo && r.geo.total_ft > 0 && (((r.geo.labels || 0) < 15 && (r.geo.width_ft || 0) > 0.5 * r.geo.total_ft) ||
            ((r.geo.labels || 0) < 20 && aiFt > 2 * r.geo.total_ft * GEO_FITTINGS));
          if (weakGeo && !coarseDup) geoCheck.push({ sheet: sh, geo: 0, ai: aiFt, weak: Math.round(r.geo.total_ft), labels: r.geo.labels || 0 });
          if (!coarseDup && !weakGeo && r.geo && r.geo.total_ft > 0) {
            // measured from the drawing's own lines (geo-takeoff.js) — the AI's eyeball figure is kept only as a cross-check
            geoCheck.push({ sheet: sh, geo: r.geo.total_ft * GEO_FITTINGS, ai: aiFt });
            Object.keys(r.geo.sizes || {}).forEach(function (sz) {
              var z = sizeOf(sz); if (!z) return;
              var shape = /Ø/.test(sz) ? 'round' : 'rect';
              var k = shape + '|' + (z.round ? z.w : z.w + 'x' + z.h);
              var o = duct[k] = duct[k] || { shape: shape, size: z.round ? z.w + '"Ø' : z.w + 'x' + z.h, lf: 0, sheets: [], geo: true };
              o.lf += r.geo.sizes[sz] * GEO_FITTINGS; o.sheets.push(sh); o.geo = true;
            });
          }
          if (takeoffSheet && !coarseDup && (weakGeo || !(r.geo && r.geo.total_ft > 0))) (r.duct_runs || []).forEach(function (x) {
            var z = sizeOf(x.size); if (!z) return;
            var shape = x.shape === 'round' || x.shape === 'oval' || z.round ? 'round' : 'rect';
            var k = shape + '|' + (z.round ? z.w : z.w + 'x' + z.h);
            var o = duct[k] = duct[k] || { shape: shape, size: z.round ? z.w + '"Ø' : z.w + 'x' + z.h, lf: 0, sheets: [] };
            o.lf += Number(x.lf || 0); o.sheets.push(sh);
          });
          if (takeoffSheet && r.geo_pipe && r.geo_pipe.total_ft > 0) {
            // measured from the piping plan's own lines (geo-takeoff.js); the AI reading stays a cross-check
            var aiP = (r.pipe_runs || []).reduce(function (a, x) { return a + Number(x.lf || 0); }, 0);
            geoCheck.push({ sheet: sh, geo: r.geo_pipe.total_ft, ai: aiP, what: 'Pipe' });
            Object.keys(r.geo_pipe.sizes || {}).forEach(function (key) {
              var cd = / CD$/.test(key), sz = key.replace(/ CD$/, '');
              var k = (cd ? 'CD' : '') + '|' + sz + '|';
              var o = pipe[k] = pipe[k] || { service: cd ? 'CD' : '', size: sz, material: '', lf: 0, sheets: [], geo: true };
              o.lf += r.geo_pipe.sizes[key]; o.sheets.push(sh);
            });
          }
          if (takeoffSheet && !(r.geo_pipe && r.geo_pipe.total_ft > 0)) (r.pipe_runs || []).forEach(function (x) {
            var k = (x.service || '') + '|' + (x.size || '') + '|' + (x.material || '');
            var o = pipe[k] = pipe[k] || { service: x.service || '', size: x.size || '', material: x.material || '', lf: 0, sheets: [] };
            o.lf += Number(x.lf || 0); o.sheets.push(sh);
          });
        }
      }
      if (r.geo_riser && r.geo_riser.total_ft > 0) {
        // vertical pipe measured on the water riser diagram between its floor elevations (plans only show it as UP/DN)
        Object.keys(r.geo_riser.sizes || {}).forEach(function (key) {
          var cd = / CD$/.test(key), sz = key.replace(/ CD$/, '');
          var k = 'riser|' + (cd ? 'CD' : '') + '|' + sz;
          var o = pipe[k] = pipe[k] || { service: cd ? 'CD riser' : 'riser', size: sz, material: '', lf: 0, sheets: [], riser: true };
          o.lf += r.geo_riser.sizes[key]; o.sheets.push(sh);
        });
        risers.push(sh);
      }
      if (type === 'pipe_plan') pipeFloors[String(r.floor || sh)] = 1;
      if (isDemo) (r.demo || []).forEach(function (d) { demo.push({ item: d.item, qty: Number(d.qty || 0), sheet: sh }); });
      wetTaps += Number(r.wet_taps || 0);
      (r.rigging || []).forEach(function (x) { rig.push({ tag: String(x.tag || '').trim(), key: norm(x.tag), weight_lb: Number(x.weight_lb || 0), where: x.where, floor: x.floor, sheet: sh }); });
      (r.scope_notes || []).forEach(function (n) { if (n.mech_scope) notes.push({ sheet: sh, source: n.source, text: n.text, often_missed: !!n.often_missed }); });
      (r.questions || []).forEach(function (q) { questions.push({ sheet: sh, q: q }); });
    });
    return { sched: sched, planEq: planEq, devices: devices, duct: duct, pipe: pipe, demo: demo, notes: notes, questions: questions,
      rig: rig, floors: Object.keys(floors), ductSheets: sheetLabels(ductSheets), pipeSheets: sheetLabels(pipeSheets), schedVav: Object.keys(schedVav).length, ductDrops: ductDrops, wetTaps: wetTaps, skipped: skipped, geoCheck: geoCheck, risers: risers, pipeFloors: Object.keys(pipeFloors), quotes: quotes.map(function (p) { return p.result; }) };
  }

  // ── build the breakdown ──────────────────────────────────────────────
  function build(pages, opts) {
    opts = opts || {};
    var R = makeRates(opts.norms), C = collect(pages), lines = [], flags = [], sort = 0;
    var famKey = familyFor(opts.ductSpec);
    if (!opts.ductSpec) flags.push({ category: 'ductwork', item: 'Duct construction', flag: 'not read from the specs — priced as rectangular with 1" lining; run 🔍 Duct spec' });
    else if (opts.ductSpec.confidence === 'low') flags.push({ category: 'ductwork', item: 'Duct construction', flag: 'spec reading uncertain — ' + DUCT_FAMILIES[famKey].label + '; confirm' });
    if (specNote(opts.ductSpec)) flags.push({ category: 'ductwork', item: 'Duct construction', flag: specNote(opts.ductSpec) });
    function add(cat, d, qty, unit, mat, hrs, basis, extra) {
      var l = Object.assign({ category: cat, description: d, quantity: +(+qty).toFixed(4), unit: unit, unit_material_cost: +(+mat || 0).toFixed(4),
        unit_labor_hours: +(+hrs || 0).toFixed(4), labor_crew_type: cat === 'pipework' ? 'pipe' : cat === 'services' ? 'none' : 'sm',
        is_firm: true, is_wet_tap: false, sort_order: ++sort, basis: basis }, extra || {});
      if (l.flag) flags.push({ category: cat, item: d, flag: l.flag });
      lines.push(l); return l;
    }
    // SD / T&B count: session override → plan sheets with new ductwork → levels named on the sheets → 1
    var floors = Number(opts.floors) || C.ductSheets.length || C.floors.length || 1;
    var sdBasis = Number(opts.floors) ? 'session override' : C.ductSheets.length ? 'plan sheets with new ductwork: ' + C.ductSheets.join(', ') :
      C.floors.length ? 'levels named on the sheets: ' + C.floors.join(', ') : 'no plan sheet read — 1 assumed';

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
      var r = ductRate(R, d.size, d.shape, famKey); ductFt += d.lf;
      add('ductwork', d.size + ' duct — ' + (d.shape === 'round' ? DUCT_FAMILIES[famKey].round.replace(/acl/, 'ACL') : DUCT_FAMILIES[famKey].label) + ' — ' + Math.round(d.lf) + ' ft', d.lf, 'lf', r.cost, r.hrs,
        r.basis + (d.geo ? ' · measured from the drawing lines on ' + uniq(d.sheets).join(', ') + ' (+8% fittings)' : ' · AI estimate from ' + uniq(d.sheets).join(', ')),
        { flag: r.flag || null });
    });
    // rooftop units drop full-size supply and return ducts through the roof to a drop box — no plan line shows them (Kastriot, Sky Zone:
    // 40x24 for 5–6,000 CFM, 48x14 for 8,750 CFM, ≈27 ft per unit). Sized at 1,000 fpm, 1.7:1 aspect, 2 drops × 14 ft per unit, flagged.
    var dropTags = Object.keys(C.sched); Object.keys(C.planEq).forEach(function (t) { if (!C.sched[t]) dropTags.push(t); });
    dropTags.sort().forEach(function (tag) {
      var s = C.sched[tag] || C.planEq[tag], about = [s.type, s.notes, s.cfm, s.capacity, tag].join(' ').toLowerCase();
      if (!/rooftop|\brtu\b|packaged unit|\bdoas\b/.test(about) || /\bvrf\b|condens|heat pump unit/.test(about)) return;
      if (!(C.ductDrops || /drop/.test(about))) return;
      var m = /(\d[\d,]{2,})\s*cfm/.exec(about), cfm = m ? +m[1].replace(/,/g, '') : 0, size = '24x12';
      if (cfm) { var A = cfm / 1000 * 144, hh = Math.max(8, Math.round(Math.sqrt(A / 1.7) / 2) * 2), ww = Math.max(hh, Math.round(A / hh / 2) * 2); size = ww + 'x' + hh; }
      var qty = Math.max(1, (C.planEq[tag] && C.planEq[tag].qty) || s.qty || 1), lf = qty * 2 * 14, rd = ductRate(R, size, 'rect', famKey); ductFt += lf;
      add('ductwork', size + ' duct — ' + (s.label || tag) + ' supply + return drops through the roof — ' + lf + ' ft', lf, 'lf', rd.cost, rd.hrs,
        rd.basis + ' · 2 drops × 14 ft per unit, size from ' + (cfm ? cfm + ' CFM at 1,000 fpm' : 'a 24x12 default'),
        { is_firm: false, flag: 'roof drops are not on the plan — 2 × 14 ft per unit budgeted; confirm the height and size' });
    });
    C.geoCheck.forEach(function (g) {
      if (g.weak) { flags.push({ category: 'ductwork', item: 'Duct length ' + g.sheet, flag: 'drawing geometry (' + g.weak + ' ft, ' + g.labels + ' labels, mostly width-guessed) not trusted — AI reading ' + Math.round(g.ai) + ' ft used' }); return; }
      if (g.ai && Math.abs(g.geo - g.ai) / Math.max(g.geo, g.ai) > 0.35)
        flags.push({ category: g.what === 'Pipe' ? 'pipework' : 'ductwork', item: (g.what || 'Duct') + ' length ' + g.sheet, flag: 'drawing geometry ' + Math.round(g.geo) + ' ft vs AI reading ' + Math.round(g.ai) + ' ft — geometry used; check the sheet' });
    });
    if (C.pipeFloors.length >= 2 && !C.risers.length)
      flags.push({ category: 'pipework', item: 'Pipe risers', flag: 'piping on ' + C.pipeFloors.length + ' floors but no water riser diagram measured — vertical pipe between floors is not in this estimate' });
    if (Object.keys(C.duct).length && !C.geoCheck.some(function (g) { return g.what !== 'Pipe'; }))
      flags.push({ category: 'ductwork', item: 'Duct lengths', flag: 'AI estimate only (no measurable vector lines) — typically ±30%; check or run 📐 Measure ducts' });
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
      add('pipework', [p.size, p.material, p.service].filter(Boolean).join(' ') + ' — ' + Math.round(p.lf) + ' ft', p.lf, 'lf', r.cost, r.hrs,
        r.basis + (p.riser ? ' · vertical pipe measured between the floor elevations on ' : p.geo ? ' · measured from the piping plan lines on ' : ' · AI estimate from ') + uniq(p.sheets).join(', '), { flag: r.flag || null });
    });
    if (C.wetTaps) add('pipework', 'Wet-tap connection' + (C.wetTaps > 1 ? 's' : ''), C.wetTaps, 'ea', STD.wetTap, 0, 'Standard — $10,000 per connection (sub)', { is_wet_tap: true, labor_crew_type: 'none' });
    // VRF / split indoor units need a line set and a condensate drain even when the plans show no piping (Kastriot, Sky Zone: 307 ft
    // refrigerant + 273 ft 1" copper for 12 indoor units) — budget 25 ft + 20 ft per unit, flagged
    var vrfUnits = 0, refrigFt = 0;
    Object.keys(C.pipe).forEach(function (k) { if (/refrig|rs\/rl|\brl\b|\brs\b/i.test(C.pipe[k].service || '')) refrigFt += C.pipe[k].lf || 0; });
    var vrfTags = Object.keys(C.sched); Object.keys(C.planEq).forEach(function (t) { if (!C.sched[t]) vrfTags.push(t); });
    vrfTags.forEach(function (tag) {
      var s = C.sched[tag] || C.planEq[tag], about = ((s.type || '') + ' ' + (s.notes || '') + ' ' + tag).toLowerCase();
      if (!/vrf|vrv|ductless|cassette|mini[- ]?split|split system|indoor unit|wall[- ]mounted unit/.test(about)) return;
      if (/condens|outdoor|heat pump unit|rooftop|branch selector|\bbs-|\bcu-|existing|to remain/.test(about)) return;
      vrfUnits += Math.max(1, (C.planEq[tag] && C.planEq[tag].qty) || s.qty || 1);
    });
    if (vrfUnits && refrigFt < 10 * vrfUnits) {
      hasPipe = true;
      var rr = pipeRate(R, { service: 'refrigerant' }), cr = pipeRate(R, { size: '1"', material: 'copper', service: 'cd' }), needFt = vrfUnits * 25 - refrigFt;
      add('pipework', 'Refrigerant line sets — ' + vrfUnits + ' VRF / split indoor unit' + (vrfUnits > 1 ? 's' : '') + ' (budget ' + Math.round(needFt) + ' ft)', needFt, 'lf', rr.cost, rr.hrs,
        rr.basis + ' · budget 25 ft per indoor unit, no refrigerant piping read on the plans', { is_firm: false, flag: 'refrigerant piping not on the plans — 25 ft per indoor unit budgeted; confirm routing' });
      add('pipework', 'Condensate 1" copper — ' + vrfUnits + ' VRF / split indoor unit' + (vrfUnits > 1 ? 's' : '') + ' (budget ' + vrfUnits * 20 + ' ft)', vrfUnits * 20, 'lf', cr.cost, cr.hrs,
        cr.basis + ' · budget 20 ft per indoor unit', { is_firm: false });
    }

    // 5. Equipment install (every scheduled unit we furnish or set; units shown only on plans too)
    var eqTags = Object.keys(C.sched);
    Object.keys(C.planEq).forEach(function (tag) { if (!C.sched[tag]) eqTags.push(tag); });
    eqTags.sort().forEach(function (tag) {
      var s = C.sched[tag] || C.planEq[tag];
      if (!C.sched[tag] && !/unit|fan|pump|heater|ac|hp|fcu|ahu|rtu|doas|curtain|cooler|tank|separator|humidifier|crac|split|vrf|condens/i.test((s.type || '') + ' ' + tag)) return;
      if (/diffuser|grille|register|vav|damper|louver|variable air volume|terminal unit|fan[- ]powered|\bcav\b|fire suppression|ansul|smoke detector|\bduct\b|connection/i.test((s.type || '') + ' ' + (s.label || tag))) return;
      if (!isRealTag(s.label || tag) && (!C.sched[tag] || !(C.sched[tag].qty > 0) || /\(/.test(s.label || tag))) return;
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
    // VAV / CAV / fan-powered boxes that the reader listed as equipment instead of air devices
    var devTags = {}; Object.keys(C.devices).forEach(function (k) { if (C.devices[k].tag) devTags[norm(C.devices[k].tag)] = 1; });
    var boxTags = {};
    [C.planEq, C.sched].forEach(function (src) {
      Object.keys(src).forEach(function (tag) {
        var e = src[tag], what = (e.type || '') + ' ' + (e.label || tag);
        if (devTags[tag] || boxTags[tag] || !/\b(vav|cav|fpb)\b|terminal unit|fan[- ]powered|air valve/i.test(what)) return;
        if (/existing|to remain|reference only/i.test((e.type || '') + ' ' + (e.notes || ''))) return;
        boxTags[tag] = 1;
        var n = Math.max(1, Number(e.qty) || 1);
        if (/fpb|fan[- ]powered/i.test(what)) ao.fpb += n; else ao.vavd += n;
      });
    });
    if (ao.outlet) add('air_outlets', 'Diffusers / grilles / registers', ao.outlet, 'ea', 0, STD.airOutlet, 'Air Outlets Standards — 1.6 hr each');
    if (ao.linear) add('air_outlets', 'Linear diffusers', ao.linear, 'lf', 0, STD.linearPerFt, 'Air Outlets Standards — 0.8 hr/ft', ao.linearGuess ? { flag: 'some lengths not shown — counted 4 ft per piece; check the plans' } : null);
    if (ao.vavd) add('air_outlets', 'VAV boxes / fire-smoke / motorized dampers', ao.vavd, 'ea', 0, STD.vavOrDamper, 'Air Outlets Standards — 2.67 hr each');
    if (ao.fpb) add('air_outlets', 'Fan-powered boxes', ao.fpb, 'ea', 0, STD.fpb, 'Air Outlets Standards — 8 hr each');

    // standalone controls only when there is no BMS quote (Standalone Controls Standards)
    var vavCount = C.schedVav || Object.keys(C.devices).reduce(function (a, k) { return a + (C.devices[k].type === 'vav' || C.devices[k].type === 'fpb' ? C.devices[k].qty : 0); }, 0);
    if (!bms && vavCount) add('equipment', 'Standalone VAV controls (no BMS quote)', vavCount, 'ea', STD.vavControls + STD.thermostat + STD.tstatWiring, 1.6,
      'Standalone Controls — $1,000/VAV + thermostat $500 + wiring $50; 10/day install', { is_firm: false, flag: 'replace with BMS quote if one comes in' });

    // 7. Services
    add('services', 'Ductwork shop drawings — ' + floors + ' plan sheet' + (floors > 1 ? 's' : ''), floors, 'floor', STD.ductSD, 0, 'Standard — $2,500 per plan sheet (' + sdBasis + ')');
    // piping shop drawings per plan sheet with new piping (pipe plans + enlarged mechanical-room plans; Kastriot 360 Lexington: piping SD on 1 of 3 floors)
    var pipeFl = Number(opts.floors) ? Math.min(floors, C.pipeSheets.length || C.pipeFloors.length || floors) : (C.pipeSheets.length || Math.min(floors, C.pipeFloors.length || floors));
    if (hasPipe) add('services', 'Piping shop drawings — ' + pipeFl + ' plan sheet' + (pipeFl > 1 ? 's' : ''), pipeFl, 'floor', STD.pipeSD, 0,
      'Standard — $1,300 per plan sheet with new piping' + (C.pipeSheets.length ? ' (' + C.pipeSheets.join(', ') + ')' : C.pipeFloors.length ? ' (levels ' + C.pipeFloors.join(', ') + ')' : ''));
    if (!C.quotes.some(function (q) { return q.kind === 'tab'; }))
      add('services', 'Testing & balancing — ' + floors + ' plan sheet' + (floors > 1 ? 's' : ''), floors, 'floor', STD.tab, 0, 'Standard — $2,500 per plan sheet, same count as the ductwork shop drawings');
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
    return { lines: lines, totals: totals, flags: grouped, collected: C, floors: floors, sdBasis: sdBasis, pipeSheets: pipeFl, ductCheck: ductCheck };
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

  window.NWEngine = { build: build, collect: collect, ductRate: ductRate, pipeRate: pipeRate, makeRates: makeRates, installHours: installHours, STD: STD, DUCT_FAMILIES: DUCT_FAMILIES, familyFor: familyFor };
})();
