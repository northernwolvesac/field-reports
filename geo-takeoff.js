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
    var st = { ctm: [1, 0, 0, 1, 0, 0], lw: 1, col: [0, 0, 0], dash: false }, stack = [], path = [], cur = null, start = null;
    var segs = [];   // [x1,y1,x2,y2, styleIndex]
    var styles = {}, styleList = [];
    function styleKey() {
      var scale = Math.sqrt(Math.abs(st.ctm[0] * st.ctm[3] - st.ctm[1] * st.ctm[2])) || 1;
      var w = Math.round(st.lw * scale * 100) / 100;
      var c = st.col.map(function (v) { return Math.round(v * 100) / 100; });
      var k = c.join(',') + '|' + w + '|' + (st.dash ? 'd' : '');
      if (!(k in styles)) { styles[k] = styleList.length; styleList.push({ key: k, col: c, w: w, dash: st.dash }); }
      return styles[k];
    }
    function flush(stroke) {
      if (stroke && path.length) {
        var si = styleKey();
        for (var i = 0; i < path.length; i++) segs.push(path[i].concat([si]));
      }
      path = []; cur = null; start = null;
    }
    for (var i = 0; i < ol.fnArray.length; i++) {
      var fn = ol.fnArray[i], a = ol.argsArray[i];
      switch (fn) {
        case OPS.save: stack.push({ ctm: st.ctm.slice(), lw: st.lw, col: st.col.slice(), dash: st.dash }); break;
        case OPS.restore: if (stack.length) st = stack.pop(); break;
        case OPS.transform: st.ctm = mul(a, st.ctm); break;
        case OPS.paintFormXObjectBegin: stack.push({ ctm: st.ctm.slice(), lw: st.lw, col: st.col.slice(), dash: st.dash }); if (a && a[0]) st.ctm = mul(a[0], st.ctm); break;
        case OPS.paintFormXObjectEnd: if (stack.length) st = stack.pop(); break;
        case OPS.setLineWidth: st.lw = a[0]; break;
        case OPS.setDash: st.dash = !!(a && a[0] && a[0].length); break;
        case OPS.setGState:
          (a[0] || []).forEach(function (kv) { if (kv[0] === 'LW') st.lw = kv[1]; if (kv[0] === 'D') st.dash = !!(kv[1] && kv[1][0] && kv[1][0].length); });
          break;
        case OPS.setStrokeRGBColor: st.col = rgb(a); break;
        case OPS.setStrokeGray: st.col = [a[0], a[0], a[0]].map(Number); break;
        case OPS.setStrokeCMYKColor: var k = a[3]; st.col = [(1 - a[0]) * (1 - k), (1 - a[1]) * (1 - k), (1 - a[2]) * (1 - k)]; break;
        case OPS.constructPath:
          var ops = a[0], co = a[1], j = 0;
          for (var o = 0; o < ops.length; o++) {
            var op = ops[o];
            if (op === OPS.moveTo) { cur = tp(st.ctm, co[j], co[j + 1]); start = cur; j += 2; }
            else if (op === OPS.lineTo) { var p = tp(st.ctm, co[j], co[j + 1]); if (cur) path.push([cur[0], cur[1], p[0], p[1]]); cur = p; j += 2; }
            else if (op === OPS.curveTo) { cur = tp(st.ctm, co[j + 4], co[j + 5]); j += 6; }
            else if (op === OPS.curveTo2 || op === OPS.curveTo3) { cur = tp(st.ctm, co[j + 2], co[j + 3]); j += 4; }
            else if (op === OPS.closePath) { if (cur && start) path.push([cur[0], cur[1], start[0], start[1]]); cur = start; }
            else if (op === OPS.rectangle) {
              var x = co[j], y = co[j + 1], w = co[j + 2], h = co[j + 3], P = [tp(st.ctm, x, y), tp(st.ctm, x + w, y), tp(st.ctm, x + w, y + h), tp(st.ctm, x, y + h)];
              for (var q = 0; q < 4; q++) path.push([P[q][0], P[q][1], P[(q + 1) % 4][0], P[(q + 1) % 4][1]]);
              j += 4;
            }
          }
          break;
        case OPS.stroke: case OPS.closeStroke: case OPS.fillStroke: case OPS.eoFillStroke: case OPS.closeFillStroke: case OPS.closeEOFillStroke:
          flush(true); break;
        case OPS.fill: case OPS.eoFill: case OPS.endPath:
          flush(false); break;
      }
    }
    // text: whole-line strings with positions (items on one baseline merged)
    var tc = await page.getTextContent(), items = tc.items.filter(function (t) { return t.str && t.str.trim(); });
    items.sort(function (p, q) { return (Math.round(q.transform[5]) - Math.round(p.transform[5])) || (p.transform[4] - q.transform[4]); });
    var lines = [];
    items.forEach(function (t) {
      var x = t.transform[4], y = t.transform[5], h = Math.abs(t.height || t.transform[3] || 6), w = t.width || h * t.str.length * 0.5;
      var last = lines[lines.length - 1];
      if (last && Math.abs(last.y - y) < 1 && x - last.x1 < Math.max(2, h * 0.4) && x >= last.x0) { last.str += t.str; last.x1 = x + w; last.h = Math.max(last.h, h); }
      else lines.push({ str: t.str, x0: x, x1: x + w, y: y, h: h });
    });
    var text = lines.map(function (l) { return { str: l.str.trim(), x0: l.x0, y0: l.y, x1: l.x1, y1: l.y + l.h }; });
    var flat = new Float64Array(segs.length * 5);
    segs.forEach(function (s, i) { flat.set(s, i * 5); });
    return { segs: flat, styles: styleList, text: text, fullText: tc.items.map(function (t) { return t.str; }).join(' ') };
  }

  // ─── 2. geometry (runs inside a Web Worker) ───
  function workerMain() {
    var SIZE_RE = /^\s*(\d{1,2})\s*["”]?\s*[xX×]\s*(\d{1,2})\s*["”]?(?:\s*\(.*\))?\s*(?:UP|DN|DOWN)?\s*$/;
    var ROUND_RE = /^\s*(\d{1,2})\s*["”]?\s*(?:Ø|ø|⌀|DIA\.?|RD)\s*(?:\(.*\))?\s*$/i;
    var SCALE_RE = /(\d+(?:\/\d+)?)\s*["”]\s*=\s*1\s*['’]\s*-?\s*0\s*["”]?/g;
    function frac(s) { if (s.indexOf('/') >= 0) { var p = s.split('/'); return +p[0] / +p[1]; } return +s; }
    function hyp(a, b) { return Math.sqrt(a * a + b * b); }

    function measure(D) {
      var found = {}, m;
      SCALE_RE.lastIndex = 0;
      while ((m = SCALE_RE.exec(D.fullText))) { var f = frac(m[1]); found[f] = (found[f] || 0) + 1; }
      var best = null; for (var k in found) if (!best || found[k] > found[best]) best = k;
      if (!best) return { error: 'no drawing scale found on the sheet' };
      var ptft = +best * 72;
      var labs = [];
      D.text.forEach(function (t) {
        var a = SIZE_RE.exec(t.str), r = a ? null : ROUND_RE.exec(t.str);
        if (!a && !r) return;
        var w = +(a ? a[1] : r[1]), h = a ? +a[2] : w;
        if (w < 4 || h < 3) return;
        labs.push({ txt: t.str, w: w, h: h, round: !!r, cx: (t.x0 + t.x1) / 2, cy: (t.y0 + t.y1) / 2, bbox: [t.x0, t.y0, t.x1, t.y1] });
      });
      if (labs.length < 3) return { error: 'fewer than 3 duct size labels', ptft: ptft };
      // segments by style (skip gray background, white, dashed)
      var bySty = {}, n = D.segs.length / 5;
      for (var i = 0; i < n; i++) {
        var o = i * 5, st = D.styles[D.segs[o + 4]], c = st.col;
        if (st.dash) continue;
        if (Math.max.apply(null, c) - Math.min.apply(null, c) < 0.05 && c[0] > 0.3) continue;
        var x1 = D.segs[o], y1 = D.segs[o + 1], x2 = D.segs[o + 2], y2 = D.segs[o + 3];
        if (hyp(x2 - x1, y2 - y1) <= 1.0) continue;
        (bySty[st.key] = bySty[st.key] || []).push([x1, y1, x2, y2]);
      }
      var stats = [];
      Object.keys(bySty).forEach(function (key) {
        var segs = bySty[key]; if (segs.length < 20) return;
        var S = segs.map(norm), pc = findPairs(S, ptft).pieces, sized = 0, tot = 0;
        pc.forEach(function (p) { tot += p.len_ft; if (looseLabel(p, labs, ptft)) sized += p.len_ft; });
        stats.push([sized, tot, key]);
      });
      var top = 0; stats.forEach(function (s) { top = Math.max(top, s[0]); });
      var keep = stats.filter(function (s) { return top && s[0] >= 0.5 * top && s[0] / Math.max(s[1], 1) >= 0.5; }).map(function (s) { return s[2]; });
      var S = []; keep.forEach(function (k) { bySty[k].forEach(function (s) { S.push(norm(s)); }); });
      var fp = findPairs(S, ptft), pcs = fp.pieces;
      pcs.forEach(function (p) { var l = looseLabel(p, labs, ptft); if (l) p.size = sizeOf(l); });
      propagate(pcs, ptft);
      var wmax = Math.max.apply(null, labs.map(function (l) { return l.w; }).concat([6])) + 4;
      pcs = pcs.filter(function (p) { return p.size || p.w_in <= wmax; });
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
      var singles = singleLines(S, fp.used, labs, ptft, leaders);
      var all = pcs.concat(singles), sizes = {}, total = 0, sf = 0, wf = 0;
      all.forEach(function (p) {
        sizes[p.size] = (sizes[p.size] || 0) + p.len_ft; total += p.len_ft;
        if (p.kind === 'single') sf += p.len_ft; else if (p.via === 'width') wf += p.len_ft;
      });
      for (var z in sizes) sizes[z] = Math.round(sizes[z] * 10) / 10;
      return { ptft: ptft, sizes: sizes, total_ft: Math.round(total * 10) / 10, single_ft: Math.round(sf * 10) / 10, width_ft: Math.round(wf * 10) / 10,
        styles: keep, labels: labs.length, pieces: all.length,
        debug: stats.sort(function (a, b) { return b[0] - a[0]; }).slice(0, 8).map(function (x) { return [Math.round(x[0]), Math.round(x[1]), x[2]]; }) };
    }

    function norm(s) {
      var x1 = s[0], y1 = s[1], x2 = s[2], y2 = s[3], dx = x2 - x1, dy = y2 - y1, L = hyp(dx, dy), ux = dx / L, uy = dy / L;
      if (ux < -1e-9 || (Math.abs(ux) < 1e-9 && uy < 0)) { ux = -ux; uy = -uy; var t = x1; x1 = x2; x2 = t; t = y1; y1 = y2; y2 = t; }
      return [x1, y1, x2, y2, ux, uy, L, Math.atan2(uy, ux)];
    }
    function findPairs(S, ptft) {
      var ptin = ptft / 12, wmin = 5.5 * ptin, wmax = 74 * ptin, buckets = {};
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
            cand.push([ad, i, j, lo, hi, d]);
          });
        });
      }
      cand.sort(function (p, q) { return p[0] - q[0]; });
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
    function looseLabel(p, labs, ptft) {
      var best = null, bd = 1e9;
      labs.forEach(function (l) {
        if (Math.abs(l.w - p.w_in) > 2.5 && Math.abs(l.h - p.w_in) > 2.5) return;
        var d = hyp(l.cx - p.cx, l.cy - p.cy) / ptft;
        if (d < bd) { best = l; bd = d; }
      });
      return best && bd <= 25 ? best : null;
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
    function singleLines(S, used, labs, ptft, leaders) {
      var freeIdx = []; S.forEach(function (s, i) { if (!used[i].length && s[6] >= 0.5 * ptft) freeIdx.push(i); });
      function touching(i, j) {
        var s = S[i], t = S[j], E = [[s[0], s[1]], [s[2], s[3]]], F = [[t[0], t[1]], [t[2], t[3]]];
        for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) if (hyp(E[a][0] - F[b][0], E[a][1] - F[b][1]) < 1.5) return true;
        return Math.min(ptSeg(t[0], t[1], s), ptSeg(t[2], t[3], s), ptSeg(s[0], s[1], t), ptSeg(s[2], s[3], t)) < 1.5;
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
            if (along > s[6] / 2 + ptft || perp > 2 * ptft) return;
            if (perp < bd) { best = i; bd = perp; }
          });
        }
        if (best === null || seen[best]) return;
        var chain = {}, stack = [best], cnt = 1; chain[best] = 1;
        while (stack.length && cnt <= 60) {
          var k = stack.pop();
          freeIdx.forEach(function (j) {
            if (chain[j] || seen[j] || S[j][6] < 0.4 * ptft) return;
            if (touching(k, j)) { chain[j] = 1; stack.push(j); cnt++; }
          });
        }
        var ids = Object.keys(chain).map(Number);
        ids.forEach(function (j) { seen[j] = 1; });
        var L = ids.reduce(function (a, j) { return a + S[j][6]; }, 0) / ptft;
        if (L < 3) return;
        var main = ids.reduce(function (a, j) { return S[j][6] > S[a][6] ? j : a; }, ids[0]), mm = S[main], wall = false;
        for (var j = 0; j < S.length && !wall; j++) {
          if (!used[j].length || Math.abs(Math.sin(S[j][7] - mm[7])) > 0.02) continue;
          var d = Math.abs((S[j][0] - mm[0]) * -mm[5] + (S[j][1] - mm[1]) * mm[4]);
          if (d > 30 * ptft / 12) continue;
          var t1 = (S[j][0] - mm[0]) * mm[4] + (S[j][1] - mm[1]) * mm[5], t2 = (S[j][2] - mm[0]) * mm[4] + (S[j][3] - mm[1]) * mm[5];
          if (Math.min(mm[6], Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2)) > 0.5 * mm[6]) wall = true;
        }
        if (wall) return;
        pieces.push({ kind: 'single', w_in: l.w, len_ft: L, size: sizeOf(l) });
      });
      return pieces;
    }
    onmessage = function (e) {
      try { postMessage({ ok: true, result: measure(e.data) }); }
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

  window.NWGeo = { extract: extract, measure: measure };
})();
