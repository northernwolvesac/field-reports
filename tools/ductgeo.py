"""Duct takeoff from vector PDF plans — v2.
Double-line ducts: parallel wall pairs. Single-line ducts: line chains next to a size label.
Sizes come from labels sitting at the duct, then travel along connected runs of the same width.
usage: python ductgeo2.py <pdf> <page> [<page> ...]
"""
import fitz, sys, io, os, re, math
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SIZE_RE = re.compile(r'^\s*(\d{1,2})\s*["”]?\s*[xX×]\s*(\d{1,2})\s*["”]?(?:\s*\(.*\))?\s*(?:UP|DN|DOWN)?\s*$')
ROUND_RE = re.compile(r'^\s*(\d{1,2})\s*["”]?\s*(?:Ø|ø|⌀|DIA\.?|RD)\s*(?:\(.*\))?\s*$', re.I)
SCALE_RE = re.compile(r'(\d+(?:/\d+)?)\s*["”]\s*=\s*1\s*[\'’]\s*-?\s*0\s*["”]?')

def frac(s):
    if '/' in s: a, b = s.split('/'); return float(a) / float(b)
    return float(s)

def page_scale(pg):
    found = defaultdict(int)
    for m in SCALE_RE.finditer(pg.get_text()): found[frac(m.group(1))] += 1
    return max(found, key=found.get) * 72.0 if found else None

def labels(pg):
    out = []
    for b in pg.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            txt = ''.join(s['text'] for s in l['spans']).strip()
            m = SIZE_RE.match(txt); r = None if m else ROUND_RE.match(txt)
            if not (m or r): continue
            x0, y0, x1, y1 = l['bbox']
            w = int(m.group(1)) if m else int(r.group(1)); h = int(m.group(2)) if m else w
            if w < 4 or h < 3: continue
            out.append({'txt': txt, 'w': w, 'h': h, 'round': bool(r), 'cx': (x0 + x1) / 2, 'cy': (y0 + y1) / 2, 'bbox': (x0, y0, x1, y1)})
    return out

def style_segments(pg):
    by = defaultdict(list)
    for d in pg.get_drawings():
        if d.get('type') not in ('s', 'fs'): continue
        col = tuple(round(c, 2) for c in (d.get('color') or ()))
        if not col or (max(col) - min(col) < 0.05 and col[0] > 0.3): continue     # gray background, white
        if d.get('dashes') and d['dashes'] not in ('[] 0', ''): continue           # dashed = existing / hidden
        key = (col, round(d.get('width') or 0, 2))
        for it in d['items']:
            if it[0] == 'l':
                p, q = it[1], it[2]
                if math.dist(p, q) > 1.0: by[key].append((p.x, p.y, q.x, q.y))
            elif it[0] == 're':
                r = it[1]
                for a, b in (((r.x0, r.y0), (r.x1, r.y0)), ((r.x1, r.y0), (r.x1, r.y1)), ((r.x1, r.y1), (r.x0, r.y1)), ((r.x0, r.y1), (r.x0, r.y0))):
                    if math.dist(a, b) > 1.0: by[key].append((a[0], a[1], b[0], b[1]))
    return by

def norm_seg(s):
    x1, y1, x2, y2 = s
    dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    if ux < -1e-9 or (abs(ux) < 1e-9 and uy < 0): ux, uy = -ux, -uy; x1, y1, x2, y2 = x2, y2, x1, y1
    return (x1, y1, x2, y2, ux, uy, L, math.atan2(uy, ux))

def find_pairs(S, ptft, wmin_in=5.5, wmax_in=74):
    ptin = ptft / 12.0
    buckets = defaultdict(list)
    for i, s in enumerate(S): buckets[round(math.degrees(s[7]))].append(i)
    cand = []
    for i, a in enumerate(S):
        ax1, ay1, ax2, ay2, ux, uy, La, anga = a
        nx, ny = -uy, ux
        deg = round(math.degrees(anga))
        for dd in (deg - 1, deg, deg + 1, deg - 180, deg + 180):
            for j in buckets.get(dd, ()):
                if j <= i: continue
                b = S[j]
                if abs(math.sin(b[7] - anga)) > 0.02: continue
                d = (b[0] - ax1) * nx + (b[1] - ay1) * ny
                ad = abs(d)
                if ad < wmin_in * ptin or ad > wmax_in * ptin: continue
                tb1 = (b[0] - ax1) * ux + (b[1] - ay1) * uy
                tb2 = (b[2] - ax1) * ux + (b[3] - ay1) * uy
                lo, hi = max(0.0, min(tb1, tb2)), min(La, max(tb1, tb2))
                ov = hi - lo
                if ov < max(0.8 * ptft, 0.5 * min(La, b[6])): continue
                cand.append((ad, i, j, lo, hi, d))
    cand.sort()
    used = defaultdict(list)
    def free(k, lo, hi):
        return all(min(hi, b) - max(lo, a) <= 0.3 * (hi - lo) for (a, b) in used[k])
    pieces = []
    for ad, i, j, lo, hi, d in cand:
        a, b = S[i], S[j]
        blo = (a[0] + a[4] * lo - b[0]) * b[4] + (a[1] + a[5] * lo - b[1]) * b[5]
        bhi = (a[0] + a[4] * hi - b[0]) * b[4] + (a[1] + a[5] * hi - b[1]) * b[5]
        blo, bhi = min(blo, bhi), max(blo, bhi)
        if not free(i, lo, hi) or not free(j, blo, bhi): continue
        used[i].append((lo, hi)); used[j].append((blo, bhi))
        ux, uy = a[4], a[5]; nx, ny = -uy, ux
        cx = a[0] + ux * (lo + hi) / 2 + nx * d / 2
        cy = a[1] + uy * (lo + hi) / 2 + ny * d / 2
        pieces.append({'kind': 'double', 'w_in': ad / ptin, 'len_ft': (hi - lo) / ptft, 'cx': cx, 'cy': cy, 'ux': ux, 'uy': uy, 'size': None})
    return pieces, used

def near_label(p, labs, ptft, tol_in=2.0, need_width=True):
    """label sitting at the duct: along the axis within the piece (+2 ft), beside it within max(2.5 ft, 1.5 w)"""
    half = p['len_ft'] * ptft / 2
    best, bd = None, 1e9
    for l in labs:
        if need_width and abs(l['w'] - p['w_in']) > tol_in and abs(l['h'] - p['w_in']) > tol_in: continue
        dx, dy = l['cx'] - p['cx'], l['cy'] - p['cy']
        along = abs(dx * p['ux'] + dy * p['uy'])
        perp = abs(-dx * p['uy'] + dy * p['ux'])
        if along > half + 2 * ptft: continue
        if perp > max(2.5 * ptft, 1.5 * p.get('w_in', 12) / 12 * ptft): continue
        score = perp + 0.3 * max(0, along - half)
        if score < bd: best, bd = l, score
    return best

def size_of(l):
    return ('%d"Ø' % l['w']) if l['round'] else '%dx%d' % (l['w'], l['h'])

def ends(p, ptft):
    h = p['len_ft'] * ptft / 2
    return ((p['cx'] - p['ux'] * h, p['cy'] - p['uy'] * h), (p['cx'] + p['ux'] * h, p['cy'] + p['uy'] * h))

def propagate(pcs, ptft, tol_in=1.6):
    changed = True
    while changed:
        changed = False
        sized = [p for p in pcs if p['size']]
        for u in pcs:
            if u['size'] or u['kind'] != 'double': continue
            ue = ends(u, ptft)
            gap = max(1.0, u['w_in'] / 12 * 1.6) * ptft
            for s in sized:
                if s['kind'] != 'double' or abs(s['w_in'] - u['w_in']) > tol_in: continue
                if min(math.dist(a, b) for a in ue for b in ends(s, ptft)) <= gap:
                    u['size'] = s['size']; u['via'] = 'run'; changed = True; break

def pt_seg(px, py, s):
    x1, y1, x2, y2 = s[0], s[1], s[2], s[3]
    L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
    t = 0 if L2 == 0 else max(0, min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / L2))
    return math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)))

def leader_ends(l, leaders):
    """far ends of thin leader lines that start at the label (up to 3 connected pieces)"""
    x0, y0, x1, y1 = l['bbox']; x0 -= 5; y0 -= 5; x1 += 5; y1 += 5
    inside = lambda x, y: x0 <= x <= x1 and y0 <= y <= y1
    outs = []
    for a in leaders:
        for (sx, sy, ex, ey) in ((a[0], a[1], a[2], a[3]), (a[2], a[3], a[0], a[1])):
            if not inside(sx, sy) or inside(ex, ey): continue
            px, py = ex, ey
            for _ in range(3):
                nxt = None
                for b in leaders:
                    if b is a: continue
                    for (bx, by, cx, cy) in ((b[0], b[1], b[2], b[3]), (b[2], b[3], b[0], b[1])):
                        if math.hypot(bx - px, by - py) < 1.0 and math.hypot(cx - px, cy - py) > 2: nxt = (cx, cy)
                if not nxt: break
                px, py = nxt
            outs.append((px, py))
    return outs

def single_lines(S, used, labs, ptft, taken_labels, leaders=()):
    """unpaired straight lines next to a size label = single-line ducts; follow the connected chain"""
    free_idx = [i for i in range(len(S)) if not used[i] and S[i][6] >= 0.5 * ptft]
    # endpoint index for chaining
    grid = defaultdict(list)
    def cell(x, y): return (int(x // 3), int(y // 3))
    for i in free_idx:
        s = S[i]
        for (x, y) in ((s[0], s[1]), (s[2], s[3])): grid[cell(x, y)].append(i)
    def neighbours(i):
        s = S[i]; out = set()
        for (x, y) in ((s[0], s[1]), (s[2], s[3])):
            cx, cy = cell(x, y)
            for gx in (cx - 1, cx, cx + 1):
                for gy in (cy - 1, cy, cy + 1):
                    for j in grid.get((gx, gy), ()):
                        if j == i: continue
                        t = S[j]
                        if min(math.dist(e, f) for e in ((s[0], s[1]), (s[2], s[3])) for f in ((t[0], t[1]), (t[2], t[3]))) < 1.5: out.add(j)
        # tees: an end of one line touching the body of the other
        for j in free_idx:
            if j == i or j in out: continue
            t = S[j]
            if min(pt_seg(t[0], t[1], s), pt_seg(t[2], t[3], s), pt_seg(s[0], s[1], t), pt_seg(s[2], s[3], t)) < 1.5: out.add(j)
        return out
    pieces, seen = [], set()
    for l in labs:
        # 1) a leader from the label to the duct line; 2) otherwise the free line running beside the label
        best, bd = None, 1e9
        for (px, py) in leader_ends(l, leaders):
            for i in free_idx:
                dd = pt_seg(px, py, S[i])
                if dd <= 4.0 and dd < bd: best, bd = i, dd
        if best is None:
            for i in free_idx:
                s = S[i]
                dx, dy = l['cx'] - (s[0] + s[2]) / 2, l['cy'] - (s[1] + s[3]) / 2
                along = abs(dx * s[4] + dy * s[5]); perp = abs(-dx * s[5] + dy * s[4])
                if along > s[6] / 2 + 1.0 * ptft or perp > 2.0 * ptft: continue
                if perp < bd: best, bd = i, perp
        if best is None or best in seen: continue
        # walk the chain (stop at branches with 3+ lines — fittings, devices)
        chain, stack = set([best]), [best]
        while stack:
            k = stack.pop()
            for j in neighbours(k):
                # the whole single-line network downstream of the label (tees included), no tiny symbol strokes
                if j not in chain and j not in seen and S[j][6] >= 0.4 * ptft: chain.add(j); stack.append(j)
            if len(chain) > 60: break
        seen |= chain
        L = sum(S[k][6] for k in chain) / ptft
        if L < 3.0: continue                       # scraps of a wall, not a run
        # a wall of a double-line duct has a paired parallel line right next to it
        main = max(chain, key=lambda k: S[k][6]); m = S[main]
        wall = False
        for j in range(len(S)):
            if not used[j] or abs(math.sin(S[j][7] - m[7])) > 0.02: continue
            d = abs((S[j][0] - m[0]) * -m[5] + (S[j][1] - m[1]) * m[4])
            if d > 30 * ptft / 12: continue
            t1 = (S[j][0] - m[0]) * m[4] + (S[j][1] - m[1]) * m[5]; t2 = (S[j][2] - m[0]) * m[4] + (S[j][3] - m[1]) * m[5]
            if min(m[6], max(t1, t2)) - max(0, min(t1, t2)) > 0.5 * m[6]: wall = True; break
        if wall: continue
        pieces.append({'kind': 'single', 'w_in': l['w'], 'len_ft': L, 'cx': l['cx'], 'cy': l['cy'], 'ux': 1, 'uy': 0, 'size': size_of(l), 'segs': len(chain), 'xy': [S[k][:4] for k in chain], 'label': l['txt']})
    return pieces

def loose_label(p, labs, ptft, tol_in=2.5, reach_ft=25):
    best, bd = None, 1e9
    for l in labs:
        if abs(l['w'] - p['w_in']) > tol_in and abs(l['h'] - p['w_in']) > tol_in: continue
        d = math.hypot(l['cx'] - p['cx'], l['cy'] - p['cy']) / ptft
        if d < bd: best, bd = l, d
    return best if best and bd <= reach_ft else None

def measure(pdf, pno, verbose=True):
    pg = fitz.open(pdf)[pno - 1]
    ptft = page_scale(pg)
    if not ptft: return None
    labs = labels(pg)
    if len(labs) < 3: return None
    by = style_segments(pg)
    stats = []
    for key, segs in by.items():
        if len(segs) < 20: continue
        S = [norm_seg(s) for s in segs]
        pcs, _ = find_pairs(S, ptft)
        sized = sum(p['len_ft'] for p in pcs if loose_label(p, labs, ptft))
        tot = sum(p['len_ft'] for p in pcs)
        stats.append((sized, tot, key))
        if verbose: print('   style', key, 'segs', len(segs), 'pairs ft %.0f' % tot, 'sized ft %.0f' % sized)
    top = max((s[0] for s in stats), default=0)
    keep = [k for (sz, tot, k) in stats if top and sz >= 0.5 * top and sz / max(tot, 1) >= 0.5]
    S = [norm_seg(s) for k in keep for s in by[k]]
    pcs, used = find_pairs(S, ptft)
    taken = set()
    for p in pcs:
        l = loose_label(p, labs, ptft)
        if l: p['size'] = size_of(l); taken.add(id(l))
    propagate(pcs, ptft)
    # unlabeled pairs: width is measured; depth = the most common depth for that width among the labels
    depth = defaultdict(lambda: defaultdict(int))
    for l in labs:
        if not l['round']: depth[l['w']][l['h']] += 1
    wmax = max([l['w'] for l in labs] + [6]) + 4
    pcs = [p for p in pcs if p['size'] or p['w_in'] <= wmax]      # wider than any labelled duct: walls, shafts
    for p in pcs:
        if p['size']: continue
        w = int(round(p['w_in'] / 2.0) * 2)
        hs = depth.get(w) or {}
        if not hs:        # labels of a similar width, else the sheet's usual depth
            hs = defaultdict(int)
            for lw, d in depth.items():
                if abs(lw - w) <= 6:
                    for hh, n in d.items(): hs[hh] += n
        if not hs:
            hs = defaultdict(int)
            for d in depth.values():
                for hh, n in d.items(): hs[hh] += n
        h = min(w, max(hs, key=hs.get)) if hs else max(4, int(round(w * 0.6 / 2) * 2))
        p['size'] = '%dx%d' % (w, h); p['via'] = 'width'
    leaders = []
    for d in pg.get_drawings():
        if d.get('type') != 's' or (d.get('width') or 0) > 1.0: continue
        col = tuple(round(c, 2) for c in (d.get('color') or ()))
        if not col or max(col) > 0.3: continue
        for it in d['items']:
            if it[0] == 'l' and math.dist(it[1], it[2]) > 3: leaders.append((it[1].x, it[1].y, it[2].x, it[2].y))
    singles = single_lines(S, used, labs, ptft, taken, leaders)
    return {'ptft': ptft, 'labels': labs, 'keep': keep, 'pieces': pcs + singles}

if __name__ == '__main__':
    pdf = sys.argv[1]; pdf = pdf if os.path.isabs(pdf) else os.path.join(H, pdf)
    tot = defaultdict(float); unl = 0.0; single = 0.0
    for pno in [int(x) for x in sys.argv[2:]]:
        r = measure(pdf, pno, verbose='-v' in sys.argv)
        if not r: print('page', pno, 'no scale'); continue
        print('page', pno, 'pt/ft', r['ptft'], 'labels', len(r['labels']), 'styles', r['keep'])
        for p in r['pieces']:
            tot[p['size']] += p['len_ft']
            if p['kind'] == 'single': single += p['len_ft']
            elif p.get('via') == 'width': unl += p['len_ft']
    for k, v in sorted(tot.items(), key=lambda kv: -kv[1]):
        print('%8.1f ft  %s' % (v, k))
    print('TOTAL %.1f ft  (single-line %.1f, sized from width %.1f)' % (sum(tot.values()), single, unl))
