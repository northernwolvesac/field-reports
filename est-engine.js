// NWAC pricing engine — turns what the AI read on every sheet + the vendor quotes into a cost breakdown,
// using Kastriot's Estimating Standards (Reference/Estimating Standards) and NWAC's Procore unit rates (est_norms).
// Output lines use the estimate_line_items shape, so they drop straight into estimating.html.
// Every line carries `basis` (where the number comes from) and `flag` (what a person must check).
(function () {
  var LABOR_RATE = 60;
  // Per-organisation estimating settings (est_orgs.settings, edited on est-orgs.html) — an empty value keeps the NWAC standard:
  //   labor_rate ($/h), overhead_pct / misc_pct / tax_rate (fractions, 0.2 = 20 %), ofci_overhead_pct (overhead when OFCI),
  //   duct_family (DUCT_FAMILIES key used when no spec was read), duct_sd / pipe_sd / tab / lift (services $ per plan sheet / per job)
  function orgSettings(s) {
    s = s || {};
    function n(v) { var x = Number(v); return (v === null || v === undefined || v === '' || !isFinite(x)) ? null : x; }
    return { labor_rate: n(s.labor_rate), overhead_pct: n(s.overhead_pct), ofci_overhead_pct: n(s.ofci_overhead_pct), misc_pct: n(s.misc_pct), tax_rate: n(s.tax_rate),
      duct_family: s.duct_family || null, duct_sd: n(s.duct_sd), pipe_sd: n(s.pipe_sd), tab: n(s.tab), lift: n(s.lift) };
  }
  var GEO_FITTINGS = 1.08;   // elbows, transitions, tees are not straight wall pairs — calibrated on 4 NWAC bids (L'Catteron −17 %, April Tax −14 %, Sage −2 %, Crozier +3 % raw)

  // ── Kastriot's standards ─────────────────────────────────────────────
  var STD = {
    airOutlet: 1.6, linearPerFt: 0.8, vavOrDamper: 2.67, fpb: 8,           // Air Outlets Installation Standards
    wetTap: 10000,                                                          // Pricing and Markup Standards
    ductSD: 2500, pipeSD: 1300, tab: 2500,                                  // Shop Drawings and Testing (per floor)
    lift: 2500,                                                             // Man-lift / scaffolding (NWAC "Man-lift, scafoldings", per job)
    thermostat: 500, sensor: 400, tstatWiring: 50, vavControls: 1000        // Standalone Controls Standards
  };
  // Equipment Installation Standards: man-hours per unit
  // a unit is something with a tag on it (EF-1, AC-10-2, AH-1.10, EDH-G-1); detail titles and legend rows ("AC UNIT (ceiling mounted",
  // "Fan-Coil (hanging)", "EF (typical)") that the reader lists as equipment are not units — Sage carried 9 such phantoms (288 h)
  function isRealTag(t) { t = String(t || '').trim(); return /^[A-Za-z]{1,6}([-\s]?[A-Za-z]{1,2})?[-\s]?\d[\w.\-\/]*$/.test(t) && !/[()]|typ/i.test(t) && t.split(/\s+/).length <= 2; }
  // Equipment budgets for scheduled units nobody quoted — Kastriot never leaves a unit at $0: he carries a flagged budget
  // (Sky Zone ERV-1 $15,000, New Balance York AHU/CU pairs $7,000 each, Life Time WSHPs $6,000 each, fin tubes $1,000, smoke detectors $500).
  // Numbers below are rounded from his bids and the vendor quotes read on 2026 jobs; every line is flagged "budget — get a quote".
  function tonsOf(s) {
    var t = [s.capacity, s.notes, s.model, s.type].join(' ');
    var m = /(\d+(?:\.\d+)?)\s*-?\s*ton/i.exec(t); if (m) return +m[1];
    m = /(\d{2,3}(?:,\d{3})?)\s*(?:mbh|kbtu)/i.exec(t); if (m) return +m[1].replace(/,/g, '') / 12;
    m = /(\d{2,3},?\d{3})\s*btu/i.exec(t); if (m) return +m[1].replace(/,/g, '') / 12000;
    m = /\b(\d{3})\b/.exec(String(s.model || '')); if (m && /rtu|ahu|split|heat pump|condens|packaged/i.test(s.type || '')) { var n = +m[1]; if (n % 6 === 0 && n <= 600) return n / 12; }
    return 0;
  }
  function cfmOf(s) { var m = /(\d[\d,]{2,})\s*cfm/i.exec([s.cfm, s.capacity, s.notes].join(' ')); return m ? +m[1].replace(/,/g, '') : 0; }
  function budgetFor(s, tag) {
    var t = ((s.type || '') + ' ' + tag).toLowerCase(), tons = tonsOf(s), cfm = cfmOf(s), b = null;
    function pick(cost, why) { b = { cost: Math.round(cost / 50) * 50, why: why }; }
    if (/smoke detector/.test(t)) pick(500, 'duct smoke detector allowance');
    else if (/thermostat|sensor/.test(t)) pick(500, 'thermostat / sensor allowance');
    else if (/fin[- ]?tube|baseboard|convector/.test(t)) pick(1000, 'fin tube / baseboard budget');
    else if (/condensate pump/.test(t)) pick(400, 'condensate pump budget');
    else if (/air curtain/.test(t)) pick(3500, 'air curtain budget');
    else if (/duct heater|\bedh\b|electric heater|unit heater/.test(t)) pick(1800, 'electric heater budget');
    // transfer vents / sound silencers are a few hundred dollars; the tag is carried without spaces ("transfervent ct12"), which contains "erv"
    else if (/transfer (vent|duct|grille|silencer|air)|sound (silencer|trap)|transfervent/.test(t)) pick(450, 'transfer duct / sound silencer budget')
    else if (/(^|[^a-z])erv(?![a-z])|energy recovery|heat recovery|\bhrv\b|\bdoas\b|dedicated outdoor/.test(t)) pick(Math.max(8000, (cfm || 500) * 25), 'ERV / DOAS budget — $25 per CFM' + (cfm ? '' : ' (500 CFM assumed)'));
    else if (/boiler/.test(t)) pick(6000, 'boiler budget');
    else if (/crac|computer room|liebert/.test(t)) pick(Math.max(25000, (tons || 3) * 9000), 'CRAC budget — $9,000 per ton');
    else if (/vrf|vrv/.test(t) && /outdoor|condens|heat recovery unit|\bcu\b/.test(t)) pick(Math.max(12000, (tons || 8) * 3000), 'VRF outdoor unit budget — $3,000 per ton');
    else if (/branch selector|\bbs\b/.test(t)) pick(2500, 'branch selector budget');
    else if (/vrf|vrv|cassette|ductless|mini[- ]split|wall[- ]mount/.test(t)) pick(2800, 'VRF / ductless indoor unit budget');
    else if (/water[- ]?source|wshp|water[- ]cooled|water cooled|\bwchp\b/.test(t)) pick(Math.max(5000, (tons || 3) * 3000), 'water-source heat pump budget — $3,000 per ton');
    else if (/\brtu\b|rooftop|roof[- ]?top|make[- ]?up air|\bmua\b|packaged rooftop|\bdoas\b/.test(t)) pick(Math.max(8000, (tons || 5) * 2200), 'rooftop / make-up air unit budget — $2,200 per ton');
    else if (/split|condens|heat pump|\bacc?u\b|\bcu\b/.test(t)) pick(Math.max(3000, (tons || 3) * 1100), 'split / condensing unit budget — $1,100 per ton');
    else if (/\bahu\b|air handl|fan coil|\bfcu\b/.test(t)) pick(Math.max(3000, (tons || 3) * 1200), 'air handler / fan coil budget — $1,200 per ton');
    else if (/hood|grease duct|\bkeh\b|make[- ]?up air|\bmua\b/.test(t)) pick(9000, 'kitchen hood / make-up air budget');
    else if (/kitchen exhaust fan|\bkef\b|upblast/.test(t)) pick(3500, 'kitchen exhaust fan budget');
    else if (/roof|upblast|downblast/.test(t) && /fan|exhaust/.test(t)) pick(3500, 'roof exhaust fan budget');
    else if (/fan|exhaust|transfer|\bef\b|\btf\b|\bsf\b|\brf\b/.test(t)) pick(cfm > 1500 ? 4500 : 1800, 'inline / cabinet fan budget');
    else if (/pump/.test(t)) pick(5000, 'pump budget');
    else if (/humidif/.test(t)) pick(8000, 'humidifier budget');
    else if (/louver/.test(t)) pick(1200, 'louver budget');
    else if (/unit|heater|cooler|tank|separator|filter|silencer|\bvfd\b/.test(t)) pick(tons ? Math.max(4000, tons * 2000) : 4000, 'equipment budget');
    return b;
  }
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
    if (!w && /\bpump\b/.test(t) && !/heat pump/.test(t)) return { h: 8, basis: 'weight not shown — small pump (1/2 day, 2 men)', flag: 'weight unknown' };
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
  function familyFor(spec, dflt) {
    dflt = (dflt && DUCT_FAMILIES[dflt]) ? dflt : 'rect_lined_1';
    if (!spec) return dflt;
    if (spec.choice && DUCT_FAMILIES[spec.choice]) return spec.choice;
    return /oval|round|spiral/i.test(spec.shape || '') ? 'oval_lined_1' : dflt;
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
  // the device tags a sheet actually prints: the PDF text layer's tag census, plus the OCR words of an outlined-text sheet (414 W 14th:
  // "CD" x5 in the OCR, nothing in the text layer)
  function devWords(p) {
    var r = (p && p.result) || {}, w = {}, dt = (p && p.tag_counts && p.tag_counts.devices) || {};
    Object.keys(dt).forEach(function (k) { if (k !== '(cfm only)') w[norm(k)] = (w[norm(k)] || 0) + (Number(dt[k]) || 0); });
    (r.ocr_words || []).forEach(function (x) { var t = norm(String(x && x[0] || '').trim()); if (/^[A-Z]{1,3}\d{0,2}$/.test(t)) w[t] = (w[t] || 0) + 1; });
    return w;
  }
  // a row the reader counted from drawn symbols ("A" x24 "repeated across plan grid") on a sheet whose real device tags it also read
  // from the text (CD x4, CG x4): the tags are the truth there, a symbol family that never appears as a printed tag is grid bubbles,
  // column marks or legend art, not outlets (414 W 14th: Vladimir 8 outlets, the reader 8 + 24 "A"). Untagged sheets keep their
  // symbol counts (that is what the glyph census is for).
  // a symbol row the reader named by its look as a coloured BAR ("pink bar register/grille (main duct drops)", CENTRALE) is a run of
  // slot / linear diffuser, not n outlets: the drawing's fill census gives the mean bar length of that colour → linear feet
  var COLOUR_RE = /\b(pink|blue|green|yellow|orange|red|cyan|purple|magenta|gray|grey)\b/i;
  function colourBar(a, p) {
    if (!a || String(a.basis || '').toLowerCase() !== 'symbols') return null;
    var s = String(a.tag || '') + ' ' + String(a.notes || ''), fb = p && p.result && p.result.geo && p.result.geo.fill_bars;
    if (!fb || !/\bbar\b/i.test(s)) return null;
    var m = COLOUR_RE.exec(String(a.tag || '')) || COLOUR_RE.exec(s); if (!m) return null;
    var col = m[1].toLowerCase().replace('grey', 'gray').replace('magenta', 'pink'), f = fb[col];
    return f && f.mean_ft >= 1 ? { colour: col, mean_ft: f.mean_ft, n_drawn: f.n, ft_drawn: f.ft } : null;
  }
  function symbolRowDropped(a, p) {
    if (!a || String(a.basis || '').toLowerCase() !== 'symbols') return false;
    // only a row named by a bare code (A, A2, TD, RD-B) can be grid bubbles; a row the reader named by its look ("blue square-X ceiling
    // supply diffuser", CENTRALE's 36 outlets) is a symbol census on purpose and stays
    var tag = String(a.tag || '').trim().toUpperCase(), fam = (/^([A-Z]{1,3})/.exec(tag) || [])[1];
    if (!/^[A-Z]{1,3}-?\d{0,2}[A-Z]?$/.test(tag) || !fam) return false;
    var r = (p && p.result) || {}, w = devWords(p);
    // the sheet's printed tags must be outlet tags (CD / CG on 414); AD / ID-7 equipment codes beside a census of unlabelled diffusers
    // (CENTRALE) do not make it a tagged-outlet sheet
    var tagRows = (r.air_devices || []).filter(function (x) { return x !== a && String(x.basis || '').toLowerCase() === 'tags' && w[norm(x.tag)] > 0 && /diffuser|grille|register|linear|louver/i.test(String(x.type || '')); });
    if (!tagRows.length) return false;
    return !(w[norm(tag)] > 0 || w[fam] > 0);   // the code or its family (RD for RD-B) printed anywhere → a real device row
  }
  // "15", "ground", "roof"… from whatever the reader put in floor; null when it is not a level
  function levelKey(floor) {
    var fl = String(floor || '').trim().toLowerCase().replace(/^(level|floor|flr\.?)\s*/, '').replace(/(st|nd|rd|th)\s*(floor|fl\.?)?$/, '').trim();
    if (/^\d+$/.test(fl) || /^(g|gf|ground|lobby|ll|lower level|cellar|basement|b\d?|mezz\w*|roof|ph|penthouse)$/.test(fl)) return fl.replace(/^(gf|lobby|g)$/, 'ground');
    return null;
  }
  function sheetLabels(groups) { return Object.keys(groups).map(function (k) { var v = groups[k]; return v.length > 1 ? k + ' (' + v.join(' + ') + ')' : v[0]; }); }

  function collect(pages, opts) {
    opts = opts || {};
    // tags that are never air devices however the reader typed them (BOSS: 60 sprinkler heads "SP" came back as grilles)
    function notAirDevice(a) {
      var t = String(a.tag || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), nt = String(a.notes || '') + ' ' + String(a.size || '');
      return /^(SP|SPR|FE|FEC|FA|FACP|T|TS|TSTAT|SD|GB|CO2|EX|EXIT|OS|PS|WAP)$/.test(t) || /sprinkler|thermostat|smoke detector|fire extinguisher|gypsum|exit sign|not (an )?hvac/i.test(nt);
    }
    var sheets = pages.filter(function (p) { return p.result && !p.result.parse_error && p.sheet_type !== 'quote'; });
    var quotes = pages.filter(function (p) { return p.sheet_type === 'quote' && p.result && !p.result.parse_error && p.result.use !== false; });
    var symDropped = [], colourBars = [];
    var sched = {}, planEq = {}, devices = {}, slotUsed = {}, slotSheets = {}, duct = {}, pipe = {}, demo = [], notes = [], questions = [], rig = [], floors = {}, wetTaps = 0, skipped = [], risers = [], pipeFloors = {}, geoCheck = [], ductSheets = {}, pipeSheets = {}, schedVav = {}, ductRisers = { n: 0, ft: 0, sheets: [] }, srSheets = [], srDoubled = [], srSingle = [], devCheck = [], linGeoUsed = {}, linGeoSheets = {};
    // the air-device schedule names what each plan tag is: a plan row tagged "A1" is whatever the schedule says A1 is (BOSS: A1 / A2 / A3 /
    // R1 / R2 are 4-ft, 2-ft, 4-ft linear slots the reader typed as diffusers; B1 / B2 / R3 are diffusers and a grille)
    var schedDev = {};
    function slotLenFt(txt) {
      txt = String(txt || '');
      var m = /(\d+)\s*'\s*-?\s*(\d+)?\s*"?/.exec(txt); if (m && /'/.test(m[0])) return (+m[1]) + (m[2] ? +m[2] / 12 : 0);
      var ins = []; var re = /(\d{2,3})\s*(?:in\b|")/gi, q; while ((q = re.exec(txt))) ins.push(+q[1]);
      ins = ins.filter(function (v) { return v >= 24; }); if (ins.length) return Math.max.apply(null, ins) / 12;
      var ft = /(\d+(?:\.\d+)?)\s*(?:ft|feet|lf)\b/i.exec(txt); return ft ? +ft[1] : 0;
    }
    pages.forEach(function (p) {
      var r = p.result || {}, t = r.sheet_type || p.sheet_type;
      if (t !== 'schedule' && t !== 'legend') return;
      (r.air_devices || []).forEach(function (a) {
        if (!a.tag || !a.type || /vav|fpb/i.test(a.type)) return;
        expandTags(a.tag).forEach(function (tg) { var k = norm(tg); if (!k || k.length > 6) return; schedDev[k] = { type: String(a.type).toLowerCase(), len: slotLenFt((a.size || '') + ' ' + (a.notes || '')) }; });
      });
    });
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
        // air-device census of this sheet: what the reader counted vs the device tags in the PDF text layer ("C (150)", "D (200) TYP. 3")
        if (takeoffSheet && (r.air_devices || []).length) {
          var dtags = (p.tag_counts && p.tag_counts.devices) || {}, tagN = 0, cfmOnly = Number(dtags['(cfm only)'] || 0), aiN = 0, aiCfm = 0;
          Object.keys(dtags).forEach(function (t) { if (t !== '(cfm only)') tagN += Number(dtags[t] || 0); });
          (r.air_devices || []).forEach(function (a) {
            if (/^\(?\s*cfm only\s*\)?$/i.test(String(a.tag || '').trim())) { aiCfm += Number(a.qty || 0); return; }   // a bare '(cfm only)' row; 'blue square-X diffuser (cfm only)' is a real symbol row
            if (notAirDevice(a) || symbolRowDropped(a, p) || colourBar(a, p)) return;   // a coloured-bar row is linear feet, not outlets
            if (/diffuser|grille|register|linear|louver/.test(String(a.type || '').toLowerCase())) aiN += Number(a.qty || 0);   // TD transfer ducts / dampers (type other) carry no cfm tag
          });
          devCheck.push({ sheet: sh, ai: aiN, tags: tagN, cfmOnly: cfmOnly || aiCfm, hasTags: !!(p.tag_counts && p.tag_counts.devices) });
        }
        // slot-glyph pre-pass: which linear family gets the sheet's drawn feet (the first whose schedule length matches a drawn length, else the first linear family)
        var linSecs = 0, slotCreditTag = '', slotLens = (r.geo && r.geo.slots && r.geo.slots.lens) || null;
        if (takeoffSheet) (r.air_devices || []).forEach(function (a) {
          var t0 = String(a.type || '').toLowerCase(), sd0 = schedDev[norm(a.tag)];
          if (notAirDevice(a) || !(t0 === 'linear' || (sd0 && sd0.type === 'linear'))) return;
          linSecs += Number(a.qty || 0);
          var lk0 = sd0 && sd0.len ? String(Math.round(sd0.len * 2) / 2) : '';
          if (!slotCreditTag || (slotLens && lk0 && slotLens[lk0] && !slotCreditTag.covered)) slotCreditTag = { tag: norm(a.tag), covered: !!(slotLens && lk0 && slotLens[lk0]) };
        });
        slotCreditTag = slotCreditTag ? slotCreditTag.tag : '';
        // plain-bar slots (geo.bar_slots): the sheet's thin un-X-ed rectangles go to the linear rows that have no length at all — no schedule
        // length, no reader feet, no X-ed glyph of their length (BOSS R1/R2 "1 in slot, see plan", Esquire "C varies") — capped at twice
        // their section count (the longest bars first); dampers share the shape, so rows with a length never take them
        var noLenSecs = 0, barFt = 0, barUsed = false, barN = 0;
        if (takeoffSheet && r.geo && r.geo.bar_slots && r.geo.bar_slots.n) (r.air_devices || []).forEach(function (a) {
          var t1 = String(a.type || '').toLowerCase(), sd1 = schedDev[norm(a.tag)];
          if (notAirDevice(a) || !(t1 === 'linear' || (sd1 && sd1.type === 'linear'))) return;
          if ((sd1 && sd1.len) || Number(a.linear_ft || 0)) return;
          var lk1 = sd1 && sd1.len ? String(Math.round(sd1.len * 2) / 2) : '';
          if (lk1 && slotLens && slotLens[lk1]) return;
          noLenSecs += Number(a.qty || 0);
        });
        if (noLenSecs > 0) {
          var bl = r.geo.bar_slots.list || [], cap = noLenSecs;   // one bar per length-less section, the longest first (Esquire M-102B: 6 "C" sections among 50 bars → the six 13-14 ft slots)
          barN = Math.min(bl.length, cap); barFt = bl.slice(0, barN).reduce(function (s0, v) { return s0 + v; }, 0);
          if (!bl.length) { barN = r.geo.bar_slots.n; barFt = r.geo.bar_slots.ft; }
        }
        if (takeoffSheet) (r.air_devices || []).forEach(function (a) {
          if (/^\(?\s*cfm only\s*\)?$/i.test(String(a.tag || '').trim())) return;   // a bare '(cfm only)' row is an upper bound, reported as a check, never priced; symbol rows named '… (cfm only)' are counted
          if (/no symbol|unmarked|no device symbol|bubble only|cfm[- ]only bubble|^cfm[- ]only/i.test(String(a.tag || '') + ' ' + String(a.notes || ''))) return;
          // a sheet whose text layer carries device tags (Esquire: A / B / C with cfm, frozen to the census) — symbol rows the reader adds
          // on top as "(cfm only)" are the same devices seen without their tag (double count), a check only; untagged sheets (CENTRALE) keep them
          if (/cfm[- ]only/i.test(String(a.tag || '')) && p.tag_counts && p.tag_counts.devices && Object.keys(p.tag_counts.devices).reduce(function (s0, k0) { return s0 + (k0 === '(cfm only)' ? 0 : Number(p.tag_counts.devices[k0]) || 0); }, 0) >= 3) return;
          if (notAirDevice(a)) return;                                             // sprinkler heads, thermostats, GB … are not outlets   // census rows for cfm bubbles with no device symbol (duct taps, notes) — a check, not an outlet
          if (symbolRowDropped(a, p)) { symDropped.push(sh + ': ' + (a.tag || '?') + ' ×' + (a.qty || 0) + ' (' + String(a.type || 'device') + ')'); return; }
          var atype = String(a.type || 'other').toLowerCase(), alf = Number(a.linear_ft || 0), sd = schedDev[norm(a.tag)];
          var cb = colourBar(a, p);   // "pink bar register" with pink bars measured on the sheet → linear, qty × mean drawn length
          if (cb && /register|grille|diffuser|linear|slot|other/.test(atype)) { atype = 'linear'; if (!alf) alf = Math.round(Number(a.qty || 0) * cb.mean_ft * 10) / 10; a = Object.assign({}, a, { size: a.size || (cb.mean_ft + ' ft ' + cb.colour + ' bar') }); colourBars.push(sh + ': ' + a.qty + ' × ' + cb.colour + ' bar → ' + alf + ' ft (' + cb.n_drawn + ' bars drawn, mean ' + cb.mean_ft + ' ft)'); }
          if (sd && /diffuser|grille|register|linear|louver/.test(sd.type)) {
            if (sd.type === 'linear' || atype === 'other' || /diffuser|grille|register/.test(atype)) atype = sd.type;
            if (atype === 'linear' && !alf && sd.len) alf = Number(a.qty || 0) * sd.len;
          }
          // slot runs measured on the sheet (geo.linear, per tag family: April's "D (200) TYP. 5" rows of dashes) beat the reader's guess
          // and the schedule's slot length; the family's feet are credited once per sheet
          var famM = /^([A-Z]{1,3})/i.exec(String(a.tag || '').trim()), fam = famM ? famM[1].toUpperCase() : '';
          if (atype === 'linear' && fam && r.geo && r.geo.linear && r.geo.linear[fam] && r.geo.linear[fam].ft > 0) {
            var lk = sh + '|' + fam;
            // the drawn rows beat the reader's guess, but never more rows than the tags add up to: April Tax M-501 draws 25 dashed "D" rows
            // (436 ft) where the "D (120) TYP. 3" / "D (200) TYP. 5" tags make 20 sections — the extra rows are duplicates / untagged runs
            var famRows = r.geo.linear[fam].n || 0, famSecs = 0;
            (r.air_devices || []).forEach(function (a2) { var f2 = /^([A-Z]{1,3})/i.exec(String(a2.tag || '').trim()); if (f2 && f2[1].toUpperCase() === fam && !notAirDevice(a2)) famSecs += Number(a2.qty || 0); });
            var famFt = r.geo.linear[fam].ft; if (famRows > famSecs && famSecs >= 3) famFt = Math.round(famFt * famSecs / famRows * 10) / 10;
            alf = linGeoUsed[lk] ? 0 : famFt; linGeoUsed[lk] = 1;
            var lg = linGeoSheets[sh] = linGeoSheets[sh] || { ft: 0, runs: 0, sections: 0, fams: [] };
            if (alf) { lg.ft += alf; lg.runs += r.geo.linear[fam].n || 0; lg.fams.push(fam); }
            lg.sections += Number(a.qty || 0);
          }
          // slot diffusers drawn as thin X-ed rectangles (BOSS): the sheet's drawn glyphs beat qty x schedule length; credited once per sheet
          if (atype === 'linear' && r.geo && r.geo.slots && r.geo.slots.n >= 3 && !(fam && r.geo.linear && r.geo.linear[fam] && r.geo.linear[fam].ft > 0)) {
            var sk = sh + '|slots', coverAll = r.geo.slots.n >= 0.7 * linSecs, lensK = sd && sd.len ? String(Math.round(sd.len * 2) / 2) : '';
            var covered = coverAll || !!(lensK && r.geo.slots.lens[lensK]);   // this family's schedule length is one of the drawn lengths → its glyphs are in the census
            var sg = slotSheets[sh] = slotSheets[sh] || { ft: r.geo.slots.ft, n: r.geo.slots.n, lens: r.geo.slots.lens, sections: 0, fams: [], coverAll: coverAll, kept: [] };
            if (norm(a.tag) === slotCreditTag && !slotUsed[sk]) { alf = r.geo.slots.ft; slotUsed[sk] = 1; }
            else if (covered) alf = 0;                        // already inside the drawn feet
            else if (alf) sg.kept.push((fam || a.tag) + ' ' + Math.round(alf) + ' ft');
            sg.sections += Number(a.qty || 0); if (sg.fams.indexOf(fam || a.tag) < 0) sg.fams.push(fam || a.tag);
          }
          if (atype === 'linear' && !alf && !(sd && sd.len) && barFt > 0 && !barUsed) {   // the sheet's plain-bar slots, once, to the first length-less linear row
            alf = Math.round(barFt * 10) / 10; barUsed = true;
            var bs = slotSheets[sh + '|bars'] = { ft: alf, n: barN, bars: true, sections: noLenSecs, fams: [a.tag], kept: [] };
          }
          var k = atype + '|' + norm(a.tag) + '|' + (a.tag ? '' : (a.size || ''));
          var d = devices[k] = devices[k] || { type: atype, tag: a.tag || '', size: a.size || (sd && sd.type === 'linear' && sd.len ? sd.len + ' ft slot' : ''), notes: a.notes || '', qty: 0, lf: 0, sheets: [], per: {} };
          var fl = String(r.floor || sh), f = d.per[fl] = d.per[fl] || {}, ft = f[type] = f[type] || { q: 0, lf: 0 };
          ft.q += Number(a.qty || 0); ft.lf += alf; d.sheets.push(sh);
          d.qty = 0; d.lf = 0;
          Object.keys(d.per).forEach(function (fk) {
            var best = Object.values(d.per[fk]).sort(function (x, y) { return y.q - x.q; })[0];
            d.qty += best.q; d.lf += best.lf;
          });
        });
        {
          var aiFt = (r.duct_runs || []).reduce(function (a, x) { return a + (/existing|to remain|not new|demolish|relocat|by others|\(e\)/i.test((x.notes || '') + ' ' + (x.size || '')) ? 0 : Number(x.lf || 0)); }, 0);
          var coarseDup = !!coarseSet[sh];
          if (coarseDup) skipped.push(sh + ' (overall plan at a smaller scale — the enlarged plans cover it)');
          // the AI's reading of the same sheet is the cross-check: a measurement more than 3x it (+40 ft) (the wrong line style paired up: OGCP 5200 gave
          // 6,193 ft against the AI's 1,285; Seafarers: 825 ft against 50) or under a quarter of it (labels missing) is not used
          // …and when most of the sheet's size labels sit on no measured duct, the lines found are only part of the work (Seafarers M104: 11 of 43
          // labels reached, 62 ft against the AI's 183; BOSS M-101 7 of 14). "AI over 2x with < 20 labels" is gone — it threw away good
          // geometry (Warby, A1C, El Califa) more often than it caught a miss. Benchmark of 22 Procore jobs: mean error 16.9% → 12.6%.
          var gl = r.geo ? (r.geo.labels || 0) : 0, weakWhy = !(r.geo && r.geo.total_ft > 0) ? '' :
            (gl < 15 && (r.geo.width_ft || 0) > 0.5 * r.geo.total_ft) ? 'mostly width-guessed' :
            (aiFt >= 20 && r.geo.total_ft > 3 * aiFt + 40) ? 'over 3x the AI reading' :
            (aiFt >= 20 && r.geo.total_ft * GEO_FITTINGS < aiFt / 4) ? 'under a quarter of the AI reading' :
            // (only when the AI reads more: applied both ways it cost 645 Madison 9 points for 2 points on Esquire)
            (gl >= 6 && r.geo.labels_hit != null && r.geo.labels_hit < 0.6 * gl && aiFt > r.geo.total_ft * GEO_FITTINGS) ? 'only ' + r.geo.labels_hit + ' of ' + gl + ' size labels on measured duct' :
            // a single-line drawing measured from the labelled runs alone misses the unlabelled branches (Parkinson's 312 ft, AI 355, Procore 578)
            (r.geo.single_style && aiFt > r.geo.total_ft * GEO_FITTINGS) ? 'single-line drawing, AI reads more' : '';
          var weakGeo = !!weakWhy;
          // a single-line drawing where the reader sees more than the traced runs: the traced sizes are real (414 W 14th: four 14x6
          // runouts 30.1 ft, Vladimir 30.3) and the reader's other sizes (transfer ducts drawn as lined boxes + flex, nothing to trace)
          // are the rest — per size, the larger of the two sources, instead of throwing the geometry away
          var mergeGeo = !coarseDup && takeoffSheet && weakWhy === 'single-line drawing, AI reads more';
          if (weakGeo && !coarseDup && !mergeGeo) geoCheck.push({ sheet: sh, geo: 0, ai: aiFt, weak: Math.round(r.geo.total_ft), labels: gl, why: weakWhy });
          if (mergeGeo) {
            var aiBySize = {};
            (r.duct_runs || []).forEach(function (x) {
              if (/existing|to remain|not new|demolish|relocat|by others|\(e\)/i.test((x.notes || '') + ' ' + (x.size || ''))) return;
              var z0 = sizeOf(x.size); if (!z0) return;
              var k0 = (x.shape === 'round' || x.shape === 'oval' || z0.round ? 'round' : 'rect') + '|' + (z0.round ? z0.w : z0.w + 'x' + z0.h);
              aiBySize[k0] = (aiBySize[k0] || 0) + Number(x.lf || 0);
            });
            var geoBySize = {};
            Object.keys(r.geo.sizes || {}).forEach(function (sz) { var z1 = sizeOf(sz); if (!z1) return; var k1 = (/Ø/.test(sz) ? 'round' : 'rect') + '|' + (z1.round ? z1.w : z1.w + 'x' + z1.h); geoBySize[k1] = (geoBySize[k1] || 0) + r.geo.sizes[sz] * GEO_FITTINGS; });
            var mergedFt = 0, fromGeo = 0;
            Object.keys(aiBySize).forEach(function (k2) { if (!geoBySize[k2]) geoBySize[k2] = 0; });
            Object.keys(geoBySize).forEach(function (k2) {
              var g2 = geoBySize[k2], a2 = aiBySize[k2] || 0, use = Math.max(g2, a2); if (!use) return;
              var parts = k2.split('|'), round2 = parts[0] === 'round', dims = parts[1].split('x');
              var o2 = duct[k2] = duct[k2] || { shape: parts[0], size: round2 ? dims[0] + '"Ø' : parts[1], lf: 0, sheets: [], geo: false };
              o2.lf += use; o2.sheets.push(sh); if (g2 >= a2) { o2.geo = true; fromGeo += use; } mergedFt += use;
            });
            geoCheck.push({ sheet: sh, geo: Math.round(fromGeo), ai: aiFt, merged: Math.round(mergedFt), labels: gl, why: 'single-line drawing: traced sizes + the reader\'s other sizes' });
          }
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
          // vertical duct: every UP / DN size label on the plan is a run to the next floor (12 ft each) — on top of the plan lengths,
          // whichever source gave them (neither the lines nor the AI's reading show a drop)
          if (takeoffSheet && !coarseDup && r.geo && r.geo.riser_sizes) {
            Object.keys(r.geo.riser_sizes).forEach(function (sz) {
              var z = sizeOf(sz); if (!z) return;
              var shape = /Ø/.test(sz) ? 'round' : 'rect', k = shape + '|' + (z.round ? z.w : z.w + 'x' + z.h);
              var o = duct[k] = duct[k] || { shape: shape, size: z.round ? z.w + '"Ø' : z.w + 'x' + z.h, lf: 0, sheets: [] };
              o.lf += r.geo.riser_sizes[sz]; o.riser_ft = (o.riser_ft || 0) + r.geo.riser_sizes[sz]; o.sheets.push(sh);
            });
            ductRisers.n += r.geo.riser_n || 0; ductRisers.ft += r.geo.riser_ft || 0; ductRisers.sheets.push(sh + ' (' + (r.geo.riser_n || 0) + ')');
          }
          if (takeoffSheet && !coarseDup && !mergeGeo && (weakGeo || !(r.geo && r.geo.total_ft > 0))) (r.duct_runs || []).forEach(function (x) {
            if (/existing|to remain|not new|demolish|relocat|by others|\(e\)/i.test((x.notes || '') + ' ' + (x.size || ''))) return;   // "(E)16x10 to remain" is not new work (414 W 14th)
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
            // supply and return on ONE line (legend "… SUPPLY AND RETURN" on a single symbol, "CHWS/R" labels) — the lines drawn without a
            // parallel partner stand for two pipes, so their feet are counted twice (645 Madison: Kastriot carried the 1in loop as 531 ft =
            // 2 × the drawn length); lines drawn as pairs (L'Catteron) are both measured already and stay as they are
            // Whether one drawn line stands for supply AND return is the estimator's call (session "Pipe lines" choice, opts.pipeSr): the
            // geometry cannot tell a single S+R loop from a pair when a room outline runs beside it (645 Madison). With the choice on,
            // every water size measured on the sheet is counted twice (condensate never); otherwise the single-line feet are only reported.
            var srFt = 0, wet = 0;
            if (r.geo_pipe.sr) srSheets.push(sh);
            Object.keys(r.geo_pipe.sizes || {}).forEach(function (key) {
              var cd = / CD$/.test(key), sz = key.replace(/ CD$/, '');
              var k = (cd ? 'CD' : '') + '|' + sz + '|';
              var o = pipe[k] = pipe[k] || { service: cd ? 'CD' : '', size: sz, material: '', lf: 0, sheets: [], geo: true };
              var extra = (opts.pipeSr && !cd) ? r.geo_pipe.sizes[key] : 0;
              o.lf += r.geo_pipe.sizes[key] + extra; o.sheets.push(sh); if (!cd) wet += r.geo_pipe.sizes[key]; if (extra) { o.sr_ft = (o.sr_ft || 0) + extra; srFt += extra; }
            });
            if (srFt) srDoubled.push({ sheet: sh, ft: Math.round(srFt) });
            else if (wet && (r.geo_pipe.sr || (r.geo_pipe.single_ft || 0) > 0.5 * (r.geo_pipe.total_ft || 1))) srSingle.push({ sheet: sh, ft: Math.round(wet), single: Math.round(r.geo_pipe.single_ft || 0) });
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
    return { devCheck: devCheck, linGeoSheets: linGeoSheets, slotSheets: slotSheets, sched: sched, planEq: planEq, devices: devices, duct: duct, pipe: pipe, demo: demo, notes: notes, questions: questions,
      symDropped: symDropped, colourBars: colourBars,
      rig: rig, floors: Object.keys(floors), ductSheets: sheetLabels(ductSheets), pipeSheets: sheetLabels(pipeSheets), schedVav: Object.keys(schedVav).length, ductDrops: ductDrops, wetTaps: wetTaps, skipped: skipped, geoCheck: geoCheck, risers: risers, ductRisers: ductRisers, srSheets: srSheets, srDoubled: srDoubled, srSingle: srSingle, pipeFloors: Object.keys(pipeFloors), quotes: quotes.map(function (p) { return p.result; }) };
  }

  // ── reviewer decisions (Takeoff → AI review tab, table est_ai_corrections) ──────────────────────────────
  // Device / equipment rows the estimator accepted, corrected or deleted on a sheet. Keys must match takeoff.html:
  // '<page_id>:<norm tag>|<type>' (a second identical row on the same sheet gets '#2' …). Run corrections (duct / pipe /
  // riser marks) are not applied here — they changed the takeoff marks themselves, so the estimate sync carries them.
  function devKey(pageId, a) { return pageId + ':' + norm(a.tag || '') + '|' + String(a.type || '').toLowerCase().trim(); }
  function eqKey(pageId, e) { return pageId + ':' + norm(e.tag || '') + '|' + String(e.type || '').toLowerCase().trim(); }
  var DEV_FIELDS = ['tag', 'type', 'qty', 'linear_ft', 'size', 'cfm', 'notes'], EQ_FIELDS = ['tag', 'type', 'qty', 'weight_lb', 'location', 'manufacturer', 'model', 'capacity', 'notes'];
  function applyCorrections(pages, corrs) {
    if (!corrs || !corrs.length) return pages;
    var by = {}; corrs.forEach(function (c) { if (c && (c.kind === 'device' || c.kind === 'equipment')) by[c.kind + '|' + c.item_key] = c; });
    if (!Object.keys(by).length) return pages;
    return pages.map(function (p) {
      var r = p.result; if (!r) return p;
      var touched = false;
      function fix(kind, rows, keyFn, fields) {
        if (!rows || !rows.length) return rows;
        var seen = {};
        return rows.map(function (row) {
          var k = keyFn(p.id, row); seen[k] = (seen[k] || 0) + 1; if (seen[k] > 1) k += '#' + seen[k];
          var c = by[kind + '|' + k]; if (!c) return row;
          touched = true;
          if (c.status === 'deleted') return null;
          if (c.status === 'corrected' && c.corrected) {
            var n = Object.assign({}, row);
            fields.forEach(function (f) { var v = c.corrected[f]; if (v !== undefined && v !== null && v !== '') n[f] = (f === 'qty' || f === 'linear_ft' || f === 'weight_lb' || f === 'cfm') ? Number(v) : v; });
            n.reviewed = 'corrected'; return n;
          }
          return Object.assign({}, row, { reviewed: 'accepted' });
        }).filter(Boolean);
      }
      var out = Object.assign({}, r, { air_devices: fix('device', r.air_devices, devKey, DEV_FIELDS), equipment: fix('equipment', r.equipment, eqKey, EQ_FIELDS) });
      return touched ? Object.assign({}, p, { result: out }) : p;
    });
  }

  // ── equipment: every scheduled unit (and the numbered units only the plans show) with how it is priced ──
  // quoted (by tag inside a vendor quote) · package (a quote covers it by manufacturer / model / family) · priced (unit price entered
  // on the session, opts.equipmentPrices[tag] = {price, source, vendor, qty, firm}) · budget (NWAC budget rule) · skip (owner-furnished,
  // existing / by others, air device, duct accessory, not a unit tag). The Equipment card and the breakdown both use it.
  function quotedTags(C) { var q = {}; (C.quotes || []).forEach(function (x) { (x.lines || []).forEach(function (l) { (l.tags || []).forEach(function (t) { q[norm(t)] = x.vendor || true; }); }); }); return q; }
  function equipmentRows(C, quoted, opts) {
    opts = opts || {}; quoted = quoted || quotedTags(C);
    var prices = opts.equipmentPrices || {}, qBlob = (C.quotes || []).map(function (q) { return JSON.stringify(q || {}).toLowerCase(); }).join(' ');
    var tags = Object.keys(C.sched);
    Object.keys(C.planEq).forEach(function (tag) { if (!C.sched[tag] && isRealTag(C.planEq[tag].label || tag) && /unit|fan|pump|heater|ac|hp|fcu|ahu|rtu|doas|curtain|cooler|tank|separator|humidifier|crac|split|vrf|condens|erv|boiler/i.test((C.planEq[tag].type || '') + ' ' + tag)) tags.push(tag); });
    return tags.sort().map(function (tag) {
      var s = C.sched[tag] || Object.assign({ sheets: C.planEq[tag].sheets || ['plan'], label: C.planEq[tag].label }, C.planEq[tag]);
      var row = { tag: tag, label: s.label || tag, type: s.type || '', manufacturer: s.manufacturer || '', model: s.model || '', capacity: s.capacity || '', cfm: s.cfm || '', weight_lb: Number(s.weight_lb) || 0, location: s.location || '',
        qty_sched: Number(s.qty) || 0, qty_plan: (C.planEq[tag] && C.planEq[tag].qty) || 0, sheet: (s.sheets || [])[0] || 'plan', sheets: uniq(s.sheets || []), desc: [s.type, s.manufacturer, s.model, s.capacity].filter(Boolean).join(' · '), furnished_by: s.furnished_by || '', notes: s.notes || '' };
      row.qty = Math.max(1, row.qty_sched || row.qty_plan || 1);
      row.alt = /alternate|\balt\b|add alt/i.test([s.type, s.notes, s.label].join(' '));
      if (quoted[tag]) { row.status = 'quoted'; row.vendor = typeof quoted[tag] === 'string' ? quoted[tag] : ''; return row; }
      if (/owner/i.test(s.furnished_by || '')) { row.status = 'skip'; row.why = 'owner-furnished'; return row; }
      if (/diffuser|grille|register|vav|damper|louver/i.test(s.type || '')) { row.status = 'skip'; row.why = 'air device (priced below)'; return row; }
      if (/existing|to remain|reference only|by others|n\.?i\.?c/i.test([s.type, s.notes, s.furnished_by].join(' '))) { row.status = 'skip'; row.why = 'existing / by others'; return row; }
      if (!isRealTag(s.label || tag) && !(s.qty > 0 && !/[()]/.test(s.label || tag))) { row.status = 'skip'; row.why = 'not a unit tag'; return row; }
      var fam = (s.type || '') + ' ' + tag;
      if (/duct\/hood|connection|\bduct\b|grille|diffuser|register/i.test(fam)) { row.status = 'skip'; row.why = 'duct accessory'; return row; }
      var ep = prices[tag];
      if (ep && ep.price != null && ep.price !== '') { row.status = 'priced'; row.price = Number(ep.price) || 0; row.source = ep.source || ''; row.vendor = ep.vendor || ''; row.firm = ep.firm !== false; if (Number(ep.qty) > 0) row.qty = Number(ep.qty); return row; }
      // a package quote covers units it never names by tag: Daikin's VRV quote covers the cassettes and branch selectors, Klimany's LG quote
      // the ducted fan coils, CaptiveAire the hoods — match by manufacturer, model or equipment family before calling anything unquoted
      var mfr = String(s.manufacturer || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 3 && !/^(inc|llc|corp|the|and|applied|industries|systems|company)$/.test(w); })[0];
      var mdl = String(s.model || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
      var covered = (mfr && qBlob.indexOf(mfr) >= 0) || (mdl.length >= 5 && qBlob.indexOf(mdl) >= 0) ||
        (/vrf|vrv|cassette|branch selector|ductless|indoor unit|fan coil/i.test(fam) && /vrf|vrv|multi v|multi-v|heat recovery|fan coil|cassette/.test(qBlob)) ||
        (/hood|\bkef\b|\bkeh\b|\bmua\b|make[- ]?up|ansul|grease/i.test(fam) && /hood|captiveaire|kitchen|ansul/.test(qBlob)) ||
        (/\bfan\b|exhaust|transfer/i.test(fam) && !/hood|\bmua\b|make[- ]?up/i.test(fam) && /roof fan|cabinet fan|inline fan|exhaust fan|ceiling fan|greenheck|\bcsp\b|downblast|down blast/.test(qBlob)) ||
        (/air curtain/i.test(fam) && /air curtain|\bmars\b|berner/.test(qBlob)) ||
        (/duct heater|\bedh\b|electric heater/i.test(fam) && /duct heater|neptronic|electric heater/.test(qBlob));   // the air-outlet vendor's quote (ADE) carries the fans
      if (covered) { row.status = 'package'; row.vendor = ((C.quotes || []).filter(function (q) { return JSON.stringify(q || {}).toLowerCase().indexOf(mfr || mdl || 'no-match') >= 0; })[0] || {}).vendor || 'a vendor quote'; return row; }
      row.status = 'budget'; row.budget = row.alt ? null : budgetFor(s, tag); return row;
    });
  }
  // for the page: the rows of a session straight from its pages
  function equipment(pages, opts) { opts = opts || {}; var C = collect(opts.corrections ? applyCorrections(pages, opts.corrections) : pages, opts); return { rows: equipmentRows(C, quotedTags(C), opts), quotes: C.quotes }; }

  // ── build the breakdown ──────────────────────────────────────────────
  // the estimate row the totals are computed with (and that toEstimate stamps on the Bid Board estimate): the org's settings or
  // the NWAC standard — nwEstTotals treats a missing column as "company standard", so only explicit values are passed
  function estimateRow(settings, ofci) {
    var OS = orgSettings(settings), row = { labor_rate: OS.labor_rate != null ? OS.labor_rate : LABOR_RATE, is_ofci: !!ofci };
    var oh = ofci ? (OS.ofci_overhead_pct != null ? OS.ofci_overhead_pct : (OS.overhead_pct != null ? OS.overhead_pct + 0.10 : null)) : OS.overhead_pct;
    if (oh != null) row.overhead_pct = oh;
    if (OS.misc_pct != null) row.miscellaneous_pct = OS.misc_pct;
    if (OS.tax_rate != null) row.tax_rate = OS.tax_rate;
    return row;
  }
  // services rates (shop drawings / T&B per plan sheet, man-lift per job) with the org's overrides
  function servicesRates(OS) {
    OS = OS || orgSettings();
    return Object.assign({}, STD, { ductSD: OS.duct_sd != null ? OS.duct_sd : STD.ductSD, pipeSD: OS.pipe_sd != null ? OS.pipe_sd : STD.pipeSD, tab: OS.tab != null ? OS.tab : STD.tab, lift: OS.lift != null ? OS.lift : STD.lift });
  }
  function build(pages, opts) {
    opts = opts || {};
    if (opts.corrections) pages = applyCorrections(pages, opts.corrections);
    var R = makeRates(opts.norms), C = collect(pages, opts), lines = [], flags = [], sort = 0;
    var OS = orgSettings(opts.settings), STD = servicesRates(OS);
    var famKey = familyFor(opts.ductSpec, OS.duct_family);
    if (!opts.ductSpec) flags.push({ category: 'ductwork', item: 'Duct construction', flag: 'not read from the specs — priced as ' + (DUCT_FAMILIES[famKey].label || famKey) + (OS.duct_family ? " (the organisation's default)" : '') + '; run 🔍 Duct spec' });
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
    equipmentRows(C, quoted, opts).forEach(function (e) {
      if (e.status === 'skip' || e.status === 'quoted') return;                      // inside a quote's lump sum, or not ours to price
      if (e.status === 'package') { add('equipment', e.label + ' — ' + e.desc + ' (in ' + e.vendor + ')', 0, 'ea', 0, 0, 'covered by the vendor package quote — no separate price', { is_firm: true }); return; }
      if (e.status === 'priced') { add('equipment', e.label + ' — ' + e.desc, e.qty, 'ea', e.price, 0, 'unit price entered' + (e.source ? ' — ' + e.source : '') + '; on schedule ' + e.sheet, { is_firm: e.firm !== false, is_optional: e.alt, vendor_name: e.vendor || null, flag: e.alt ? 'alternate — price separately' : null }); return; }
      add('equipment', e.label + ' — ' + e.desc + (e.budget ? ' [BUDGET]' : ''), e.qty, 'ea', e.budget ? e.budget.cost : 0, 0,
        e.budget ? 'budget — ' + e.budget.why + '; on schedule ' + e.sheet + ', no vendor quote' : 'on schedule ' + e.sheet + ' — no quote yet',
        { is_firm: false, is_optional: e.alt, flag: e.budget ? 'budget $' + e.budget.cost.toLocaleString() + ' each — no vendor quote, get one' : (e.alt ? 'alternate — price separately' : 'quote needed') });
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
    if (C.ductRisers && C.ductRisers.n)
      flags.push({ category: 'ductwork', item: 'Duct risers (UP / DN)', flag: C.ductRisers.n + ' UP / DN size label' + (C.ductRisers.n === 1 ? '' : 's') + ' on the plans = ' + Math.round(C.ductRisers.ft) + ' ft of vertical duct added (UP or DN alone = half a 12-ft floor, UP/DN = a full floor) (' + C.ductRisers.sheets.join(', ') + ') — check the floor height' });
    C.geoCheck.forEach(function (g) {
      if (g.weak) { flags.push({ category: 'ductwork', item: 'Duct length ' + g.sheet, flag: 'drawing geometry (' + g.weak + ' ft, ' + g.labels + ' labels, ' + (g.why || 'mostly width-guessed') + ') not trusted — AI reading ' + Math.round(g.ai) + ' ft used' }); return; }
      if (g.ai && Math.abs(g.geo - g.ai) / Math.max(g.geo, g.ai) > 0.35)
        flags.push({ category: g.what === 'Pipe' ? 'pipework' : 'ductwork', item: (g.what || 'Duct') + ' length ' + g.sheet, flag: 'drawing geometry ' + Math.round(g.geo) + ' ft vs AI reading ' + Math.round(g.ai) + ' ft — geometry used; check the sheet' });
    });
    if (C.srDoubled && C.srDoubled.length)
      flags.push({ category: 'pipework', item: 'Supply + return on one line', flag: 'session choice "one line = supply + return": the water pipe measured on the plans is counted twice — ' + C.srDoubled.map(function (d) { return d.sheet + ' +' + d.ft + ' ft'; }).join(', ') + ' (condensate once)' });
    else if (C.srSingle && C.srSingle.length)
      flags.push({ category: 'pipework', item: 'Supply + return on one line?', flag: 'water pipe counted once per drawn line on ' + C.srSingle.map(function (d) { return d.sheet + ' (' + d.ft + ' ft' + (d.single ? ', ' + d.single + ' ft with no parallel partner' : '') + ')'; }).join(', ') + ' — if the legend draws supply and return as ONE line (645 Madison: Procore carried 2x), set "Pipe lines" to count twice and price again' });
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
      if (/diffuser|grille|register|vav|damper|louver|variable air volume|terminal unit|fan[- ]powered|\bcav\b|fire suppression|ansul|smoke detector|duct\/hood|hood connection|duct connection/i.test((s.type || '') + ' ' + (s.label || tag))) return;
      if (!isRealTag(s.label || tag) && (!C.sched[tag] || !(C.sched[tag].qty > 0) || /[()]/.test(s.label || tag) || String(s.label || tag).split(/\s+/).length > 2)) return;
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
      else if (d.type === 'vav') { if (!manual && !/\bvdi?\b|volume damper|remote operat/i.test((d.tag || '') + ' ' + (d.notes || ''))) ao.vavd += d.qty; }
      else if ((d.type === 'fsd' || d.type === 'motorized_damper') && !manual) ao.vavd += d.qty;
      else if (d.type === 'fpb') ao.fpb += d.qty;
    });
    Object.keys(C.linGeoSheets || {}).forEach(function (sh) {
      var lg = C.linGeoSheets[sh];
      if (lg.ft) flags.push({ category: 'air devices', item: 'Linear diffusers — ' + sh, flag: Math.round(lg.ft) + ' ft of slot diffuser measured on ' + sh + ' (' + lg.runs + ' runs drawn, tag family ' + lg.fams.join('/') + ')' + (lg.sections ? '; the tags add up to ' + lg.sections + ' sections — price by the measured feet, check the active/inactive split in the schedule' : '') });
    });
    Object.keys(C.slotSheets || {}).forEach(function (sh) {
      var sg = C.slotSheets[sh];
      if (sg.bars) { flags.push({ category: 'air devices', item: 'Slot diffusers — ' + sh.replace('|bars', ''), flag: Math.round(sg.ft) + ' ft of plain-bar slot diffuser drawn on ' + sh.replace('|bars', '') + ' (' + sg.n + ' bars, credited to ' + sg.fams.join('/') + ' — ' + sg.sections + ' sections with no length on the schedule or the plan); check the slot lengths' }); return; }
      flags.push({ category: 'air devices', item: 'Slot diffusers — ' + sh, flag: Math.round(sg.ft) + ' ft of slot diffuser drawn on ' + sh + ' (' + sg.n + ' glyphs: ' + Object.keys(sg.lens).map(function (l) { return sg.lens[l] + ' × ' + l + ' ft'; }).join(', ') + ')' + (sg.sections ? '; the reader\'s linear tags (' + sg.fams.join('/') + ') add up to ' + sg.sections + ' sections' : '') + (sg.kept && sg.kept.length ? ' — not drawn this way, kept at qty × schedule length: ' + sg.kept.join(', ') : ' — priced by the drawn feet') });
    });
    (C.devCheck || []).forEach(function (c) {
      if (c.hasTags && c.tags >= 5 && (c.ai < 0.75 * c.tags || c.ai > 1.3 * c.tags))
        flags.push({ category: 'air devices', item: 'Air-device count check — ' + c.sheet, flag: 'the reader counted ' + c.ai + ' air devices on ' + c.sheet + ', the PDF text carries ' + c.tags + ' device tags (TYP. multipliers applied) — verify the outlet count on this sheet' });
      else if (c.cfmOnly >= 5 && c.ai < 0.6 * c.cfmOnly)
        flags.push({ category: 'air devices', item: 'Air-device count check — ' + c.sheet, flag: c.ai + ' air devices counted on ' + c.sheet + '; the sheet shows ' + c.cfmOnly + ' bare cfm tags (no device code) — some are airflow notes on duct runs, some are outlets the reader may have missed; verify the count' });
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
    // the air-outlet vendor's quote (ADE) itemises every diffuser / grille / register, the linear-diffuser footage, VAVs and cable dampers —
    // Kastriot prices installation from those counts (BOSS: 336 LF linear + 22 outlets, Sky Zone: 37 outlets the plan reader never saw)
    var qo = { outlet: 0, linear: 0, vavd: 0, fpb: 0, lines: 0, vendor: '' };
    C.quotes.forEach(function (q) {
      if (!q || !(q.lines || []).length) return;
      var hit = 0, acc = { outlet: 0, linear: 0, vavd: 0, fpb: 0 };
      q.lines.forEach(function (l) {
        var d = String(l.description || '') + ' ' + (l.tags || []).join(' '), n = Number(l.qty) || 0;
        if (!n || /total|subtotal|section|allowance|freight|tax|scope letter/i.test(d)) return;
        if (/cable[- ]operated|manual damper|volume damper|\bcod\b|opposed blade|light shield only|blank[- ]?off|plenum only/i.test(d)) { hit++; return; }
        if (/linear|slot diffuser|\blsd\b|\bld\b/i.test(d)) { acc.linear += n; hit++; return; }
        if (/fan[- ]powered|\bfpb\b/i.test(d)) { acc.fpb += n; hit++; return; }
        if (/\bvav\b|\bcav\b|terminal unit|air valve|fire[\/ ]?smoke|\bfsd\b|motorized damper|smoke damper/i.test(d)) { acc.vavd += n; hit++; return; }
        if (/diffuser|grille|register|drum louver|eggcrate|egg crate|\bcd\b|\bsr\b|\brg\b|\brr\b|\bsd\b|\bcr\b|\bsg\b|\beg\b/i.test(d) && !/fan|heater|curtain|louver plenum|monitoring|sensor|detector|damper/i.test(d)) { acc.outlet += n; hit++; return; }
      });
      if (hit >= 3 && (acc.outlet + acc.linear + acc.vavd + acc.fpb) > (qo.outlet + qo.linear + qo.vavd + qo.fpb)) { qo = { outlet: acc.outlet, linear: acc.linear, vavd: acc.vavd, fpb: acc.fpb, lines: hit, vendor: q.vendor || 'vendor' }; }
    });
    var aoBasis = '';
    if (qo.lines) {
      aoBasis = ' — counts from the ' + qo.vendor + ' air-outlet quote';
      if (qo.outlet) ao.outlet = qo.outlet;
      if (qo.linear) { ao.linear = qo.linear; ao.linearGuess = false; }
      if (qo.vavd) ao.vavd = qo.vavd;
      if (qo.fpb) ao.fpb = qo.fpb;
    }
    if (ao.outlet) add('air_outlets', 'Diffusers / grilles / registers', ao.outlet, 'ea', 0, STD.airOutlet, 'Air Outlets Standards — 1.6 hr each' + aoBasis);
    if (ao.linear) add('air_outlets', 'Linear diffusers', ao.linear, 'lf', 0, STD.linearPerFt, 'Air Outlets Standards — 0.8 hr/ft' + aoBasis, ao.linearGuess ? { flag: 'some lengths not shown — counted 4 ft per piece; check the plans' } : null);
    if (ao.vavd) add('air_outlets', 'VAV boxes / fire-smoke / motorized dampers', ao.vavd, 'ea', 0, STD.vavOrDamper, 'Air Outlets Standards — 2.67 hr each' + aoBasis);
    if (ao.fpb) add('air_outlets', 'Fan-powered boxes', ao.fpb, 'ea', 0, STD.fpb, 'Air Outlets Standards — 8 hr each' + aoBasis);

    // standalone controls only when there is no BMS quote (Standalone Controls Standards)
    var vavCount = C.schedVav || Object.keys(C.devices).reduce(function (a, k) { var d = C.devices[k]; if (/\bvdi?\b|volume damper|remote operat|manual|cable/i.test((d.tag || '') + ' ' + (d.notes || ''))) return a; return a + (d.type === 'vav' || d.type === 'fpb' ? d.qty : 0); }, 0);
    if (!bms && vavCount) add('equipment', 'Standalone VAV controls (no BMS quote)', vavCount, 'ea', STD.vavControls + STD.thermostat + STD.tstatWiring, 1.6,
      'Standalone Controls — $1,000/VAV + thermostat $500 + wiring $50; 10/day install', { is_firm: false, flag: 'replace with BMS quote if one comes in' });

    // 7. Services
    add('services', 'Ductwork shop drawings — ' + floors + ' plan sheet' + (floors > 1 ? 's' : ''), floors, 'floor', STD.ductSD, 0, 'Standard — $' + STD.ductSD.toLocaleString() + ' per plan sheet (' + sdBasis + ')');
    // piping shop drawings per plan sheet with new piping (pipe plans + enlarged mechanical-room plans; Kastriot 360 Lexington: piping SD on 1 of 3 floors)
    var pipeFl = Number(opts.floors) ? Math.min(floors, C.pipeSheets.length || C.pipeFloors.length || floors) : (C.pipeSheets.length || Math.min(floors, C.pipeFloors.length || floors));
    if (hasPipe) add('services', 'Piping shop drawings — ' + pipeFl + ' plan sheet' + (pipeFl > 1 ? 's' : ''), pipeFl, 'floor', STD.pipeSD, 0,
      'Standard — $' + STD.pipeSD.toLocaleString() + ' per plan sheet with new piping' + (C.pipeSheets.length ? ' (' + C.pipeSheets.join(', ') + ')' : C.pipeFloors.length ? ' (levels ' + C.pipeFloors.join(', ') + ')' : ''));
    if (!C.quotes.some(function (q) { return q.kind === 'tab'; }))
      add('services', 'Testing & balancing — ' + floors + ' plan sheet' + (floors > 1 ? 's' : ''), floors, 'floor', STD.tab, 0, 'Standard — $' + STD.tab.toLocaleString() + ' per plan sheet, same count as the ductwork shop drawings');
    // a man-lift / scaffolding line for ceiling work: NWAC carries it on 203 of the 1,142 Procore bids with ductwork shop drawings
    // ($2,500, "Man-lift, scafoldings"); 414 W 14th (Vladimir) has it — the estimator decides, so it is not firm
    if (Object.keys(C.duct).length || Object.keys(C.devices).length)
      add('services', 'Man-lift / scaffolding', 1, 'ea', STD.lift, 0, 'NWAC Procore rate — $' + STD.lift.toLocaleString() + ', carried on 203 of 1,142 duct jobs',
        { is_firm: false, flag: 'keep for ceiling work above 12 ft or over fixtures / furniture — drop when a ladder does it' });
    if ((C.colourBars || []).length) flags.push({ category: 'air devices', item: 'Coloured-bar registers priced as linear diffuser', flag: C.colourBars.join('; ') + ' — the unit count is the reader\'s, the length per unit is the mean bar drawn in that colour; check the slot lengths' });
    if ((C.symDropped || []).length) flags.push({ category: 'air_outlets', item: 'Symbol counts not priced', flag: C.symDropped.join('; ') + ' — counted from drawn symbols on a sheet whose device tags are readable (grid bubbles / legend art); the tagged rows are priced' });
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

    var estRow = estimateRow(opts.settings, !!opts.ofci);
    var totals = window.nwEstTotals ? window.nwEstTotals(lines, estRow) : null;
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

  window.NWEngine = { build: build, collect: collect, ductRate: ductRate, pipeRate: pipeRate, makeRates: makeRates, installHours: installHours, STD: STD, DUCT_FAMILIES: DUCT_FAMILIES, familyFor: familyFor, orgSettings: orgSettings, estimateRow: estimateRow, servicesRates: servicesRates, symbolRowDropped: symbolRowDropped, devWords: devWords,
    applyCorrections: applyCorrections, devKey: devKey, eqKey: eqKey, norm: norm, equipment: equipment, equipmentRows: equipmentRows };
})();
