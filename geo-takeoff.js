// NWAC geometric duct takeoff — measures new ductwork straight from the vector lines of a PDF plan.
//  • double-line ducts: parallel wall pairs in the "ductwork" line style(s); gap = width, overlap = length
//  • single-line ducts: line chains that a size label (or its leader) points at
//  • size: nearest label of matching width; else carried along the run; else width + usual depth on the sheet
// Checked against Kastriot's Procore takeoffs (L'Catteron −1.4 %, April Tax −6.4 %, Sage +8.5 % in duct $).
// Usage: var data = await NWGeo.extract(pdfjsPage); var r = await NWGeo.measure(data);
//        r = { ptft, sizes: {'12x8': ft, ...}, total_ft, single_ft, width_ft, styles, labels }
(function () {
  // ─── 1. read lines + text from a pdf.js page (main thread; the heavy parsing is pdf.js's own worker) ───
  function mul(m, n) {   // m then n
    return [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
      m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5]];
  }
  function tp(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  function rgb(args) {
    if (typeof args[0] === 'string') { var h = args[0].replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; }
    var a = Array.from(args).map(Number), mx = Math.max.apply(null, a.concat([0]));
    return a.map(function (v) { return mx > 1.001 ? v / 255 : v; });
  }

  async function extract(page) {
    var OPS = pdfjsLib.OPS, ol = await page.getOperatorList();
    var st = { ctm: [1, 0, 0, 1, 0, 0], lw: 1, col: [0, 0, 0], fill: [0, 0, 0], dash: false, clip: null }, stack = [], path = [], cur = null, start = null, pendingClip = false;
    function snap() { return { ctm: st.ctm.slice(), lw: st.lw, col: st.col.slice(), fill: st.fill.slice(), dash: st.dash, clip: st.clip ? st.clip.slice() : null }; }
    function inter(a, b) { if (!a) return b; if (!b) return a; return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]; }
    function bboxOf(pts) { var r = [Infinity, Infinity, -Infinity, -Infinity]; pts.forEach(function (q) { r[0] = Math.min(r[0], q[0]); r[1] = Math.min(r[1], q[1]); r[2] = Math.max(r[2], q[0]); r[3] = Math.max(r[3], q[1]); }); return r; }
    // visible part of a line inside the clip box (Liang–Barsky); null when fully clipped away
    function clipSeg(g, c) {
      if (!c) return g;
      var x1 = g[0], y1 = g[1], dx = g[2] - x1, dy = g[3] - y1, t0 = 0, t1 = 1, P = [-dx, dx, -dy, dy], Q = [x1 - c[0], c[2] - x1, y1 - c[1], c[3] - y1];
      for (var i = 0; i < 4; i++) {
        if (P[i] === 0) { if (Q[i] < -0.01) return null; continue; }
        var r = Q[i] / P[i];
        if (P[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
      }
      return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
    }
    var segs = [], rects = [];   // [x1,y1,x2,y2, styleIndex]; rectangle sides kept apart (clip only)
    var glyphs = [], pathPts = [];   // small painted paths = glyph outlines of stroked/outlined text (for OCR)
    var styles = {}, styleList = [];
    function styleKey() {
      var scale = Math.sqrt(Math.abs(st.ctm[0] * st.ctm[3] - st.ctm[1] * st.ctm[2])) || 1;
      var w = Math.round(st.lw * scale * 100) / 100;
      var c = st.col.map(function (v) { return Math.round(v * 100) / 100; });
      var k = c.join(',') + '|' + w + '|' + (st.dash ? 'd' : '');
      if (!(k in styles)) { styles[k] = styleList.length; styleList.push({ key: k, col: c, w: w, dash: st.dash }); }
      return styles[k];
    }
    var subIdx = 0;
    function isRect(g) {
      if (g.length !== 4) return false;
      for (var i = 0; i < 4; i++) {
        var a = g[i], b = g[(i + 1) % 4];
        if (Math.hypot(a[2] - b[0], a[3] - b[1]) > 0.6) return false;                 // consecutive
        var ux = a[2] - a[0], uy = a[3] - a[1], vx = b[2] - b[0], vy = b[3] - b[1];
        var la = Math.hypot(ux, uy), lb = Math.hypot(vx, vy);
        if (!la || !lb || Math.abs((ux * vx + uy * vy) / (la * lb)) > 0.03) return false;   // right angle
      }
      return true;
    }
    function endSub(closed) {
      var g = path.slice(subIdx), virt = null;
      if (closed && cur && start && Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 0.6) { virt = [cur[0], cur[1], start[0], start[1]]; g.push(virt); }
      // any 4 consecutive sides that close into a right-angled box are a symbol outline (square + diagonal etc.)
      var keepSegs = [], k = 0;
      while (k < g.length) {
        if (k + 4 <= g.length && isRect(g.slice(k, k + 4))) { g.slice(k, k + 4).forEach(function (x) { rects.push(x); }); k += 4; }
        else { keepSegs.push(g[k]); k++; }
      }
      if (virt) keepSegs = keepSegs.filter(function (x) { return x !== virt; });   // the virtual closing edge is never a wall
      path.length = subIdx;
      keepSegs.forEach(function (x) { path.push(x); });
      subIdx = path.length;
    }
    function thinQuad() {
      var all = path.concat(rects);                    // a thin rectangle's sides were moved to rects by endSub
      if (all.length < 2 || all.length > 10) return null;
      var L = function (g) { return Math.hypot(g[2] - g[0], g[3] - g[1]); };
      var e1 = all.slice().sort(function (a, b) { return L(b) - L(a); })[0];
      if (!e1 || L(e1) < 6) return null;
      var ux = (e1[2] - e1[0]) / L(e1), uy = (e1[3] - e1[1]) / L(e1), nx = -uy, ny = ux, tmax = 0, sgn = 1, along = true;
      all.forEach(function (g) {
        [[g[0], g[1]], [g[2], g[3]]].forEach(function (q) {
          var d = (q[0] - e1[0]) * nx + (q[1] - e1[1]) * ny, a = (q[0] - e1[0]) * ux + (q[1] - e1[1]) * uy;
          if (Math.abs(d) > tmax) { tmax = Math.abs(d); sgn = d < 0 ? -1 : 1; }
          if (a < -2 || a > L(e1) + 2) along = false;                                          // points beyond the long edge: not a bar
        });
      });
      if (!along || tmax < 0.3 || tmax > 4.5) return null;
      var o = tmax / 2 * sgn;
      return { seg: [e1[0] + nx * o, e1[1] + ny * o, e1[2] + nx * o, e1[3] + ny * o], t: Math.round(tmax * 10) / 10 };
    }
    function flush(stroke, paint) {
      endSub(false);
      var quad = null;
      if ((paint === true || paint === 'both') && Math.min(st.fill[0], st.fill[1], st.fill[2]) < 0.6) {
        quad = thinQuad();
        if (quad) {
          var qk = 'fill|' + quad.t + '|';
          if (!(qk in styles)) { styles[qk] = styleList.length; styleList.push({ key: qk, col: [0, 0, 0], w: quad.t, dash: false }); }
          var qg = clipSeg(quad.seg, st.clip); if (qg) segs.push(qg.concat([styles[qk]]));
        }
      }
      if (quad) { pathPts = []; pendingClip = false; path = []; rects = []; cur = null; start = null; subIdx = 0; return; }
      if (paint !== false && pathPts.length && pathPts.length <= 400) {
        var gb = bboxOf(pathPts), gw = gb[2] - gb[0], gh = gb[3] - gb[1];
        var whiteFill = (paint === true || paint === 'both') && Math.min(st.fill[0], st.fill[1], st.fill[2]) > 0.9;     // a label halo, not a glyph
        if (!whiteFill && gw <= 22 && gh <= 22 && (gw >= 0.4 || gh >= 0.4)) glyphs.push([gb[0], gb[1], gb[2], gb[3]]);
      }
      pathPts = [];
      if (stroke && path.length) {
        var si = styleKey();
        for (var i = 0; i < path.length; i++) { var g = clipSeg(path[i], st.clip); if (g) segs.push(g.concat([si])); }
      }
      if (pendingClip && (path.length || rects.length)) {    // W n: the path just built becomes (part of) the clip region
        var pts = []; path.concat(rects).forEach(function (g) { pts.push([g[0], g[1]], [g[2], g[3]]); });
        st.clip = inter(st.clip, bboxOf(pts));
      }
      pendingClip = false;
      path = []; rects = []; cur = null; start = null; subIdx = 0;
    }
    for (var i = 0; i < ol.fnArray.length; i++) {
      var fn = ol.fnArray[i], a = ol.argsArray[i];
      switch (fn) {
        case OPS.save: stack.push(snap()); break;
        case OPS.restore: if (stack.length) st = stack.pop(); break;
        case OPS.transform: st.ctm = mul(a, st.ctm); break;
        case OPS.paintFormXObjectBegin:
          stack.push(snap());
          if (a && a[0]) st.ctm = mul(a[0], st.ctm);
          if (a && a[1] && a[1].length === 4) { var fb = a[1]; st.clip = inter(st.clip, bboxOf([tp(st.ctm, fb[0], fb[1]), tp(st.ctm, fb[2], fb[1]), tp(st.ctm, fb[2], fb[3]), tp(st.ctm, fb[0], fb[3])])); }
          break;
        case OPS.clip: case OPS.eoClip: pendingClip = true; break;
        case OPS.paintFormXObjectEnd: if (stack.length) st = stack.pop(); break;
        case OPS.setLineWidth: st.lw = a[0]; break;
        case OPS.setDash: st.dash = !!(a && a[0] && a[0].length); break;
        case OPS.setGState:
          (a[0] || []).forEach(function (kv) { if (kv[0] === 'LW') st.lw = kv[1]; if (kv[0] === 'D') st.dash = !!(kv[1] && kv[1][0] && kv[1][0].length); });
          break;
        case OPS.setStrokeRGBColor: st.col = rgb(a); break;
        case OPS.setFillRGBColor: st.fill = rgb(a); break;
        case OPS.setFillGray: st.fill = [a[0], a[0], a[0]].map(Number); break;
        case OPS.setFillCMYKColor: var kf = a[3]; st.fill = [(1 - a[0]) * (1 - kf), (1 - a[1]) * (1 - kf), (1 - a[2]) * (1 - kf)]; break;
        case OPS.setStrokeGray: st.col = [a[0], a[0], a[0]].map(Number); break;
        case OPS.setStrokeCMYKColor: var k = a[3]; st.col = [(1 - a[0]) * (1 - k), (1 - a[1]) * (1 - k), (1 - a[2]) * (1 - k)]; break;
        case OPS.constructPath:
          var ops = a[0], co = a[1], j = 0;
          for (var o = 0; o < ops.length; o++) {
            var op = ops[o];
            if (op === OPS.moveTo) { endSub(false); cur = tp(st.ctm, co[j], co[j + 1]); start = cur; pathPts.push(cur); j += 2; }
            else if (op === OPS.lineTo) { var p = tp(st.ctm, co[j], co[j + 1]); if (cur) path.push([cur[0], cur[1], p[0], p[1]]); cur = p; pathPts.push(p); j += 2; }
            else if (op === OPS.curveTo) { pathPts.push(tp(st.ctm, co[j], co[j + 1]), tp(st.ctm, co[j + 2], co[j + 3])); cur = tp(st.ctm, co[j + 4], co[j + 5]); pathPts.push(cur); j += 6; }
            else if (op === OPS.curveTo2 || op === OPS.curveTo3) { pathPts.push(tp(st.ctm, co[j], co[j + 1])); cur = tp(st.ctm, co[j + 2], co[j + 3]); pathPts.push(cur); j += 4; }
            else if (op === OPS.closePath) { endSub(true); cur = start; }     // closing edges are not reported as lines (same as the reference)
            else if (op === OPS.rectangle) {
              // rectangles on MEP plans are diffusers, grilles, equipment — not duct walls (validated on 3 bids);
              // they still count as clip regions
              var x = co[j], y = co[j + 1], w = co[j + 2], h = co[j + 3], P = [tp(st.ctm, x, y), tp(st.ctm, x + w, y), tp(st.ctm, x + w, y + h), tp(st.ctm, x, y + h)];
              for (var q = 0; q < 4; q++) rects.push([P[q][0], P[q][1], P[(q + 1) % 4][0], P[(q + 1) % 4][1]]);
              j += 4;
            }
          }
          break;
        case OPS.stroke: case OPS.closeStroke: flush(true); break;
        case OPS.fillStroke: case OPS.eoFillStroke: case OPS.closeFillStroke: case OPS.closeEOFillStroke: flush(true, 'both'); break;
        case OPS.fill: case OPS.eoFill: flush(false, true); break;
        case OPS.endPath: flush(false, false); break;
      }
    }
    // text: whole-line strings with positions and reading direction (items on one baseline merged);
    // stacked lines of one note are grouped into a block (leaders start from the block)
    var tc = await page.getTextContent(), items = [];
    tc.items.forEach(function (t) {
      if (!t.str || !t.str.trim()) return;
      var a = t.transform, n = Math.hypot(a[0], a[1]) || 1, dx = a[0] / n, dy = a[1] / n;
      var h = Math.abs(t.height || Math.hypot(a[2], a[3]) || 6), w = t.width || h * t.str.length * 0.5;
      var along = a[4] * dx + a[5] * dy, perp = -a[4] * dy + a[5] * dx;       // text frame coordinates
      items.push({ str: t.str, dx: Math.round(dx * 100) / 100, dy: Math.round(dy * 100) / 100, a0: along, a1: along + w, p: perp, h: h });
    });
    items.sort(function (p, q) { return (p.dx - q.dx) || (p.dy - q.dy) || (Math.round(q.p) - Math.round(p.p)) || (p.a0 - q.a0); });
    var lines = [];
    items.forEach(function (t) {
      var last = lines[lines.length - 1];
      if (last && last.dx === t.dx && last.dy === t.dy && Math.abs(last.p - t.p) < 1 && t.a0 - last.a1 < Math.max(2, t.h * 0.4) && t.a0 >= last.a0) {
        last.str += t.str; last.a1 = t.a1; last.h = Math.max(last.h, t.h);
      } else lines.push({ str: t.str, dx: t.dx, dy: t.dy, a0: t.a0, a1: t.a1, p: t.p, h: t.h });
    });
    function toPage(l, al, pp) { return [al * l.dx - pp * l.dy, al * l.dy + pp * l.dx]; }
    var text = lines.map(function (l) {
      var c = [toPage(l, l.a0, l.p), toPage(l, l.a1, l.p), toPage(l, l.a0, l.p + l.h), toPage(l, l.a1, l.p + l.h)];
      var xs = c.map(function (q) { return q[0]; }), ys = c.map(function (q) { return q[1]; });
      return { str: l.str.trim(), x0: Math.min.apply(null, xs), y0: Math.min.apply(null, ys), x1: Math.max.apply(null, xs), y1: Math.max.apply(null, ys), dir: [l.dx, l.dy], _l: l };
    });
    // blocks: same direction, stacked within 1.8 line heights, overlapping along the text
    var blk = text.map(function (_, i) { return i; });
    function root(i) { while (blk[i] !== i) i = blk[i] = blk[blk[i]]; return i; }
    for (var i2 = 0; i2 < text.length; i2++) for (var j2 = i2 + 1; j2 < text.length; j2++) {
      var A = text[i2]._l, B = text[j2]._l;
      if (A.dx !== B.dx || A.dy !== B.dy) continue;
      if (Math.abs(A.p - B.p) > 1.8 * Math.max(A.h, B.h) || Math.min(A.a1, B.a1) - Math.max(A.a0, B.a0) < -2) continue;
      blk[root(i2)] = root(j2);
    }
    var boxes = {};
    text.forEach(function (t, i) {
      var r = root(i), bx = boxes[r] || [Infinity, Infinity, -Infinity, -Infinity];
      boxes[r] = [Math.min(bx[0], t.x0), Math.min(bx[1], t.y0), Math.max(bx[2], t.x1), Math.max(bx[3], t.y1)];
    });
    text.forEach(function (t, i) { t.block = boxes[root(i)]; delete t._l; });
    var flat = new Float64Array(segs.length * 5);
    segs.forEach(function (s, i) { flat.set(s, i * 5); });
    return { segs: flat, styles: styleList, text: text, fullText: tc.items.map(function (t) { return t.str; }).join(' '), glyphs: glyphs };
  }

  // ─── 1b. OCR for sheets whose text is outlined / stroked (AutoCAD SHX fonts export as tiny paths, not text) ───
  //  glyph boxes (small painted paths) → letters → words (chained along one baseline) → each word rendered from the page,
  //  everything outside its letter boxes whitened, upright, Tesseract single-line read at 0° and 180°. Only label-like words are kept.
  var M_SIZE_RE = /^\s*(\d{1,2})\s*["”]?\s*[xX×]\s*(\d{1,2})\s*["”]?\s*(?:Ø|ø|⌀|∅|F\.?O\.?)?(?:\s*\(.*\))?\s*(?:UP|DN|DOWN|(?:[SREO]\.?\s*\/?\s*A\.?)\b.{0,24})?\s*$/;
  var M_ROUND_RE = /^\s*(\d{1,2})\s*["”]?\s*(?:Ø|ø|⌀|∅|DIA\.?|RD)\s*(?:\(.*\))?\s*(?:(?:[SREO]\.?\s*\/?\s*A\.?)\b.{0,24})?\s*$/i;
  var M_PIPE_RE = /^\s*(?:\d{1,2}\s*-\s*)?(?:\d+\/\d+|\d+)\s*["”]\s*[A-Z]{0,6}\s*(?:\(.*\))?\s*$/;
  var M_SCALE_RE = /(\d+(?:\/\d+)?)\s*["”]\s*=\s*1\s*['’]\s*-?\s*0\s*["”]?/;
  function isSizeLabel(s) { return M_SIZE_RE.test(s) || M_ROUND_RE.test(s); }
  function isPipeLabel(s) { return M_PIPE_RE.test(s); }
  function hasScale(s) { return M_SCALE_RE.test(s || ''); }
  function slashSize(s) {
    return String(s || '').replace(/(^|[^\d\/.-])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d\/"”])/g, function (m, pre, a, b) {
      a = +a; b = +b; if (a < 4 || b < 4 || a > 96 || b > 40) return m;   // duct depths stop at 40"; "24/72" is a sheet index
      if ((b === 4 || b === 8 || b === 16) && a < b) return m;           // 3/4, 1/8, 3/16 are fractions
      return pre + a + 'x' + b;
    });
  }
  function normOcr(s) {
    return slashSize(String(s || '').replace(/[“”″]/g, '"').replace(/[‘’]/g, "'").replace(/[×*]/g, 'x').replace(/(\d)\s*[xX]\s*(\d)/g, '$1x$2')
      .replace(/(\d)\s*"\s*[øØoO0@Q9pg](?![A-Za-z0-9])/g, '$1"Ø').replace(/(\d)\s*[øØ⌀∅](?![A-Za-z0-9])/g, '$1"Ø')
      .replace(/(\d{1,2})\s*"+\s*[^\s"\dA-Za-z]{1,2}$/g, '$1"Ø').replace(/\s+/g, ' ').trim());
  }
  // glyph boxes → words; boxes are [x0,y0,x1,y1] in PDF user space
  function clusterWords(glyphs, opts) {
    opts = opts || {};
    var boxes = glyphs.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }), letters = [];
    boxes.forEach(function (b) {
      for (var i = letters.length - 1, k = 0; i >= 0 && k < 400; i--, k++) {
        var o = letters[i];
        if (b[0] <= o[2] + 0.25 && b[2] >= o[0] - 0.25 && b[1] <= o[3] + 0.25 && b[3] >= o[1] - 0.25) {
          o[0] = Math.min(o[0], b[0]); o[1] = Math.min(o[1], b[1]); o[2] = Math.max(o[2], b[2]); o[3] = Math.max(o[3], b[3]); return;
        }
      }
      letters.push(b.slice());
    });
    letters = letters.filter(function (b) { var m = Math.max(b[2] - b[0], b[3] - b[1]); return m >= 1.0 && m <= 24; });
    var cell = 30, grid = {};
    letters.forEach(function (b, i) { var key = Math.floor(b[0] / cell) + ',' + Math.floor(b[1] / cell); (grid[key] = grid[key] || []).push(i); });
    function near(b) { var cx = Math.floor(b[0] / cell), cy = Math.floor(b[1] / cell), out = []; for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) out = out.concat(grid[(cx + dx) + ',' + (cy + dy)] || []); return out; }
    function gapH(g, b) { return Math.max(b[0] - g[2], g[0] - b[2]); }
    function gapV(g, b) { return Math.max(b[1] - g[3], g[1] - b[3]); }
    function ovV(g, b) { return Math.min(g[3], b[3]) - Math.max(g[1], b[1]); }
    function ovH(g, b) { return Math.min(g[2], b[2]) - Math.max(g[0], b[0]); }
    var used = new Uint8Array(letters.length), words = [];
    letters.forEach(function (a, i) {
      if (used[i]) return;
      used[i] = 1; var grp = [a], orient = null, frontier = [a], tinyN = 0;
      function isTiny(x) { var h = x[3] - x[1], w = x[2] - x[0]; return Math.max(h, w) < 2.5 && Math.min(h, w) < 1.2; }   // quote ticks, dots, degree signs
      while (frontier.length) {
        var g = frontier.pop(), hg = g[3] - g[1], wg = g[2] - g[0];
        var band = [Infinity, Infinity, -Infinity, -Infinity];
        grp.forEach(function (x) { if (isTiny(x) && grp.length > 1) return; band[0] = Math.min(band[0], x[0]); band[1] = Math.min(band[1], x[1]); band[2] = Math.max(band[2], x[2]); band[3] = Math.max(band[3], x[3]); });
        var bh = band[3] - band[1], bw = band[2] - band[0];
        near(g).forEach(function (j) {
          if (used[j]) return;
          var b = letters[j], hb = b[3] - b[1], wb = b[2] - b[0], isH, isV;
          if (isTiny(b)) {
            // a tick joins only close to the word band (few of them per word)
            if (tinyN >= 3) return;
            var cyb = (b[1] + b[3]) / 2, cxb = (b[0] + b[2]) / 2;
            isH = cyb >= band[1] - 0.3 * bh && cyb <= band[3] + 0.3 * bh && gapH(g, b) >= -0.3 * Math.min(wg, wb) && gapH(g, b) <= 0.6 * bh;
            isV = cxb >= band[0] - 0.3 * bw && cxb <= band[2] + 0.3 * bw && gapV(g, b) >= -0.3 * Math.min(hg, hb) && gapV(g, b) <= 0.6 * bw;
            if (isH || isV) tinyN++;
          } else if (isTiny(g)) {
            // continuing past a tick: the next letter must match the word band like a normal neighbour
            isH = ovV(band, b) >= 0.5 * Math.min(hb, bh) && gapH(g, b) >= -0.3 * wb && gapH(g, b) <= 0.9 * Math.max(bh, hb) && Math.max(hb, bh) <= 2.2 * Math.min(hb, bh);
            isV = ovH(band, b) >= 0.5 * Math.min(wb, bw) && gapV(g, b) >= -0.3 * hb && gapV(g, b) <= 0.9 * Math.max(bw, wb) && Math.max(wb, bw) <= 2.2 * Math.min(wb, bw);
          } else {
            isH = ovV(g, b) >= 0.5 * Math.min(hg, hb) && gapH(g, b) >= -0.3 * Math.min(wg, wb) && gapH(g, b) <= 0.9 * Math.max(hg, hb) && Math.max(hg, hb) <= 2.2 * Math.min(hg, hb);
            isV = ovH(g, b) >= 0.5 * Math.min(wg, wb) && gapV(g, b) >= -0.3 * Math.min(hg, hb) && gapV(g, b) <= 0.9 * Math.max(wg, wb) && Math.max(wg, wb) <= 2.2 * Math.min(wg, wb);
          }
          if (orient === 'h' && !isH) return; if (orient === 'v' && !isV) return; if (!isH && !isV) return;
          if (!orient) orient = isH ? 'h' : 'v';
          used[j] = 1; grp.push(b); frontier.push(b);
        });
      }
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      grp.forEach(function (b) { x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); });
      words.push({ box: [x0, y0, x1, y1], n: grp.length, orient: orient || ((y1 - y0) > (x1 - x0) * 1.4 ? 'v' : 'h'), letters: grp });
    });
    var maxL = opts.maxLetters || 10, minL = opts.minLetters || 2;
    return words.filter(function (w) {
      var len = Math.max(w.box[2] - w.box[0], w.box[3] - w.box[1]), th = Math.min(w.box[2] - w.box[0], w.box[3] - w.box[1]);
      return w.n >= minL && w.n <= maxL && len >= 4 && len <= 120 && th >= 2 && th <= 22;
    });
  }
  // Notes, schedules and the title block are dense blocks of words; size / pipe labels stand alone on the linework. Words with many
  // other words around them are left out (a sheet's note column alone is hundreds of words = most of the OCR cost).
  function dropParagraphs(words, radius, maxNear) {
    radius = radius || 45; maxNear = maxNear || 7;
    var cell = radius, grid = {};
    words.forEach(function (w, i) { var cx = (w.box[0] + w.box[2]) / 2, cy = (w.box[1] + w.box[3]) / 2; w._c = [cx, cy]; var k = Math.floor(cx / cell) + ',' + Math.floor(cy / cell); (grid[k] = grid[k] || []).push(i); });
    var out = words.filter(function (w, i) {
      var gx = Math.floor(w._c[0] / cell), gy = Math.floor(w._c[1] / cell), near = 0;
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) (grid[(gx + dx) + ',' + (gy + dy)] || []).forEach(function (j) {
        if (j !== i && Math.hypot(words[j]._c[0] - w._c[0], words[j]._c[1] - w._c[1]) <= radius) near++; });
      return near < maxNear;
    });
    words.forEach(function (w) { delete w._c; });
    return out;
  }
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = res; s.onerror = function () { rej(new Error('tesseract.js failed to load')); }; document.head.appendChild(s);
    });
  }
  // page: pdf.js page; D: from extract(); opts: { dpi, maxLetters, onProgress(done, total) }
  // word crops are composed ~30 per sheet and read with one Tesseract call (sparse text) — a background tab throttles every
  // worker round-trip to ~1 s, so per-word calls would take 15+ minutes per drawing
  async function ocrLabels(page, D, opts) {
    opts = opts || {};
    var t0 = Date.now(), words = clusterWords(D.glyphs || [], { maxLetters: opts.maxLetters || 10, minLetters: opts.minLetters || 2 });
    var wordsAll = words.length; words = dropParagraphs(words, opts.paraRadius, opts.paraMax);
    if (!words.length) return { items: [], words: 0, wordsAll: wordsAll, secs: 0, text: '' };
    // Tesseract is only started when it is needed: opts.reader (Claude vision on the composed crops) replaces it, and is the fallback's primary
    var worker = null;
    async function ensureWorker() {
      if (!worker) {
        await loadTesseract();
        worker = await Tesseract.createWorker('eng', 1, { logger: function () {} });
        await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1', tessedit_char_whitelist: '0123456789xX"\'øØ/-()SRAEOTYPUDNWVBFCGHKLMIJZ. ' });
      }
      return worker;
    }
    var scale = (opts.dpi || 300) / 72, vp0 = page.getViewport({ scale: scale }), W = vp0.width, Hh = vp0.height;   // the page's own orientation (a /Rotate 90 / 270 sheet reads upright)
    var swapOrient = ((page.rotate || 0) % 180) === 90;
    function vertical(w) { return swapOrient ? w.orient === 'h' : w.orient === 'v'; }   // word direction as it is DISPLAYED (orient is in user space)
    var T = 2400, OV = 80, PAD = 2.5 * scale, M = 0.5 * scale, crops = [];
    function px(vp, x, y) { return vp.convertToViewportPoint(x, y); }
    // 1. crop every word out of 300-dpi tiles, whitening everything outside its letter boxes, upright
    var pending = words.map(function (w, i) { return i; });
    for (var ty = 0; ty < Hh && pending.length; ty += T - OV) for (var tx = 0; tx < W && pending.length; tx += T - OV) {
      var vp = page.getViewport({ scale: scale, offsetX: -tx, offsetY: -ty });
      var cw = Math.min(T, Math.ceil(W - tx)), ch = Math.min(T, Math.ceil(Hh - ty)), mine = [];
      pending = pending.filter(function (i) {
        var w = words[i], c = [px(vp, w.box[0], w.box[1]), px(vp, w.box[2], w.box[3])];
        var bx0 = Math.min(c[0][0], c[1][0]) - PAD, by0 = Math.min(c[0][1], c[1][1]) - PAD, bx1 = Math.max(c[0][0], c[1][0]) + PAD, by1 = Math.max(c[0][1], c[1][1]) + PAD;
        if (bx0 >= 0 && by0 >= 0 && bx1 <= cw && by1 <= ch) { mine.push({ i: i, b: [bx0, by0, bx1, by1] }); return false; }
        return true;
      });
      if (!mine.length) continue;
      var canvas = document.createElement('canvas'); canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
      await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
      for (var k = 0; k < mine.length; k++) {
        var w = words[mine[k].i], b = mine[k].b, bx = Math.floor(b[0]), by = Math.floor(b[1]), bw = Math.ceil(b[2] - b[0]), bh = Math.ceil(b[3] - b[1]);
        if (bw < 2 || bh < 2) continue;
        // copy only the letter boxes (clip) — everything else in the crop stays white
        var tmpc = document.createElement('canvas'); tmpc.width = bw; tmpc.height = bh;
        var tc = tmpc.getContext('2d'); tc.fillStyle = '#fff'; tc.fillRect(0, 0, bw, bh);
        tc.save(); tc.beginPath();
        w.letters.forEach(function (L) { var c1 = px(vp, L[0], L[1]), c2 = px(vp, L[2], L[3]);
          var lx0 = Math.min(c1[0], c2[0]) - M - bx, ly0 = Math.min(c1[1], c2[1]) - M - by, lx1 = Math.max(c1[0], c2[0]) + M - bx, ly1 = Math.max(c1[1], c2[1]) + M - by;
          tc.rect(lx0, ly0, lx1 - lx0, ly1 - ly0); });
        tc.clip(); tc.drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh); tc.restore();
        var crop = tmpc;
        if (vertical(w)) { crop = document.createElement('canvas'); crop.width = bh; crop.height = bw; var cc = crop.getContext('2d'); cc.translate(bh, 0); cc.rotate(Math.PI / 2); cc.drawImage(tmpc, 0, 0); }
        crops.push({ i: mine[k].i, c: crop });
      }
      canvas.width = canvas.height = 0;
      if (opts.onProgress) opts.onProgress(0, crops.length, 'cropping');
      await new Promise(function (r) { setTimeout(r, 0); });
    }
    // 2. compose ~30 crops per sheet (rows), read once; then the same sheet with every crop turned 180°
    var GAP = 24, SW = 2400, results = {}, done = 0, GX = GAP, X0 = GAP;
    function score(r) { return r.conf + (isSizeLabel(r.txt) ? 150 : isPipeLabel(r.txt) ? 60 : /^[A-Z]{3,}$/.test(r.txt) && /[AEIOU]/.test(r.txt) ? 20 : 0); }
    for (var s0 = 0; s0 < crops.length; s0 += 30) {
      var batch = crops.slice(s0, s0 + 30), cells = [], x = X0, y = GAP, rowH = 0;
      batch.forEach(function (cr) {
        var cwid = opts.reader ? Math.max(cr.c.width + 12, 74) : cr.c.width, chei = opts.reader ? cr.c.height + 42 : cr.c.height;   // reader mode: a framed cell with its number on top
        if (x + cwid + GX > SW) { x = X0; y += rowH + GAP; rowH = 0; }
        cells.push({ i: cr.i, x: x, y: y, w: cwid, h: chei }); x += cwid + GX; rowH = Math.max(rowH, chei);
      });
      var sheetH = y + rowH + GAP;
      if (opts.reader) {
        // vision reader: one numbered sheet, upright crops; the model transcribes each number (and turns upside-down crops itself)
        try {
          var sheetR = document.createElement('canvas'); sheetR.width = SW; sheetR.height = sheetH;
          var scR = sheetR.getContext('2d'); scR.fillStyle = '#fff'; scR.fillRect(0, 0, SW, sheetH);
          cells.forEach(function (cell, idx) {
            scR.strokeStyle = '#8a8a8a'; scR.lineWidth = 2; scR.strokeRect(cell.x, cell.y, cell.w, cell.h);
            scR.fillStyle = '#d00'; scR.font = 'bold 26px sans-serif'; scR.textBaseline = 'top'; scR.fillText(String(idx + 1), cell.x + 6, cell.y + 5);
            scR.drawImage(batch[idx].c, cell.x + 6, cell.y + 36);
          });
          var reads = await opts.reader(sheetR, cells.length);
          sheetR.width = sheetR.height = 0;
          (reads || []).forEach(function (rd) {
            var cl = cells[(rd.n | 0) - 1]; if (!cl) return;
            var t = normOcr(rd.text || ''); if (t) results[cl.i] = { txt: t, conf: 90, flip: 0 };
          });
          done += batch.length; if (opts.onProgress) opts.onProgress(done, crops.length);
          continue;
        } catch (err) {
          console.warn('[NWGeo] vision reader failed, using Tesseract:', err && err.message);
          opts.reader = null; X0 = GAP;
        }
      }
      for (var flip = 0; flip < 2; flip++) {
        var sheet = document.createElement('canvas'); sheet.width = SW; sheet.height = sheetH;
        var sc = sheet.getContext('2d'); sc.fillStyle = '#fff'; sc.fillRect(0, 0, SW, sheetH);
        cells.forEach(function (cell, idx) {
          var cr = batch[idx].c;
          if (!flip) sc.drawImage(cr, cell.x, cell.y);
          else { sc.save(); sc.translate(cell.x + cell.w, cell.y + cell.h); sc.rotate(Math.PI); sc.drawImage(cr, 0, 0); sc.restore(); }
        });
        var rr = await (await ensureWorker()).recognize(sheet);
        var per = {};
        (rr.data.words || []).forEach(function (wd) {
          var cx = (wd.bbox.x0 + wd.bbox.x1) / 2, cy = (wd.bbox.y0 + wd.bbox.y1) / 2;
          for (var ci = 0; ci < cells.length; ci++) { var cl = cells[ci];
            if (cx >= cl.x - 4 && cx <= cl.x + cl.w + 4 && cy >= cl.y - 4 && cy <= cl.y + cl.h + 4) { (per[cl.i] = per[cl.i] || []).push({ t: wd.text, c: wd.confidence || 0, x: flip ? -wd.bbox.x0 : wd.bbox.x0 }); break; } }
        });
        cells.forEach(function (cl) {
          var ws = (per[cl.i] || []).sort(function (a, b2) { return a.x - b2.x; });
          var txt = normOcr(ws.map(function (q) { return q.t; }).join(' ')), conf = ws.length ? Math.min.apply(null, ws.map(function (q) { return q.c; })) : 0;
          var r = { txt: txt, conf: conf, flip: flip }, prev = results[cl.i];
          if (!prev || score(r) > score(prev)) results[cl.i] = r;
        });
        sheet.width = sheet.height = 0;
      }
      done += batch.length;
      if (opts.onProgress) opts.onProgress(done, crops.length);
    }
    var retry = crops.filter(function (cr) {
      var w = words[cr.i], r = results[cr.i], ticks = w.letters.filter(function (L) { return Math.max(L[3] - L[1], L[2] - L[0]) < 2.5; }).length;
      return !(r && isSizeLabel(r.txt)) && ticks >= 1 && w.n >= 3 && w.n <= 8;
    }).slice(0, 80);
    if (retry.length && worker) {
      await worker.setParameters({ tessedit_pageseg_mode: '7' });
      for (var ri = 0; ri < retry.length; ri++) {
        var cr2 = retry[ri], reads2 = [];
        for (var ang = 0; ang < 2; ang++) {
          var r2 = await worker.recognize(cr2.c, ang ? { rotateAuto: false, rotateRadians: Math.PI } : {});
          reads2.push({ txt: normOcr(r2.data.text), conf: r2.data.confidence || 0, flip: ang });
        }
        reads2.sort(function (a, c) { return score(c) - score(a); });
        if (isSizeLabel(reads2[0].txt)) results[cr2.i] = reads2[0];
        if (opts.onProgress && ri % 10 === 9) opts.onProgress(crops.length, crops.length, 'retry ' + (ri + 1) + '/' + retry.length);
      }
    }
    if (worker) await worker.terminate();
    var items = [], allText = [];
    Object.keys(results).forEach(function (i) {
      var r = results[i], w = words[+i]; if (!r.txt) return;
      allText.push(r.txt);
      if (isSizeLabel(r.txt) || (isPipeLabel(r.txt) && r.conf >= 30))
        items.push({ str: r.txt, x0: w.box[0], y0: w.box[1], x1: w.box[2], y1: w.box[3], dir: w.orient === 'v' ? [0, 1] : [1, 0], block: w.box.slice(), ocr: true, conf: Math.round(r.conf) });
    });
    return { items: items, words: words.length, wordsAll: wordsAll, ocred: crops.length, secs: Math.round((Date.now() - t0) / 1000), text: allText.join(' ') };
  }

  // ─── 2. geometry (runs inside a Web Worker) ───
  function workerMain() {
    // 24x12, 24"x12", 36X12Ø (flat oval), 12X6 SA BRANCH, 10x6 (TYP.), 8x6 UP
    var SIZE_RE = /^\s*(\d{1,2})\s*["”]?\s*[xX×]\s*(\d{1,2})\s*["”]?\s*(?:Ø|ø|⌀|∅|F\.?O\.?)?(?:\s*\(.*\))?\s*(?:UP|DN|DOWN|(?:[SREO]\.?\s*\/?\s*A\.?)\b.{0,24})?\s*$/;
    // 8"ø, 14"ø S/A, 6"ø O/A (round with a service suffix)
    var ROUND_RE = /^\s*(\d{1,2})\s*["”]?\s*(?:Ø|ø|⌀|∅|DIA\.?|RD)\s*(?:\(.*\))?\s*(?:(?:[SREO]\.?\s*\/?\s*A\.?)\b.{0,24})?\s*$/i;
    var SCALE_RE = /(\d+(?:\/\d+)?)\s*["”]\s*=\s*1\s*['’]\s*-?\s*0\s*["”]?/g;
    function frac(s) { if (s.indexOf('/') >= 0) { var p = s.split('/'); return +p[0] / +p[1]; } return +s; }
    function hyp(a, b) { return Math.sqrt(a * a + b * b); }

    var STD_SCALES = [1 / 16, 3 / 32, 1 / 8, 3 / 16, 9 / 64, 1 / 4, 3 / 8, 9 / 32, 1 / 2, 3 / 4, 1];   // inches per foot (3/32, 9/64, 9/32 = 1/8, 3/16, 3/8 printed at 75 %)
    function measure(D) {
      var found = {}, m;
      SCALE_RE.lastIndex = 0;
      while ((m = SCALE_RE.exec(D.fullText))) { var f = frac(m[1]); found[f] = (found[f] || 0) + 1; }
      var textScales = Object.keys(found).map(Number).sort(function (p, q) { return found[q] - found[p] || q - p; });
      var labs = [];
      D.text.forEach(function (t) {
        var a = SIZE_RE.exec(t.str), r = a ? null : ROUND_RE.exec(t.str);
        if (!a && !r) return;
        var w = +(a ? a[1] : r[1]), h = a ? +a[2] : w;
        if (w < 4 || h < 3) return;
        labs.push({ txt: t.str, w: w, h: h, round: !!r, cx: (t.x0 + t.x1) / 2, cy: (t.y0 + t.y1) / 2, bbox: [t.x0, t.y0, t.x1, t.y1] });
      });
      if (labs.length < 3) return { error: textScales.length ? 'fewer than 3 duct size labels' : 'no drawing scale found on the sheet', ptft: textScales.length ? textScales[0] * 72 : undefined };
      var n = D.segs.length / 5;
      // segments by style (skip gray background, white, dashed) — the dash threshold and the dash trains depend on the scale
      function prep(ptft) {
        var bySty = {}, dashSty = {};
        for (var i = 0; i < n; i++) {
          var o = i * 5, st = D.styles[D.segs[o + 4]], c = st.col;
          if (st.dash) {
            if (!(Math.max.apply(null, c) - Math.min.apply(null, c) < 0.05 && c[0] > 0.3) && hyp(D.segs[o + 2] - D.segs[o], D.segs[o + 3] - D.segs[o + 1]) > 0.8 * ptft)
              (dashSty[st.key] = dashSty[st.key] || []).push([D.segs[o], D.segs[o + 1], D.segs[o + 2], D.segs[o + 3]]);
            continue;
          }
          if (Math.max.apply(null, c) - Math.min.apply(null, c) < 0.05 && c[0] > 0.3) continue;
          var x1 = D.segs[o], y1 = D.segs[o + 1], x2 = D.segs[o + 2], y2 = D.segs[o + 3];
          if (hyp(x2 - x1, y2 - y1) <= 1.0) continue;
          (bySty[st.key] = bySty[st.key] || []).push([x1, y1, x2, y2]);
        }
        // dash trains: a duct drawn as a row of 1-ft dashes (360 Lexington's heavy 1.68-pt mains — 375 dashes of 18 pt) becomes one
        // segment per row so labels, pairs and single-line chaining see a line, not 30 stubs
        // duct-weight styles take the merged rows in place; rows made of THIN dashes (360 Lexington's 0.72-pt mains labelled 12x6 / 8x8)
        // only count through dashedRuns, i.e. when a size label sits on them — merged thin dashes fed into pairing made L'Catteron's
        // 0.54-pt lines pair up (+800 ft)
        Object.keys(bySty).forEach(function (key) {
          var w = +key.split('|')[1], merged = mergeDashes(bySty[key], ptft);
          if (w >= 1.0) { bySty[key] = merged; return; }
          var orig = {}; bySty[key].forEach(function (g) { orig[g.join(',')] = 1; });
          merged.forEach(function (g) { if (!orig[g.join(',')] && hyp(g[2] - g[0], g[3] - g[1]) >= 3 * ptft) (dashSty[key] = dashSty[key] || []).push(g); });
        });
        return { bySty: bySty, dashSty: dashSty };
      }
      // per style: the pairs of parallel lines and how many size labels sit INSIDE one at exactly the label's width
      function score(ptft, P) {
        var stats = [], top = 0, topHit = 0;
        Object.keys(P.bySty).forEach(function (key) {
          var segs = P.bySty[key]; if (segs.length < 20 || /^fill\|/.test(key)) return;
          var S = segs.map(norm), pc = findPairs(S, ptft, labs).pieces, sized = 0, tot = 0, tight = 0, hit = {};
          pc.forEach(function (p) {
            tot += p.len_ft; if (looseLabel(p, labs, ptft)) sized += p.len_ft;
            var tl = tightLabel(p, labs, ptft); if (tl) { tight += p.len_ft; hit[tl.cx + ',' + tl.cy] = 1; }
          });
          stats.push([sized, tot, key, tight, Object.keys(hit).length]);
        });
        stats.forEach(function (s) { top = Math.max(top, s[0]); topHit = Math.max(topHit, s[4]); });
        return { stats: stats, top: top, topHit: topHit };
      }
      var ptft = textScales.length ? textScales[0] * 72 : 0, P = null, SC = null, scaleFrom = 'text', thr = Math.max(5, 0.15 * labs.length);
      if (ptft) { P = prep(ptft); SC = score(ptft, P); }
      // self-calibration: when the printed scale does not make the size labels fit the duct walls (a sheet with several views and scales, or
      // a scale note the text layer does not carry — outlined text), try the usual scales: the right one makes the pair gaps equal the labels
      // (OGCP 1520: the 1/4" notes of the two small alt-RCP views outvoted the 1/8" main plan, 3 labels fit instead of 15+)
      if (!ptft || SC.topHit < thr) {
        // candidates: every scale printed on the sheet, and each of them reduced to 75 % / 50 % (a sheet plotted smaller than its drawing size
        // keeps the original scale note — OGCP 1520's "1/8" = 1'-0"" plan is really 3/32"); with no scale note at all, the usual scales
        var cand = [];
        function addC(x) { for (var q = 0; q < cand.length; q++) if (Math.abs(cand[q] - x) < 1e-6) return; if (!ptft || Math.abs(x * 72 - ptft) > 1e-6) cand.push(x); }
        if (textScales.length) textScales.forEach(function (x) { addC(x); addC(x * 0.75); addC(x * 0.5); });
        else STD_SCALES.forEach(addC);
        var lx = labs.map(function (l) { return l.cx; }), ly = labs.map(function (l) { return l.cy; }),
          labSpan = Math.max(Math.max.apply(null, lx) - Math.min.apply(null, lx), Math.max.apply(null, ly) - Math.min.apply(null, ly));
        if (!textScales.length) cand = cand.filter(function (x) { var ft = labSpan / (x * 72); return ft >= 12 && ft <= 1000; });
        var bestC = { ptft: ptft, P: P, SC: SC, hit: SC ? SC.topHit : -1 };
        var tried = [[ptft, SC ? SC.topHit : -1]];
        cand.forEach(function (x) { var pt = x * 72, P2 = prep(pt), S2 = score(pt, P2); tried.push([pt, S2.topHit, S2.stats.map(function (q) { return q[2].replace(/0,0,0/,'K').replace(/0.2,0.2,0.2/,'G') + ':' + q[4] + '/' + Math.round(q[3]) + '/' + Math.round(q[1]); }).filter(function (z) { return z.indexOf(':0/0/') < 0; }).join(' ')]); if (S2.topHit > bestC.hit) bestC = { ptft: pt, P: P2, SC: S2, hit: S2.topHit }; });
        if (D.debugScales) D.debugScales.push.apply(D.debugScales, tried);
        if (bestC.hit >= thr && bestC.hit >= 2 * Math.max(1, SC ? SC.topHit : 0)) { ptft = bestC.ptft; P = bestC.P; SC = bestC.SC; scaleFrom = 'labels'; }
      }
      if (!ptft || !SC) return { error: 'no drawing scale found on the sheet' };
      var bySty = P.bySty, dashSty = P.dashSty, stats = SC.stats, top = SC.top, topHit = SC.topHit;
      // the duct walls are the style whose pairs have a size label INSIDE them at exactly the label's width (OGCP 5200: the thin 0.24-pt background
      // lines paired up everywhere and "matched" 4,800 ft of loose labels — 6.3x too much; the real 1.44-pt walls hold 43 of the 80 labels)
      var keep = topHit >= thr
        ? stats.filter(function (s) { return s[4] === topHit || (s[4] >= 0.6 * topHit && s[3] / Math.max(s[1], 1) >= 0.3); }).map(function (s) { return s[2]; })
        : stats.filter(function (s) { return top && (s[0] === top || (s[0] >= 0.5 * top && s[0] / Math.max(s[1], 1) >= 0.5)); }).map(function (s) { return s[2]; });
      if (D.forceStyle) keep = [D.forceStyle];   // offline experiments
      var S = []; keep.forEach(function (k) { bySty[k].forEach(function (s) { S.push(norm(s)); }); });
      var fp = findPairs(S, ptft, labs), pcs = fp.pieces;
      // sizing order: the label written on / beside the piece → carried along the connected run → the nearest label within
      // 8 ft (same width) → carried again → width + usual depth. A label 25 ft away used to win over the run itself, so a
      // 24x12 supply label stole the 24x8 return beside it (Sage: 24x12 176 ft vs Kastriot's 62).
      // a piece no longer than 1.25x its width is a stub. Stubs that chain (end to end, same width) into a longer piece are duct
      // between fittings and stay; isolated ones are diffuser / VAV box outlines, hatch stripes or equipment and are dropped.
      // Two perpendicular stubs sharing a center are a box outline whatever they touch.
      var stubFt = 0;
      pcs.forEach(function (p) { p.stub = p.len_ft * 12 < p.w_in * 1.25; });
      pcs = pcs.filter(function (p) {
        if (!p.stub) return true;
        var box = pcs.some(function (q) { return q !== p && q.stub && Math.abs(q.cx - p.cx) <= 3 && Math.abs(q.cy - p.cy) <= 3 &&
          Math.abs(q.ux * p.ux + q.uy * p.uy) < 0.3 && Math.abs(q.w_in - p.w_in) <= Math.max(2, p.w_in * 0.15); });
        if (box) stubFt += p.len_ft;
        return !box;
      });
      (function () {
        var comp = pcs.map(function (_, i) { return i; });
        function find(i) { while (comp[i] !== i) { comp[i] = comp[comp[i]]; i = comp[i]; } return i; }
        var E = pcs.map(function (p) { return ends(p, ptft); });
        for (var i = 0; i < pcs.length; i++) for (var j = i + 1; j < pcs.length; j++) {
          var a = pcs[i], b = pcs[j]; if (Math.abs(a.w_in - b.w_in) > 1.6) continue;
          var gap = Math.max(1, Math.max(a.w_in, b.w_in) / 12 * 1.6) * ptft, dmin = Infinity;
          E[i].forEach(function (u) { E[j].forEach(function (v) { dmin = Math.min(dmin, hyp(u[0] - v[0], u[1] - v[1])); }); });
          if (dmin <= gap) comp[find(i)] = find(j);
        }
        var solid = {}; pcs.forEach(function (p, i) { if (!p.stub || onLabel(p, labs, ptft)) solid[find(i)] = true; });
        pcs = pcs.filter(function (p, i) { if (!p.stub || solid[find(i)]) return true; stubFt += p.len_ft; return false; });
      })();
      pcs.forEach(function (p) { var l = onLabel(p, labs, ptft); if (l) { p.size = sizeOf(l); p.via = 'label'; } });
      propagate(pcs, ptft);
      pcs.forEach(function (p) { if (p.size) return; var l = nearLabel(p, labs, ptft); if (l) { p.size = sizeOf(l); p.via = 'near'; } });
      propagate(pcs, ptft);
      // unlabeled pieces wider than any label on the sheet (+4") are shafts / equipment, not duct; wide unlabeled pieces that stay are reported for review
      var wmax = Math.max.apply(null, labs.map(function (l) { return l.w; }).concat([6])) + 4, wideFt = 0;
      pcs = pcs.filter(function (p) { return p.size || p.w_in <= wmax; });
      pcs.forEach(function (p) { if (!p.size && p.w_in > 36) wideFt += p.len_ft; });
      var depth = {};
      labs.forEach(function (l) { if (!l.round) { depth[l.w] = depth[l.w] || {}; depth[l.w][l.h] = (depth[l.w][l.h] || 0) + 1; } });
      pcs.forEach(function (p) {
        if (p.size) return;
        var w = Math.round(p.w_in / 2) * 2, hs = depth[w];
        if (!hs) { hs = {}; Object.keys(depth).forEach(function (lw) { if (Math.abs(lw - w) <= 6) for (var hh in depth[lw]) hs[hh] = (hs[hh] || 0) + depth[lw][hh]; }); if (!Object.keys(hs).length) hs = null; }
        if (!hs) { hs = {}; Object.keys(depth).forEach(function (lw) { for (var hh in depth[lw]) hs[hh] = (hs[hh] || 0) + depth[lw][hh]; }); }
        var h = null; for (var hh in hs) if (h === null || hs[hh] > hs[h]) h = hh;
        h = h === null ? Math.max(4, Math.round(w * 0.6 / 2) * 2) : Math.min(w, +h);
        p.size = w + 'x' + h; p.via = 'width';
      });
      // thin dark lines = leaders
      var minKeepW = Infinity; keep.forEach(function (k) { minKeepW = Math.min(minKeepW, +k.split('|')[1]); });
      var leaders = [];
      for (i = 0; i < n; i++) {
        var o2 = i * 5, st2 = D.styles[D.segs[o2 + 4]];
        if (st2.dash || Math.max.apply(null, st2.col) > 0.3 || !(st2.w <= Math.min(1.0, minKeepW * 0.8))) continue;
        var a1 = D.segs[o2], b1 = D.segs[o2 + 1], a2 = D.segs[o2 + 2], b2 = D.segs[o2 + 3];
        if (hyp(a2 - a1, b2 - b1) > 3) leaders.push([a1, b1, a2, b2]);
      }
      // single-line ducts (round runs drawn as one thick line — BOSS Belmont) may sit in a style that has no wall pairs: chain them
      // from every dark solid style of comparable weight, walls of the paired styles still excluded
      var S2 = S.slice(), used2 = fp.used.slice(), minW = Infinity; keep.forEach(function (k) { minW = Math.min(minW, +k.split('|')[1]); });
      // extra styles must be heavy lines (≥ 1.5 pt — thick polylines / filled bars); thin flex and leader styles never qualify
      Object.keys(bySty).forEach(function (key) {
        if (keep.indexOf(key) >= 0 || bySty[key].length < 40) return;
        var w = +key.split('|')[1]; if (w < Math.max(1.5, minW * 0.6)) return;
        var isBar = /^fill\|/.test(key);
        bySty[key].forEach(function (sg) { var ns = norm(sg); ns.q = isBar; S2.push(ns); used2.push([]); });
      });
      var barSegs = [];
      Object.keys(bySty).forEach(function (key) { if (!/^fill\|/.test(key)) return; bySty[key].forEach(function (sg) { var ns = norm(sg); if (ns[6] >= 0.4 * ptft) barSegs.push(ns); }); });
      var pairLabelFt = pcs.reduce(function (a, p) { return a + p.len_ft; }, 0);
      var barPieces = barSegs.length >= 10 ? barRuns(barSegs, labs, ptft, pairLabelFt) : [];
      if (barPieces.length) { S2 = S2.filter(function (x, i) { if (x.q) used2[i] = null; return !x.q; }); used2 = used2.filter(function (u) { return u !== null; }); }
      var singles = singleLines(S2, used2, labs, ptft, leaders).concat(barPieces);
      var dashPieces = dashedRuns(dashSty, labs, ptft, D.text, S, fp.used, singles);
      singles = singles.concat(dashPieces);
      var all = pcs.concat(singles), sizes = {}, total = 0, sf = 0, wf = 0;
      all.forEach(function (p) {
        sizes[p.size] = (sizes[p.size] || 0) + p.len_ft; total += p.len_ft;
        if (p.kind === 'single') sf += p.len_ft; else if (p.via === 'width') wf += p.len_ft;
      });
      for (var z in sizes) sizes[z] = Math.round(sizes[z] * 10) / 10;
      if (labs.length < 8 && total > 0 && wf > 0.8 * total)
        return { error: 'only ' + labs.length + ' size labels for ' + Math.round(total) + ' ft of paired lines — geometry not trusted', ptft: ptft, labels: labs.length };
      return { ptft: ptft, scale_from: scaleFrom, sizes: sizes, total_ft: Math.round(total * 10) / 10, single_ft: Math.round(sf * 10) / 10, width_ft: Math.round(wf * 10) / 10, wide_unlabeled_ft: Math.round(wideFt * 10) / 10, stub_dropped_ft: Math.round(stubFt * 10) / 10,
        styles: keep, labels: labs.length, pieces: all.length,
        xy: D.wantPieces ? all.map(function (p) { return p.kind === 'single' ? { k: 's', size: p.size, len: p.len_ft, segs: p.xy } : { k: 'd', size: p.size, via: p.via || '', len: p.len_ft, w: p.w_in, cx: p.cx, cy: p.cy, ux: p.ux, uy: p.uy }; }) : undefined,
        debug: stats.sort(function (a, b) { return b[0] - a[0]; }).slice(0, 8).map(function (x) { return [Math.round(x[0]), Math.round(x[1]), x[2], Math.round(x[3]), x[4]]; }) };
    }

    function norm(s) {
      var x1 = s[0], y1 = s[1], x2 = s[2], y2 = s[3], dx = x2 - x1, dy = y2 - y1, L = hyp(dx, dy), ux = dx / L, uy = dy / L;
      if (ux < -1e-9 || (Math.abs(ux) < 1e-9 && uy < 0)) { ux = -ux; uy = -uy; var t = x1; x1 = x2; x2 = t; t = y1; y1 = y2; y2 = t; }
      return [x1, y1, x2, y2, ux, uy, L, Math.atan2(uy, ux)];
    }
    function findPairs(S, ptft, labs) {
      var ptin = ptft / 12, wmin = 5.5 * ptin, wmax = 74 * ptin, buckets = {};
      labs = labs || [];
      S.forEach(function (s, i) { var d = Math.round(s[7] * 180 / Math.PI); (buckets[d] = buckets[d] || []).push(i); });
      var cand = [];
      for (var i = 0; i < S.length; i++) {
        var a = S[i], ux = a[4], uy = a[5], nx = -uy, ny = ux, deg = Math.round(a[7] * 180 / Math.PI);
        [deg - 1, deg, deg + 1, deg - 180, deg + 180].forEach(function (dd) {
          (buckets[dd] || []).forEach(function (j) {
            if (j <= i) return;
            var b = S[j];
            if (Math.abs(Math.sin(b[7] - a[7])) > 0.02) return;
            var d = (b[0] - a[0]) * nx + (b[1] - a[1]) * ny, ad = Math.abs(d);
            if (ad < wmin || ad > wmax) return;
            var t1 = (b[0] - a[0]) * ux + (b[1] - a[1]) * uy, t2 = (b[2] - a[0]) * ux + (b[3] - a[1]) * uy;
            var lo = Math.max(0, Math.min(t1, t2)), hi = Math.min(a[6], Math.max(t1, t2));
            if (hi - lo < Math.max(0.8 * ptft, 0.5 * Math.min(a[6], b[6]))) return;
            // rank: a gap that matches a size label within 25 ft, then walls that run the same extent, then the narrower gap —
            // otherwise the 22" space between two parallel mains pairs first and both real ducts lose a wall
            var w = ad / ptin, cl = [a[0] + ux * lo + nx * d / 2, a[1] + uy * lo + ny * d / 2, a[0] + ux * hi + nx * d / 2, a[1] + uy * hi + ny * d / 2], sc = 0;
            for (var k = 0; k < labs.length; k++) { var l = labs[k];
              if ((Math.abs(l.w - w) <= 2 || (!l.round && Math.abs(l.h - w) <= 2)) && ptSeg(l.cx, l.cy, cl) <= 12 * ptft) { sc += 2; break; } }
            if ((hi - lo) >= 0.9 * Math.max(a[6], b[6])) sc += 1;
            cand.push([ad, i, j, lo, hi, d, sc]);
          });
        });
      }
      cand.sort(function (p, q) { return (q[6] - p[6]) || (p[0] - q[0]); });
      var used = S.map(function () { return []; }), pieces = [];
      function free(k, lo, hi) { return used[k].every(function (r) { return Math.min(hi, r[1]) - Math.max(lo, r[0]) <= 0.3 * (hi - lo); }); }
      cand.forEach(function (c) {
        var a = S[c[1]], b = S[c[2]], lo = c[3], hi = c[4], d = c[5];
        var blo = (a[0] + a[4] * lo - b[0]) * b[4] + (a[1] + a[5] * lo - b[1]) * b[5];
        var bhi = (a[0] + a[4] * hi - b[0]) * b[4] + (a[1] + a[5] * hi - b[1]) * b[5];
        var l2 = Math.min(blo, bhi), h2 = Math.max(blo, bhi);
        if (!free(c[1], lo, hi) || !free(c[2], l2, h2)) return;
        used[c[1]].push([lo, hi]); used[c[2]].push([l2, h2]);
        var nx = -a[5], ny = a[4];
        pieces.push({ kind: 'double', w_in: c[0] / ptin, len_ft: (hi - lo) / ptft, ux: a[4], uy: a[5],
          cx: a[0] + a[4] * (lo + hi) / 2 + nx * d / 2, cy: a[1] + a[5] * (lo + hi) / 2 + ny * d / 2, size: null });
      });
      return { pieces: pieces, used: used };
    }
    function sizeOf(l) { return l.round ? l.w + '"Ø' : l.w + 'x' + l.h; }
    function looseLabel(p, labs, ptft, maxFt) {
      var best = null, bd = 1e9;
      labs.forEach(function (l) {
        if (Math.abs(l.w - p.w_in) > 2.5 && Math.abs(l.h - p.w_in) > 2.5) return;
        var d = hyp(l.cx - p.cx, l.cy - p.cy) / ptft;
        if (d < bd) { best = l; bd = d; }
      });
      return best && bd <= (maxFt || 25) ? best : null;
    }
    // nearest label of the same width within 25 ft — sideways distance counts triple, so a label beside the parallel duct loses to one along this run
    function nearLabel(p, labs, ptft) {
      var best = null, bd = 1e9;
      labs.forEach(function (l) {
        if (Math.abs(l.w - p.w_in) > 2.5 && Math.abs(l.h - p.w_in) > 2.5) return;
        var dx = l.cx - p.cx, dy = l.cy - p.cy, along = Math.abs(dx * p.ux + dy * p.uy), perp = Math.abs(-dx * p.uy + dy * p.ux);
        if (hyp(dx, dy) > 25 * ptft) return;
        var d = along + 3 * perp; if (d < bd) { best = l; bd = d; }
      });
      return best;
    }
    // strict version: the label's width is the piece's gap (±1.2") and the label sits inside the piece's band
    function tightLabel(p, labs, ptft) {
      var best = null, bd = 1e9, half = p.len_ft * ptft / 2;
      labs.forEach(function (l) {
        if (Math.abs(l.w - p.w_in) > 1.2) return;
        var dx = l.cx - p.cx, dy = l.cy - p.cy, along = Math.abs(dx * p.ux + dy * p.uy), perp = Math.abs(-dx * p.uy + dy * p.ux);
        if (along > half + 1.5 * ptft || perp > (p.w_in / 24) * ptft + 0.6 * ptft) return;
        if (perp < bd) { best = l; bd = perp; }
      });
      return best;
    }
    // the label that sits on this piece: level with it along the run and within its walls or just outside them
    function onLabel(p, labs, ptft) {
      var best = null, bd = 1e9, half = p.len_ft * ptft / 2;
      labs.forEach(function (l) {
        if (Math.abs(l.w - p.w_in) > 2.5 && Math.abs(l.h - p.w_in) > 2.5) return;
        var dx = l.cx - p.cx, dy = l.cy - p.cy, along = Math.abs(dx * p.ux + dy * p.uy), perp = Math.abs(-dx * p.uy + dy * p.ux);
        if (along > half + 2 * ptft) return;
        var lim = (p.w_in / 24) * ptft + 2.5 * ptft;     // half the width + 2.5 ft
        if (perp > lim) return;
        if (perp < bd) { best = l; bd = perp; }
      });
      return best;
    }
    function ends(p, ptft) { var h = p.len_ft * ptft / 2; return [[p.cx - p.ux * h, p.cy - p.uy * h], [p.cx + p.ux * h, p.cy + p.uy * h]]; }
    function propagate(pcs, ptft) {
      var changed = true;
      while (changed) {
        changed = false;
        var sized = pcs.filter(function (p) { return p.size && p.kind === 'double'; });
        pcs.forEach(function (u) {
          if (u.size || u.kind !== 'double') return;
          var ue = ends(u, ptft), gap = Math.max(1, u.w_in / 12 * 1.6) * ptft;
          for (var k = 0; k < sized.length; k++) {
            var s = sized[k]; if (Math.abs(s.w_in - u.w_in) > 1.6) continue;
            var se = ends(s, ptft), dmin = Infinity;
            ue.forEach(function (a) { se.forEach(function (b) { dmin = Math.min(dmin, hyp(a[0] - b[0], a[1] - b[1])); }); });
            if (dmin <= gap) { u.size = s.size; u.via = 'run'; changed = true; break; }
          }
        });
      }
    }
    function ptSeg(px, py, s) {
      var x1 = s[0], y1 = s[1], x2 = s[2], y2 = s[3], L2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      var t = L2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / L2));
      return hyp(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }
    function leaderEnds(l, leaders) {
      var x0 = l.bbox[0] - 5, y0 = l.bbox[1] - 5, x1 = l.bbox[2] + 5, y1 = l.bbox[3] + 5, outs = [];
      function inside(x, y) { return x >= x0 && x <= x1 && y >= y0 && y <= y1; }
      leaders.forEach(function (a) {
        [[a[0], a[1], a[2], a[3]], [a[2], a[3], a[0], a[1]]].forEach(function (e) {
          if (!inside(e[0], e[1]) || inside(e[2], e[3])) return;
          var px = e[2], py = e[3];
          for (var hop = 0; hop < 3; hop++) {
            var nxt = null;
            leaders.forEach(function (b) {
              if (b === a) return;
              [[b[0], b[1], b[2], b[3]], [b[2], b[3], b[0], b[1]]].forEach(function (f) {
                if (hyp(f[0] - px, f[1] - py) < 1 && hyp(f[2] - px, f[3] - py) > 2) nxt = [f[2], f[3]];
              });
            });
            if (!nxt) break;
            px = nxt[0]; py = nxt[1];
          }
          outs.push([px, py]);
        });
      });
      return outs;
    }
    // dashed single-line ducts that carry their own size labels — 360 Lexington / April Tax / L'Catteron (MG Engineering) draw the
    // linear-diffuser feeds as dashed lines labelled 12x6 / 8x8; a chain counts only when a label sits on it (no borrowing), and
    // labels next to "existing" / "(E)" / "remain" / "remove" text are left alone
    function dashedRuns(dashSty, labs, ptft, text, S, used, singles) {
      var pieces = [], existing = (text || []).filter(function (t) { return /exist|\(e\)|remain|demol|remove/i.test(t.str || ''); });
      // a label already sitting on a paired wall or a single-line run belongs to that duct, not to a dash row beside it (L'Catteron / Sage)
      function usedLen(i) { return (used[i] || []).reduce(function (a, iv) { return a + Math.max(0, Math.min(S[i][6], iv[1]) - Math.max(0, iv[0])); }, 0); }
      var taken = labs.map(function (l) {
        for (var i = 0; i < S.length; i++) if (usedLen(i) > 0 && ptSeg(l.cx, l.cy, S[i]) < 1.2 * ptft) return true;
        for (var k = 0; k < singles.length; k++) { var sx = singles[k].xy || []; for (var m = 0; m < sx.length; m++) if (ptSeg(l.cx, l.cy, sx[m]) < 1.2 * ptft) return true; }
        return false;
      });
      function close(a, b, tol) {
        return Math.min(hyp(a[0] - b[0], a[1] - b[1]), hyp(a[0] - b[2], a[1] - b[3]), hyp(a[2] - b[0], a[3] - b[1]), hyp(a[2] - b[2], a[3] - b[3]),
                        ptSeg(b[0], b[1], a), ptSeg(b[2], b[3], a), ptSeg(a[0], a[1], b), ptSeg(a[2], a[3], b)) < tol;
      }
      Object.keys(dashSty).forEach(function (key) {
        var B = dashSty[key].map(norm); if (B.length < 2 || B.length > 2500) return;
        var n = B.length, comp = B.map(function (_, i) { return i; });
        function find(i) { while (comp[i] !== i) { comp[i] = comp[comp[i]]; i = comp[i]; } return i; }
        for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) { if (find(i) !== find(j) && close(B[i], B[j], 6)) comp[find(i)] = find(j); }
        var segSize = new Array(n), chains = {}, labelled = 0;
        B.forEach(function (b, i) {
          var best = null, bd = 1e9;
          labs.forEach(function (l, li) {
            if (taken[li]) return;
            var dx = l.cx - b[0], dy = l.cy - b[1], along = dx * b[4] + dy * b[5], perp = Math.abs(-dx * b[5] + dy * b[4]);
            if (along < -ptft || along > b[6] + ptft || perp > 0.8 * ptft) return;
            if (existing.some(function (t) { return hyp((t.x0 + t.x1) / 2 - l.cx, (t.y0 + t.y1) / 2 - l.cy) < 3 * ptft; })) return;
            if (perp < bd) { best = l; bd = perp; }
          });
          if (best) { segSize[i] = sizeOf(best); labelled++; }
          (chains[find(i)] = chains[find(i)] || []).push(i);
        });
        if (labelled < 2) return;
        Object.keys(chains).forEach(function (c) {
          var ids = chains[c], cnt = {}, majority = null;
          ids.forEach(function (i) { if (segSize[i]) cnt[segSize[i]] = (cnt[segSize[i]] || 0) + B[i][6]; });
          Object.keys(cnt).forEach(function (k) { if (majority === null || cnt[k] > cnt[majority]) majority = k; });
          if (!majority) return;
          ids.forEach(function (i) {
            var sz = segSize[i] || majority;
            pieces.push({ kind: 'single', w_in: parseInt(sz, 10) || 0, len_ft: B[i][6] / ptft, size: sz, via: segSize[i] ? 'label' : 'run', dashed: true, xy: [B[i].slice(0, 4)] });
          });
        });
      });
      return pieces;
    }
    function mergeDashes(segs, ptft) {
      if (segs.length < 20) return segs;
      var lens = segs.map(function (g) { return hyp(g[2] - g[0], g[3] - g[1]); }).sort(function (a, b) { return a - b; });
      var med = lens[Math.floor(lens.length / 2)];
      if (med > 2.2 * ptft) return segs;                        // ordinary lines, not dashes
      var groups = {}, out = [], maxGap = Math.min(3 * ptft, Math.max(6, 2.5 * med));
      segs.forEach(function (g) {
        var dx = g[2] - g[0], dy = g[3] - g[1], L = hyp(dx, dy); if (L < 0.5) { out.push(g); return; }
        var ux = dx / L, uy = dy / L; if (ux < -1e-9 || (Math.abs(ux) < 1e-9 && uy < 0)) { ux = -ux; uy = -uy; }
        var ang = Math.round(Math.atan2(uy, ux) * 200), off = -g[0] * uy + g[1] * ux, k = ang + '|' + Math.round(off / 1.5);
        (groups[k] = groups[k] || []).push({ g: g, ux: ux, uy: uy, t0: Math.min(g[0] * ux + g[1] * uy, g[2] * ux + g[3] * uy), t1: Math.max(g[0] * ux + g[1] * uy, g[2] * ux + g[3] * uy), off: off });
      });
      Object.keys(groups).forEach(function (k) {
        var G = groups[k].sort(function (a, b) { return a.t0 - b.t0; }), cur = null;
        // a run merges only when it looks like a dash pattern: 4+ dashes of similar length with similar gaps (hatch ticks,
        // diffuser symbols and grid marks in the duct style stay as they are — L'Catteron / Sage went +89 % / +24 % without this)
        function cv(a) { if (a.length < 2) return 1; var m = a.reduce(function (x, y) { return x + y; }, 0) / a.length; var v = a.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / a.length; return m > 0 ? Math.sqrt(v) / m : 1; }
        function flush() {
          if (!cur) return;
          var regular = cur.n >= 4 && cv(cur.lens) <= 0.35 && cv(cur.gaps) <= 0.5 && cur.t1 - cur.t0 >= 3 * ptft;
          if (regular) { var ux = cur.ux, uy = cur.uy, px = -uy * cur.off, py = ux * cur.off; out.push([px + ux * cur.t0, py + uy * cur.t0, px + ux * cur.t1, py + uy * cur.t1]); }
          else cur.items.forEach(function (e) { out.push(e.g); });
          cur = null;
        }
        G.forEach(function (e) {
          if (cur && e.t0 - cur.t1 <= maxGap && e.t0 - cur.t1 >= 0.5 && e.t1 - e.t0 <= 2 * ptft) { cur.gaps.push(e.t0 - cur.t1); cur.lens.push(e.t1 - e.t0); cur.t1 = Math.max(cur.t1, e.t1); cur.n++; cur.off = (cur.off * (cur.n - 1) + e.off) / cur.n; cur.items.push(e); }
          else { flush(); cur = { g: e.g, ux: e.ux, uy: e.uy, t0: e.t0, t1: e.t1, off: e.off, n: 1, lens: [e.t1 - e.t0], gaps: [], items: [e] }; }
        });
        flush();
      });
      return out;
    }
    function barRuns(B, labs, ptft, pairLabelFt) {
      var n = B.length, comp = B.map(function (_, i) { return i; });
      function find(i) { while (comp[i] !== i) { comp[i] = comp[comp[i]]; i = comp[i]; } return i; }
      function near(a, b, tol) {
        var E = [[a[0], a[1]], [a[2], a[3]]], F = [[b[0], b[1]], [b[2], b[3]]];
        for (var x = 0; x < 2; x++) for (var y = 0; y < 2; y++) if (hyp(E[x][0] - F[y][0], E[x][1] - F[y][1]) < tol) return true;
        return Math.min(ptSeg(b[0], b[1], a), ptSeg(b[2], b[3], a), ptSeg(a[0], a[1], b), ptSeg(a[2], a[3], b)) < tol;
      }
      var cell = 60, grid = {};
      B.forEach(function (b, i) { var k = Math.floor((b[0] + b[2]) / 2 / cell) + ',' + Math.floor((b[1] + b[3]) / 2 / cell); (grid[k] = grid[k] || []).push(i); });
      for (var i = 0; i < n; i++) {
        var cx = Math.floor((B[i][0] + B[i][2]) / 2 / cell), cy = Math.floor((B[i][1] + B[i][3]) / 2 / cell);
        for (var dx = -2; dx <= 2; dx++) for (var dy = -2; dy <= 2; dy++) (grid[(cx + dx) + ',' + (cy + dy)] || []).forEach(function (j) {
          if (j <= i || find(i) === find(j)) return;
          if (near(B[i], B[j], 12)) comp[find(i)] = find(j);
        });
      }
      // label on a bar: within 2.5 ft sideways and along the bar (±1 ft)
      var segSize = new Array(n), chains = {};
      B.forEach(function (b, i) {
        var best = null, bd = 1e9;
        labs.forEach(function (l) {
          var dx = l.cx - b[0], dy = l.cy - b[1], along = dx * b[4] + dy * b[5], perp = Math.abs(-dx * b[5] + dy * b[4]);
          if (along < -ptft || along > b[6] + ptft || perp > 2.5 * ptft) return;
          if (perp < bd) { best = l; bd = perp; }
        });
        if (best) segSize[i] = sizeOf(best);
        (chains[find(i)] = chains[find(i)] || []).push(i);
      });
      // only a bar-drawn duct set qualifies: labels must sit on bars at least as much as on wall pairs (hatch strips and wall
      // fills are bars too — Sage / L'Catteron / Sky Zone carry thousands of feet of them)
      var labBars = 0, labBarFt = 0; segSize.forEach(function (z, i) { if (z) { labBars++; labBarFt += B[i][6] / ptft; } });
      if (labBars < 6 || labBarFt < 0.5 * (pairLabelFt || 0)) return [];
      // bars that are duct WALLS (Sage: two bars 6–48" apart, labels on them) are handled by the pair logic — a labelled bar with a
      // parallel partner over half its length is a wall; if most labelled bars are walls this is not a single-line drawing
      var walls = 0, ptin = ptft / 12;
      segSize.forEach(function (z, i) {
        if (!z) return;
        var a = B[i], hasP = B.some(function (b, j) {
          if (j === i || Math.abs(Math.sin(b[7] - a[7])) > 0.03) return false;
          var d = Math.abs((b[0] - a[0]) * -a[5] + (b[1] - a[1]) * a[4]); if (d < 4 * ptin || d > 48 * ptin) return false;
          var t1 = (b[0] - a[0]) * a[4] + (b[1] - a[1]) * a[5], t2 = (b[2] - a[0]) * a[4] + (b[3] - a[1]) * a[5];
          return Math.min(a[6], Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2)) > 0.5 * Math.min(a[6], b[6]);
        });
        if (hasP) walls++;
      });
      if (walls > 0.4 * labBars) return [];
      var freq = {}; labs.forEach(function (l) { var k = sizeOf(l); freq[k] = (freq[k] || 0) + 1; });
      var common = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; })[0] || null;
      var pieces = [];
      Object.keys(chains).forEach(function (c) {
        var ids = chains[c], cnt = {}, majority = null;
        ids.forEach(function (i) { if (segSize[i]) cnt[segSize[i]] = (cnt[segSize[i]] || 0) + B[i][6]; });
        Object.keys(cnt).forEach(function (k) { if (majority === null || cnt[k] > cnt[majority]) majority = k; });
        if (majority === null) {
          // no label on this network: it is duct only if it runs within 30 pt of a labelled bar (a branch whose elbow arc broke the
          // chain); a network with no labelled bar anywhere near is a wall outline
          var close = ids.some(function (i) { return B.some(function (o, j) { return segSize[j] && Math.min(ptSeg(B[i][0], B[i][1], o), ptSeg(B[i][2], B[i][3], o)) < 30; }); });
          if (!close) return;
        }
        ids.forEach(function (i) {
          var sz = segSize[i] || majority, via = segSize[i] ? 'label' : majority ? 'run' : 'default';
          if (!sz) {
            // nearest sized bar within 30 pt
            var bd2 = 1e9; B.forEach(function (o, j) { if (!segSize[j] || j === i) return; var d = Math.min(ptSeg(B[i][0], B[i][1], o), ptSeg(B[i][2], B[i][3], o)); if (d < bd2 && d < 30) { bd2 = d; sz = segSize[j]; via = 'near'; } });
          }
          if (!sz) sz = common;
          if (!sz) return;
          var w = parseInt(sz, 10) || 0;
          pieces.push({ kind: 'single', w_in: w, len_ft: B[i][6] / ptft, size: sz, via: via, bar: true, xy: [B[i].slice(0, 4)] });
        });
      });
      return pieces;
    }
    function singleLines(S, used, labs, ptft, leaders) {
      // a trunk line that the pair pass nibbled at (16" stubs every 6 ft on 360 Lexington's 20x6 mains) is still a single-line duct:
      // segments stay available while less than half their length is inside pairs, and only the untouched part is counted
      function usedLen(i) { return (used[i] || []).reduce(function (a, iv) { return a + Math.max(0, Math.min(S[i][6], iv[1]) - Math.max(0, iv[0])); }, 0); }
      function freeLen(i) { return Math.max(0, S[i][6] - usedLen(i)); }
      // partially paired segments qualify only as long trunks (≥ 8 ft, < 35 % inside pairs); short nibbled pieces are diffuser boxes and walls (Sage)
      var freeIdx = []; S.forEach(function (s, i) { var u = usedLen(i); if (u === 0 ? s[6] >= 0.5 * ptft : (u < 0.5 * s[6] && s[6] >= 4 * ptft)) freeIdx.push(i); });
      function touching(i, j, tol) {
        tol = tol || 1.5;
        var s = S[i], t = S[j], E = [[s[0], s[1]], [s[2], s[3]]], F = [[t[0], t[1]], [t[2], t[3]]];
        for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) if (hyp(E[a][0] - F[b][0], E[a][1] - F[b][1]) < tol) return true;
        return Math.min(ptSeg(t[0], t[1], s), ptSeg(t[2], t[3], s), ptSeg(s[0], s[1], t), ptSeg(s[2], s[3], t)) < tol;
      }
      var pieces = [], seen = {};
      labs.forEach(function (l) {
        var best = null, bd = 1e9;
        leaderEnds(l, leaders).forEach(function (pt) {
          freeIdx.forEach(function (i) { var dd = ptSeg(pt[0], pt[1], S[i]); if (dd <= 4 && dd < bd) { best = i; bd = dd; } });
        });
        if (best === null) {
          freeIdx.forEach(function (i) {
            var s = S[i], dx = l.cx - (s[0] + s[2]) / 2, dy = l.cy - (s[1] + s[3]) / 2;
            var along = Math.abs(dx * s[4] + dy * s[5]), perp = Math.abs(-dx * s[5] + dy * s[4]);
            if (along > s[6] / 2 + ptft || perp > (usedLen(i) > 0 ? 1.0 : 2) * ptft) return;   // a nibbled trunk needs the label right on it
            if (perp < bd) { best = i; bd = perp; }
          });
        }
        if (best === null || seen[best]) return;
        var chain = {}, stack = [best], cnt = 1; chain[best] = 1;
        while (stack.length && cnt <= 60) {
          var k = stack.pop();
          freeIdx.forEach(function (j) {
            if (chain[j] || seen[j] || S[j][6] < 0.4 * ptft || usedLen(j) > 0) return;
            if (touching(k, j)) { chain[j] = 1; stack.push(j); cnt++; }
          });
        }
        var ids = Object.keys(chain).map(Number);
        ids.forEach(function (j) { seen[j] = 1; });
        var L = ids.reduce(function (a, j) { return a + freeLen(j); }, 0) / ptft;
        if (L < 3) return;
        // a duct WALL whose partner wall is fragmented into several pairs must not come back as a single line: paired segments running
        // parallel within 30" on either side are summed, and half the main's length covered means it is a wall (Sage)
        var main = ids.reduce(function (a, j) { return S[j][6] > S[a][6] ? j : a; }, ids[0]), mm = S[main], side = [0, 0];
        for (var j = 0; j < S.length; j++) {
          if (usedLen(j) < 0.5 * S[j][6] || Math.abs(Math.sin(S[j][7] - mm[7])) > 0.02) continue;
          var dSigned = (S[j][0] - mm[0]) * -mm[5] + (S[j][1] - mm[1]) * mm[4], d = Math.abs(dSigned);
          if (d < 1.5 || d > 30 * ptft / 12) continue;
          var t1 = (S[j][0] - mm[0]) * mm[4] + (S[j][1] - mm[1]) * mm[5], t2 = (S[j][2] - mm[0]) * mm[4] + (S[j][3] - mm[1]) * mm[5];
          var ov = Math.min(mm[6], Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2));
          if (ov > 0) side[dSigned < 0 ? 0 : 1] += ov;
        }
        if (Math.max(side[0], side[1]) > 0.5 * mm[6]) return;
        pieces.push({ kind: 'single', w_in: l.w, len_ft: L, size: sizeOf(l), ids: ids, xy: ids.map(function (j) { return S[j].slice(0, 4); }) });
      });
      // unlabelled branches: free segments touching a labelled single run are runouts of that run (BOSS: 10"ø mains with
      // unlabelled stubs to every diffuser) — they take the run's size; growth stops at 40 segments per run
      pieces.forEach(function (pc) {
        var stack = pc.ids.slice(), added = 0;
        while (stack.length && added < 40) {
          var k = stack.pop();
          freeIdx.forEach(function (j) {
            if (seen[j] || added >= 40 || S[j][6] < 0.4 * ptft || usedLen(j) > 0) return;
            // bars (thick polylines) meet through hairline elbow arcs that are not in any duct style — bridge up to 12 pt for them
            if (!touching(k, j, (S[j].q || S[k].q) ? 12 : 3.5)) return;
            seen[j] = 1; added++; stack.push(j);
            pc.len_ft += freeLen(j) / ptft; pc.xy.push(S[j].slice(0, 4)); pc.branch = (pc.branch || 0) + freeLen(j) / ptft;
          });
        }
      });
      pieces.forEach(function (pc) { delete pc.ids; });
      return pieces;
    }

    // ─── pipes: single lines; sizes from labels (beside the line or on a leader), carried through the network ───
    var PSIZE = /(^|[^\d\/.\-])(\d{1,2}\s*-\s*\d\/\d|\d{1,2}\s+\d\/\d|\d\/\d|\d{1,3}(?:\.\d)?)\s*["”]\s*(?:Ø|ø|∅|DIA\.?)?(?!\s*[xX×]\s*\d)/;
    var PSVC = /\b(CHWS\/R|CHWS|CHWR|CWS&R|CWS\/R|CWS|CWR|HWS\/R|HWS|HWR|HHWS|HHWR|CD|RS&R|RS\/RL|RS|RL|RLS|CW)\b/;
    function pipeSizeIn(raw) {
      raw = raw.replace(/\s+/g, ' ').trim();
      var m = /^(\d{1,2})\s*-\s*(\d)\/(\d)$/.exec(raw) || /^(\d{1,2}) (\d)\/(\d)$/.exec(raw);
      if (m) return +m[1] + (+m[2]) / (+m[3]);
      m = /^(\d)\/(\d)$/.exec(raw); if (m) return (+m[1]) / (+m[2]);
      if (/^\d{3}$/.test(raw) && '13'.indexOf(raw[1]) >= 0 && '248'.indexOf(raw[2]) >= 0) return +raw[0] + (+raw[1]) / (+raw[2]);   // "114" = 1¼ glyph
      return parseFloat(raw);
    }
    function pipeLabel(v) {
      var whole = Math.floor(v), f = { 0.25: '1/4', 0.5: '1/2', 0.75: '3/4' }[Math.round((v - whole) * 4) / 4] || '';
      return (whole ? whole : '') + (whole && f ? '-' : '') + f + '"';
    }
    function measurePipes(D) {
      var found = {}, m; SCALE_RE.lastIndex = 0;
      while ((m = SCALE_RE.exec(D.fullText))) { var f = frac(m[1]); found[f] = (found[f] || 0) + 1; }
      var best = null; for (var k in found) if (!best || found[k] > found[best]) best = k;
      if (!best) return { error: 'no drawing scale found on the sheet' };
      var ptft = +best * 72, labs = [];
      D.text.forEach(function (t) {
        var txt = t.str; if (/['’]/.test(txt) || txt.length > 34) return;
        var mm = PSIZE.exec(txt); if (!mm) return;
        var rest = (txt.slice(0, mm.index) + txt.slice(mm.index + mm[0].length)).trim();
        if (rest && !PSVC.test(rest) && !/^(PROVIDE|NEW|TO|\s)*$/.test(rest)) return;
        var v = pipeSizeIn(mm[2]); if (!(v > 0 && v <= 16)) return;
        var sv = PSVC.exec(txt);
        labs.push({ txt: txt, d: v, svc: sv ? sv[1] : null, cx: (t.x0 + t.x1) / 2, cy: (t.y0 + t.y1) / 2, dir: t.dir || [1, 0], bbox: [t.x0, t.y0, t.x1, t.y1], block: t.block || [t.x0, t.y0, t.x1, t.y1] });
      });
      if (labs.length < 2) return { error: 'fewer than 2 pipe size labels', ptft: ptft };
      var n = D.segs.length / 5, segs = [], leaders = [];
      for (var i = 0; i < n; i++) {
        var o = i * 5, st = D.styles[D.segs[o + 4]], c = st.col;
        var x1 = D.segs[o], y1 = D.segs[o + 1], x2 = D.segs[o + 2], y2 = D.segs[o + 3], L = hyp(x2 - x1, y2 - y1);
        if (Math.max.apply(null, c) - Math.min.apply(null, c) < 0.05 && c[0] > 0.3) continue;       // gray background
        if (!st.dash && st.w <= 1.0 && Math.max.apply(null, c) <= 0.3 && L > 3) leaders.push([x1, y1, x2, y2]);
        if (L >= 0.3 * ptft) { var sg = norm([x1, y1, x2, y2]); sg.push(st.key); segs.push(sg); }
      }
      function near(l, S) {
        var tol = Math.max(1.3 * ptft, 20), dx = l.dir[0], dy = l.dir[1], hits = [];
        S.forEach(function (s, i) {
          if (Math.abs(s[4] * dx + s[5] * dy) < 0.97) return;
          var ex = l.cx - s[0], ey = l.cy - s[1], along = ex * s[4] + ey * s[5], perp = Math.abs(-ex * s[5] + ey * s[4]);
          if (along < -0.5 * ptft || along > s[6] + 0.5 * ptft || perp > tol) return;
          hits.push([perp, i]);
        });
        return hits.sort(function (p, q) { return p[0] - q[0]; });
      }
      // MEP pipes are drawn in black; the dark-gray lines (architecture, walls, ceiling) sit beside most labels too and, joined up through
      // wall corners, carried one "2in CHWS" label over 1,875 ft of wall (OGCP 5200). When black lines answer at least half of the labels
      // that any line answers, only black lines are pipe candidates.
      var blackSegs = segs.filter(function (sg) { var c0 = sg[8].split('|')[0]; return c0 === 'fill' || Math.max.apply(null, c0.split(',').map(Number)) <= 0.12; });
      if (blackSegs.length && blackSegs.length < segs.length) {
        var nAny = 0, nBlack = 0;
        labs.forEach(function (l) { if (near(l, segs).length) nAny++; if (near(l, blackSegs).length) nBlack++; });
        if (nBlack >= 1 && nBlack >= 0.5 * nAny) { segs = blackSegs; }
      }
      var votes = {};
      labs.forEach(function (l) { var h = near(l, segs); if (h.length) votes[segs[h[0][1]][8]] = (votes[segs[h[0][1]][8]] || 0) + 1; });
      var top = 0; for (var vk in votes) top = Math.max(top, votes[vk]);
      if (!top) return { error: 'no pipe lines next to the size labels', ptft: ptft, labels: labs.length };
      var keep = Object.keys(votes).filter(function (kk) { return votes[kk] >= Math.max(2, 0.25 * top) || votes[kk] === top; });
      var S = segs.filter(function (s) { return keep.indexOf(s[8]) >= 0; });
      var size = {}, seedD = {};
      function seed(i, l, d) { if (!(i in size) || d < seedD[i]) { size[i] = [l.d, l.svc]; seedD[i] = d; } }   // the closest label owns a line
      labs.forEach(function (l) {
        var h = near(l, S);
        if (h.length) { var b0 = h[0][0]; h.forEach(function (x) { if (x[0] <= b0 + 0.9 * ptft) seed(x[1], l, x[0]); }); return; }
        var led = false;
        leaderEnds(l, leaders).concat(leaderEnds({ bbox: l.block }, leaders)).forEach(function (pt) {
          var bi = null, bd = 4;
          S.forEach(function (s, i) { var dd = ptSeg(pt[0], pt[1], s); if (dd <= bd) { bi = i; bd = dd; } });
          if (bi !== null) { seed(bi, l, bd); led = true; }
        });
        if (led) return;
        // text written across a pipe (horizontal label beside a vertical run): the pipes just off the text box
        var bb = l.bbox, pc = [], ptol = Math.max(2 * ptft, 45);
        S.forEach(function (s, i) {
          if (Math.abs(s[4] * l.dir[0] + s[5] * l.dir[1]) > 0.26) return;
          var ox = Math.abs(s[4]) > 0.5 ? 0 : 1, lo = Math.min(s[ox], s[ox + 2]), hi = Math.max(s[ox], s[ox + 2]), c0 = ox ? bb[1] : bb[0], c1 = ox ? bb[3] : bb[2];
          if (Math.abs(s[4]) > 0.02 && Math.abs(s[5]) > 0.02) return;         // orthogonal runs only
          if (hi < c0 - 2 || lo > c1 + 2) return;                              // the run must pass alongside the text
          var q0 = ox ? bb[0] : bb[1], q1 = ox ? bb[2] : bb[3], v = s[1 - ox], d = v < q0 ? q0 - v : v > q1 ? v - q1 : 0;
          if (d <= ptol) pc.push([d, i]);
        });
        if (pc.length) { pc.sort(function (a, b) { return a[0] - b[0]; }); pc.forEach(function (x) { if (x[0] <= pc[0][0] + 0.9 * ptft) seed(x[1], l, x[0] + 0.5 * ptft); }); }
      });
      // network: touching ends or an end on another line's body (tee); nearest label wins (multi-source BFS)
      var grid = {};
      S.forEach(function (s, i) { [[s[0], s[1]], [s[2], s[3]]].forEach(function (e) { var key = Math.floor(e[0] / 4) + ',' + Math.floor(e[1] / 4); (grid[key] = grid[key] || []).push(i); }); });
      function nbrs(i) {
        var s = S[i], cand = {}, out = [];
        [[s[0], s[1]], [s[2], s[3]]].forEach(function (e) {
          var gx = Math.floor(e[0] / 4), gy = Math.floor(e[1] / 4);
          for (var ax = gx - 1; ax <= gx + 1; ax++) for (var ay = gy - 1; ay <= gy + 1; ay++) (grid[ax + ',' + ay] || []).forEach(function (j) { if (j !== i) cand[j] = 1; });
        });
        Object.keys(cand).forEach(function (js) {
          var j = +js, t = S[j], E = [[s[0], s[1]], [s[2], s[3]]], F = [[t[0], t[1]], [t[2], t[3]]], touch = false;
          for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) if (hyp(E[a][0] - F[b][0], E[a][1] - F[b][1]) < 1.5) touch = true;
          if (touch || Math.min(ptSeg(t[0], t[1], s), ptSeg(t[2], t[3], s), ptSeg(s[0], s[1], t), ptSeg(s[2], s[3], t)) < 1.5) out.push(j);
        });
        return out;
      }
      // Sizes spread by distance along the pipe (Dijkstra), but a branch's size does not climb through a tee onto the run it
      // feeds: that costs a big penalty, so the run takes its own label if any reaches it (else the largest branch size).
      var NB = {};
      function nb(i) { return NB[i] || (NB[i] = nbrs(i)); }
      function ends(s) { return [[s[0], s[1]], [s[2], s[3]]]; }
      function onBody(e, t) { return ptSeg(e[0], e[1], t) < 1.5 && hyp(e[0] - t[0], e[1] - t[1]) > 1.5 && hyp(e[0] - t[2], e[1] - t[3]) > 1.5; }
      function colin(a, b) { return Math.abs(a[4] * b[5] - a[5] * b[4]) < 0.05; }
      function branchToRun(i, j) {
        var a = S[i], b = S[j], ea = ends(a), eb = ends(b), P = null;
        if (onBody(ea[0], b) || onBody(ea[1], b)) return true;            // i's end lands on j's body: i tees into j
        if (onBody(eb[0], a) || onBody(eb[1], a)) return false;           // j tees off i
        for (var x = 0; x < 2 && !P; x++) for (var y = 0; y < 2; y++) if (hyp(ea[x][0] - eb[y][0], ea[x][1] - eb[y][1]) < 1.5) { P = ea[x]; break; }
        if (!P || colin(a, b)) return false;
        var others = nb(i).filter(function (k) { return k !== j && ptSeg(P[0], P[1], S[k]) < 1.5; });
        if (!others.length) return false;                                  // plain elbow
        return others.some(function (k) { return colin(S[k], b); });      // j continues straight on the far side: j is the run
      }
      var dist = {}, heap = [];
      function push(d, i) { heap.push([d, i]); var c = heap.length - 1; while (c) { var p2 = (c - 1) >> 1; if (heap[p2][0] <= heap[c][0]) break; var tmp = heap[p2]; heap[p2] = heap[c]; heap[c] = tmp; c = p2; } }
      function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var c = 0; for (;;) { var l2 = 2 * c + 1, r2 = l2 + 1, m2 = c; if (l2 < heap.length && heap[l2][0] < heap[m2][0]) m2 = l2; if (r2 < heap.length && heap[r2][0] < heap[m2][0]) m2 = r2; if (m2 === c) break; var t2 = heap[m2]; heap[m2] = heap[c]; heap[c] = t2; c = m2; } } return top; }
      Object.keys(size).forEach(function (is) { dist[is] = 0; push(0, +is); });
      while (heap.length) {
        var tp = pop(), cur = tp[1]; if (tp[0] > dist[cur]) continue;
        nb(cur).forEach(function (j) {
          var c = tp[0] + S[j][6] / ptft + (branchToRun(cur, j) ? 1000 - 10 * size[cur][0] : 0);
          if (!(j in dist) || c < dist[j]) { dist[j] = c; size[j] = size[cur]; push(c, j); }
        });
      }
      var sizes = {}, total = 0;
      Object.keys(size).forEach(function (is) {
        var i = +is, kk = pipeLabel(size[i][0]) + (size[i][1] === 'CD' ? ' CD' : '');
        sizes[kk] = (sizes[kk] || 0) + S[i][6] / ptft; total += S[i][6] / ptft;
      });
      for (var z in sizes) sizes[z] = Math.round(sizes[z] * 10) / 10;
      // a few labels cannot size hundreds of feet: that is a size spreading over walls or equipment, not a pipe run
      if (labs.length < 12 && total > 150 * labs.length) return { error: 'only ' + labs.length + ' pipe labels for ' + Math.round(total) + ' ft of lines — geometry not trusted', ptft: ptft, labels: labs.length };
      return { ptft: ptft, sizes: sizes, total_ft: Math.round(total * 10) / 10, labels: labs.length, styles: keep, votes: votes, lab_list: labs.map(function (l) { return l.txt; }),
        xy: D.wantPieces ? Object.keys(size).map(function (is) { return { s: S[+is].slice(0, 4), z: pipeLabel(size[is][0]) + (size[is][1] === 'CD' ? ' CD' : '') }; }) : undefined };
    }
    // ─── risers: vertical pipe on a riser diagram. The diagram is not to scale sideways, but its floor lines carry
    // elevations ("EL: 47'-0"" / "125'-0" ROOF"), so a pipe drawn between them is measured on that elevation scale.
    function measureRisers(D) {
      var EL = /^(?:EL\.?\s*:?\s*)?([+-]?)\s*(\d{1,3})\s*['’]\s*-?\s*(\d{1,2}(?:\.\d+)?)?\s*["”]?\s*(?:A\.?F\.?F\.?)?\s*(?:ROOF|FLOOR|LEVEL|BASEMENT|CELLAR|.{0,14}FLOOR)?\s*$/i;
      var els = [];
      D.text.forEach(function (t) {
        var m = EL.exec(t.str); if (!m) return;
        var blockTxt = D.text.filter(function (u) { return u.block && t.block && u.block[0] === t.block[0] && u.block[1] === t.block[1]; }).map(function (u) { return u.str; }).join(' ');
        if (!/^EL/i.test(t.str) && !/FLOOR|ROOF|LEVEL|BASEMENT|CELLAR|EL\b/i.test(blockTxt)) return;
        var v = (+m[2] + (m[3] ? +m[3] / 12 : 0)) * (m[1] === '-' ? -1 : 1);
        els.push({ v: v, cx: (t.x0 + t.x1) / 2, cy: (t.y0 + t.y1) / 2 });
      });
      if (els.length < 2) return { error: 'no floor elevations on the riser diagram' };
      // the elevation axis: the page direction along which the elevation labels are spread
      var sx = Math.max.apply(null, els.map(function (e) { return e.cx; })) - Math.min.apply(null, els.map(function (e) { return e.cx; }));
      var sy = Math.max.apply(null, els.map(function (e) { return e.cy; })) - Math.min.apply(null, els.map(function (e) { return e.cy; }));
      var ax = sx > sy ? 0 : 1;
      els.forEach(function (e) { e.a = ax ? e.cy : e.cx; e.p = ax ? e.cx : e.cy; });
      els.sort(function (p, q) { return p.a - q.a; });
      // drop duplicates (same label twice), then split into diagrams: elevation must move one way along the axis
      var runs = [], curR = [];
      els.forEach(function (e) {
        var last = curR[curR.length - 1];
        if (last && Math.abs(e.a - last.a) < 3) return;
        if (curR.length >= 2) {
          var dir0 = Math.sign(curR[1].v - curR[0].v), dir1 = Math.sign(e.v - last.v);
          var k0 = (curR[1].v - curR[0].v) / (curR[1].a - curR[0].a), k1 = (e.v - last.v) / (e.a - last.a);
          if (dir1 !== dir0 || !(k1 / k0 > 0.33 && k1 / k0 < 3)) { runs.push(curR); curR = []; }
        } else if (curR.length === 1 && e.v === last.v) { curR = []; }
        curR.push(e);
      });
      runs.push(curR);
      runs = runs.filter(function (r) { return r.length >= 2; });
      if (!runs.length) return { error: 'floor elevations do not form a scale' };
      function runOf(a) {
        for (var i = 0; i < runs.length; i++) {
          var r = runs[i], lo = r[0].a, hi = r[r.length - 1].a, pad = (hi - lo) / (r.length - 1) * 0.6;
          if (a >= lo - pad && a <= hi + pad) return r;
        }
        return null;
      }
      function elev(r, a) {
        var i = 0; while (i < r.length - 2 && a > r[i + 1].a) i++;
        return r[i].v + (r[i + 1].v - r[i].v) * (a - r[i].a) / (r[i + 1].a - r[i].a);
      }
      // pipe lines: dark, solid; drawn along the elevation axis
      var n = D.segs.length / 5, segs = [], cross = [];
      function xyAt(a, pp) { return ax ? [pp, a] : [a, pp]; }
      for (var i = 0; i < n; i++) {
        var o = i * 5, st = D.styles[D.segs[o + 4]], c = st.col;
        if (st.dash || Math.max.apply(null, c) > 0.3 || st.w < 0.3) continue;
        var x1 = D.segs[o], y1 = D.segs[o + 1], x2 = D.segs[o + 2], y2 = D.segs[o + 3];
        var a1 = ax ? y1 : x1, a2 = ax ? y2 : x2, p1 = ax ? x1 : y1, p2 = ax ? x2 : y2;
        if (Math.abs(a1 - a2) <= 0.6 && Math.abs(p2 - p1) >= 10) { cross.push({ a: (a1 + a2) / 2, p0: Math.min(p1, p2), p1: Math.max(p1, p2) }); continue; }
        if (Math.abs(p1 - p2) > 0.6 || Math.abs(a2 - a1) < 6) continue;
        var ra = runOf(a1), rb = runOf(a2); if (!ra || ra !== rb) continue;
        var span = ra[ra.length - 1].a - ra[0].a;
        if (Math.abs(a2 - a1) > 0.9 * span) continue;                         // frames / building outline
        var lo = Math.min(a1, a2), hi = Math.max(a1, a2), pm = (p1 + p2) / 2;
        var cuts = [lo].concat(ra.map(function (e) { return e.a; }).filter(function (a) { return a > lo + 2 && a < hi - 2; }), [hi]);
        for (var k = 0; k + 1 < cuts.length; k++) {
          var A = xyAt(cuts[k], pm), B = xyAt(cuts[k + 1], pm);
          segs.push({ a0: cuts[k], a1: cuts[k + 1], p: pm, run: ra, xy: [A[0], A[1], B[0], B[1]], ft: Math.abs(elev(ra, cuts[k + 1]) - elev(ra, cuts[k])) });
        }
      }
      // size labels beside the risers (text runs across the pipe, or along it)
      var labs = [], branchLabs = [];
      D.text.forEach(function (t) {
        var txt = t.str; if (/['’]/.test(txt) || txt.length > 34) return;
        var mm = PSIZE.exec(txt); if (!mm) return;
        var rest = (txt.slice(0, mm.index) + txt.slice(mm.index + mm[0].length)).trim();
        if (rest && !PSVC.test(rest) && !/^(PROVIDE|NEW|TO|UP|DN|DOWN|\s)*$/i.test(rest)) return;
        var v = pipeSizeIn(mm[2]); if (!(v > 0 && v <= 16)) return;
        var sv = PSVC.exec(txt), L = { d: v, svc: sv ? sv[1] : null, a0: ax ? t.y0 : t.x0, a1: ax ? t.y1 : t.x1, p0: ax ? t.x0 : t.y0, p1: ax ? t.x1 : t.y1 };
        var onBranch = cross.some(function (c) {
          var d = c.a < L.a0 ? L.a0 - c.a : c.a > L.a1 ? c.a - L.a1 : 0;
          return d <= 8 && Math.min(c.p1, L.p1) - Math.max(c.p0, L.p0) > 0.5 * (L.p1 - L.p0);
        });
        if (!onBranch) labs.push(L); else branchLabs.push(L);
      });
      var got = {}, tol = 70;
      segs.forEach(function (s, i) {
        var best = null, bd = tol;
        labs.forEach(function (l) {
          if (l.a1 < s.a0 - 2 || l.a0 > s.a1 + 2) return;                       // label in the same floor band as the piece
          var d = s.p < l.p0 ? l.p0 - s.p : s.p > l.p1 ? s.p - l.p1 : 0;
          if (d < bd) { bd = d; best = l; }
        });
        if (best) got[i] = best;
      });
      // unlabeled pieces of a labeled riser (same line, further along) take its size
      for (var pass = 0, changed = true; changed && pass < 20; pass++) {
        changed = false;
        segs.forEach(function (s, i) {
          if (got[i]) return;
          var best = null, bd = 1e9;
          segs.forEach(function (t, j) {
            if (!got[j] || Math.abs(t.p - s.p) > 1 || t.run !== s.run) return;
            var d = Math.max(0, t.a0 - s.a1, s.a0 - t.a1); if (d < bd) { bd = d; best = got[j]; }
          });
          if (best && bd < 3) { got[i] = best; changed = true; }
        });
      }
      // plant / pump-room stubs: short verticals without a label of their own take the size of the pipe they connect to —
      // the labelled main drawn across (“6" CWS” along the header), or a labelled riser reached through the horizontal runs
      var crossSize = {};
      cross.forEach(function (c, ci) {
        var best = null, bd = 30;   // the size is written just above / below the header line
        branchLabs.concat(labs).forEach(function (l) { var d = Math.abs((l.a0 + l.a1) / 2 - c.a); if (d < bd && l.p1 > c.p0 - 4 && l.p0 < c.p1 + 4) { bd = d; best = l; } });
        if (best) crossSize[ci] = best;
      });
      var near = function (u, v) { return Math.abs(u - v) <= 2; };
      function touches(s, c) {   // vertical piece s ↔ cross line c: shared end, or a T on either body
        var endOnCross = (near(s.a0, c.a) || near(s.a1, c.a)) && s.p >= c.p0 - 2 && s.p <= c.p1 + 2;
        var crossEndOnSeg = (near(c.p0, s.p) || near(c.p1, s.p)) && c.a >= s.a0 - 2 && c.a <= s.a1 + 2;
        return endOnCross || crossEndOnSeg;
      }
      var adj = {}; function link(x, y) { (adj[x] = adj[x] || []).push(y); (adj[y] = adj[y] || []).push(x); }
      segs.forEach(function (s, i) { cross.forEach(function (c, ci) { if (touches(s, c)) link('s' + i, 'c' + ci); }); });
      // collinear pieces bridge the gaps left by valve and equipment symbols (up to 30 pt)
      segs.forEach(function (s, i) { segs.forEach(function (t, j) { if (j <= i) return; if (Math.abs(s.p - t.p) <= 1 && Math.max(0, t.a0 - s.a1, s.a0 - t.a1) <= 30) link('s' + i, 's' + j); }); });
      cross.forEach(function (c, ci) { cross.forEach(function (d, di) { if (di <= ci) return; if (near(c.a, d.a) && Math.max(0, d.p0 - c.p1, c.p0 - d.p1) <= 30) link('c' + ci, 'c' + di); }); });
      var queue = [], dist = {};
      segs.forEach(function (s, i) { if (got[i]) { dist['s' + i] = 0; queue.push('s' + i); } });
      cross.forEach(function (c, ci) { if (crossSize[ci]) { dist['c' + ci] = 0; queue.push('c' + ci); } });
      var srcOf = {}; queue.forEach(function (k) { srcOf[k] = k[0] === 's' ? got[+k.slice(1)] : crossSize[+k.slice(1)]; });
      while (queue.length) {
        var cur = queue.shift();
        (adj[cur] || []).forEach(function (nb) { if (dist[nb] != null) return; dist[nb] = dist[cur] + 1; srcOf[nb] = srcOf[cur]; queue.push(nb); });
      }
      var inherited = 0;
      segs.forEach(function (s, i) { if (!got[i] && srcOf['s' + i] && dist['s' + i] <= 10) { got[i] = srcOf['s' + i]; inherited++; } });
      var sizes = {}, total = 0, unsized = 0;
      segs.forEach(function (s, i) {
        if (!got[i]) { unsized += s.ft; return; }
        if (s.ft < 0.3) return;   // plant diagrams squeeze the elevation scale: pump-room stubs are only a foot or two each
        var k = pipeLabel(got[i].d) + (got[i].svc === 'CD' ? ' CD' : '');
        sizes[k] = (sizes[k] || 0) + s.ft; total += s.ft;
      });
      for (var z in sizes) sizes[z] = Math.round(sizes[z] * 10) / 10;
      return { sizes: sizes, total_ft: Math.round(total * 10) / 10, unsized_ft: Math.round(unsized), inherited: inherited, levels: runs.map(function (r) { return r.map(function (e) { return e.v; }); }), risers: true,
        xy: D.wantPieces ? segs.map(function (s, i) { return { s: s.xy, z: got[i] ? pipeLabel(got[i].d) : '?', ft: Math.round(s.ft * 10) / 10 }; }) : undefined };
    }
    onmessage = function (e) {
      try { postMessage({ ok: true, result: e.data.mode === 'risers' ? measureRisers(e.data) : e.data.mode === 'pipes' ? measurePipes(e.data) : measure(e.data) }); }
      catch (err) { postMessage({ ok: false, error: String(err && err.message || err) }); }
    };
  }

  var W = null, chain = Promise.resolve();
  function measure(data) {
    var job = chain.then(function () {
      if (!W) W = new Worker(URL.createObjectURL(new Blob(['(' + workerMain.toString() + ')()'], { type: 'text/javascript' })));
      return new Promise(function (res, rej) {
        W.onmessage = function (e) { e.data.ok ? res(e.data.result) : rej(new Error(e.data.error)); };
        W.onerror = function (e) { rej(new Error(e.message || 'geometry worker failed')); };
        W.postMessage(data, [data.segs.buffer]);
      });
    });
    chain = job.catch(function () {});
    return job;
  }

  // small JPEG renders of a sheet for the triage model: the whole sheet, the title-block strip along the right edge and the lower-right corner
  async function triageImages(page) {
    var v0 = page.getViewport({ scale: 1 }), k = 3200 / Math.max(v0.width, v0.height), vp = page.getViewport({ scale: k });
    var W = Math.round(vp.width), H = Math.round(vp.height);
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
    function jpg(sx, sy, sw, sh, maxSide) {
      var f = Math.min(1, maxSide / Math.max(sw, sh)), o = document.createElement('canvas'); o.width = Math.max(1, Math.round(sw * f)); o.height = Math.max(1, Math.round(sh * f));
      var oc = o.getContext('2d'); oc.fillStyle = '#fff'; oc.fillRect(0, 0, o.width, o.height); oc.drawImage(c, sx, sy, sw, sh, 0, 0, o.width, o.height);
      var out = o.toDataURL('image/jpeg', 0.72).split(',')[1]; o.width = o.height = 0; return out;
    }
    var rx = Math.round(W * 0.82), cx = Math.round(W * 0.55), cy = Math.round(H * 0.8);
    var out = [jpg(0, 0, W, H, 1800), jpg(rx, 0, W - rx, H, 1400), jpg(cx, cy, W - cx, H - cy, 1400)];
    c.width = c.height = 0; return out;
  }

  function measurePipes(data) { data.mode = 'pipes'; return measure(data); }
  function measureRisers(data) { data.mode = 'risers'; return measure(data); }
  window.NWGeo = { extract: extract, measure: measure, measurePipes: measurePipes, measureRisers: measureRisers, ocrLabels: ocrLabels, clusterWords: clusterWords, triageImages: triageImages,
    isSizeLabel: isSizeLabel, isPipeLabel: isPipeLabel, hasScale: hasScale, _worker: workerMain };   // _worker: for offline tests
})();
