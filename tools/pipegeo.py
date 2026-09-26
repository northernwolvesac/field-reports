"""Pipe takeoff from vector PDF piping plans (prototype).
usage: python pipegeo.py <pdf> <page> [<page> ...]
"""
import fitz, sys, io, os, re, math
from collections import defaultdict, deque
# stdout is wrapped by ductgeo2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ductgeo2 as DG

H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SZ = r'(\d{1,2}\s*-\s*\d/\d|\d{1,2}\s+\d/\d|\d/\d|\d{1,2}(?:\.\d)?)\s*["”]\s*(?:Ø|ø|DIA\.?)?'
SVC = r'([A-Z]{1,5}(?:/[A-Z]{1,3})?)'
PIPE_RE = [re.compile(r'^\s*' + SZ + r'\s*' + SVC + r'?\s*$'), re.compile(r'^\s*' + SVC + r'\s+' + SZ + r'\s*$')]

def size_in(txt):
    t = txt.replace(' ', '')
    m = re.match(r'^(\d{1,2})-(\d)/(\d)$', t)
    if m: return int(m.group(1)) + int(m.group(2)) / int(m.group(3))
    m = re.match(r'^(\d)/(\d)$', t)
    if m: return int(m.group(1)) / int(m.group(2))
    return float(t)

def label_str(v):
    whole = int(v); frac = v - whole
    f = {0.25: '1/4', 0.5: '1/2', 0.75: '3/4'}.get(round(frac * 4) / 4, '')
    return (str(whole) if whole else '') + ('-' if whole and f else '') + f + '"'

SIZE_ANY = re.compile(r'(?<![\d/.-])(\d{1,2}\s*-\s*\d/\d|\d{1,2}\s+\d/\d|\d/\d|\d{1,3}(?:\.\d)?)\s*["”]\s*(?:Ø|ø|∅|DIA\.?)?(?!\s*[xX×]\s*\d)')
SVC_ANY = re.compile(r'\b(CHWS/R|CHWS|CHWR|CWS&R|CWS/R|CWS|CWR|HWS/R|HWS|HWR|HHWS|HHWR|CD|RS&R|RS/RL|RS|RL|RLS|G|D|CW)\b')

def pipe_labels(pg):
    out = []
    for b in pg.get_text('dict')['blocks']:
        bb = b.get('bbox')
        for l in b.get('lines', []):
            txt = ''.join(s['text'] for s in l['spans']).strip()
            if "'" in txt or '’' in txt or len(txt) > 34: continue          # dimensions, sentences
            m = SIZE_ANY.search(txt)
            if not m: continue
            rest = (txt[:m.start()] + txt[m.end():]).strip()
            if rest and not SVC_ANY.search(rest) and not re.match(r'^(PROVIDE|NEW|TO|\s)*$', rest): continue
            raw = m.group(1).replace(' ', '')
            if re.fullmatch(r'\d{3}', raw) and raw[1] in '13' and raw[2] in '248':     # "114" = 1¼ font fallout
                raw = raw[0] + '-' + raw[1] + '/' + raw[2]
            try: v = size_in(raw)
            except ValueError: continue
            if v <= 0 or v > 16: continue
            sv = SVC_ANY.search(txt)
            x0, y0, x1, y1 = l['bbox']
            out.append({'txt': txt, 'd': v, 'svc': sv.group(1) if sv else None, 'cx': (x0 + x1) / 2, 'cy': (y0 + y1) / 2, 'dir': l.get('dir', (1, 0)), 'bbox': (x0, y0, x1, y1), 'block': tuple(bb) if bb else (x0, y0, x1, y1)})
    return out

def all_segments(pg, allow_dash=True):
    by = defaultdict(list)
    for d in pg.get_drawings():
        if d.get('type') not in ('s', 'fs'): continue
        col = tuple(round(c, 2) for c in (d.get('color') or ()))
        if not col or (max(col) - min(col) < 0.05 and col[0] > 0.3): continue
        dashed = bool(d.get('dashes') and d['dashes'] not in ('[] 0', ''))
        if dashed and not allow_dash: continue
        key = (col, round(d.get('width') or 0, 2), dashed)
        for it in d['items']:
            if it[0] == 'l' and math.dist(it[1], it[2]) > 1.0:
                by[key].append((it[1].x, it[1].y, it[2].x, it[2].y))
    return by

def measure(pdf, pno, verbose=False):
    pg = fitz.open(pdf)[pno - 1]
    ptft = DG.page_scale(pg)
    if not ptft: return None
    labs = pipe_labels(pg)
    if len(labs) < 2: return {'ptft': ptft, 'sizes': {}, 'labels': len(labs)}
    by = all_segments(pg)
    # which styles do the size labels sit on?
    votes = defaultdict(int)
    segs = []
    for key, ss in by.items():
        for s in ss:
            if math.dist(s[:2], s[2:]) >= 0.3 * ptft: segs.append(DG.norm_seg(s) + (key,))
    def near(l, S, tol_ft=1.3):
        tol_pt = max(tol_ft * ptft, 20.0)          # labels sit ~5-20 pt off the line whatever the scale
        """parallel lines running past the label, within tol"""
        dx, dy = l['dir']; hits = []
        for i, s in enumerate(S):
            if abs(s[4] * dx + s[5] * dy) < 0.97: continue          # parallel to the text
            ex, ey = l['cx'] - s[0], l['cy'] - s[1]
            along = ex * s[4] + ey * s[5]; perp = abs(-ex * s[5] + ey * s[4])
            if along < -0.5 * ptft or along > s[6] + 0.5 * ptft or perp > tol_pt: continue
            hits.append((perp, i))
        return sorted(hits)
    for l in labs:
        h = near(l, segs)
        if h: votes[segs[h[0][1]][8]] += 1
    if not votes: return {'ptft': ptft, 'sizes': {}, 'labels': len(labs)}
    top = max(votes.values())
    keep = [k for k, v in votes.items() if v >= max(2, 0.25 * top)]
    S = [s for s in segs if s[8] in keep]
    # seeds: every parallel line the label sits against (CHWS/R = both pipes)
    size = {}
    leaders = []
    for key, ss in by.items():
        if key[1] <= 1.0 and max(key[0]) <= 0.3 and not key[2]:
            leaders += [x for x in ss if math.dist(x[:2], x[2:]) > 3]
    for l in labs:
        h = near(l, S)
        if h:
            best = h[0][0]
            for perp, i in h:
                if perp <= best + 0.9 * ptft: size.setdefault(i, (l['d'], l['svc']))
            continue
        # no pipe beside the text: follow its leader to the pipe it points at
        for (px, py) in DG.leader_ends(l, leaders) + DG.leader_ends(dict(l, bbox=l['block']), leaders):
            bi, bd = None, 4.0
            for i, s2 in enumerate(S):
                dd = DG.pt_seg(px, py, s2)
                if dd <= bd: bi, bd = i, dd
            if bi is not None: size.setdefault(bi, (l['d'], l['svc']))
    # graph: ends touching, or an end on another line's body (tee)
    grid = defaultdict(list)
    for i, s in enumerate(S):
        for (x, y) in ((s[0], s[1]), (s[2], s[3])): grid[(int(x // 4), int(y // 4))].append(i)
    def nbrs(i):
        s = S[i]; out = set()
        for (x, y) in ((s[0], s[1]), (s[2], s[3])):
            gx, gy = int(x // 4), int(y // 4)
            for ax in (gx - 1, gx, gx + 1):
                for ay in (gy - 1, gy, gy + 1):
                    for j in grid.get((ax, ay), ()):
                        if j != i: out.add(j)
        # tees
        res = set()
        for j in out:
            t = S[j]
            if min(math.dist(a, b) for a in ((s[0], s[1]), (s[2], s[3])) for b in ((t[0], t[1]), (t[2], t[3]))) < 1.5 \
               or min(DG.pt_seg(t[0], t[1], s), DG.pt_seg(t[2], t[3], s), DG.pt_seg(s[0], s[1], t), DG.pt_seg(s[2], s[3], t)) < 1.5:
                res.add(j)
        return res
    # multi-source BFS: each line takes the size of the nearest labelled line along the network
    q = deque(size.keys()); dist = {i: 0 for i in size}
    while q:
        i = q.popleft()
        for j in nbrs(i):
            if j in dist: continue
            dist[j] = dist[i] + 1; size[j] = size[i]; q.append(j)
    tot = defaultdict(float)
    for i, (d, svc) in size.items():
        tot[label_str(d)] += S[i][6] / ptft
    return {'ptft': ptft, 'labels': len(labs), 'styles': keep, 'sizes': dict(tot), 'seeds': sum(1 for i in dist if dist[i] == 0)}

if __name__ == '__main__':
    pdf = sys.argv[1]; pdf = pdf if os.path.isabs(pdf) else os.path.join(H, pdf)
    tot = defaultdict(float)
    for pno in [int(x) for x in sys.argv[2:]]:
        r = measure(pdf, pno)
        print('page', pno, {k: v for k, v in r.items() if k != 'sizes'})
        for k, v in r['sizes'].items(): tot[k] += v
    for k, v in sorted(tot.items(), key=lambda kv: -kv[1]): print('%8.1f ft  %s' % (v, k))
    print('TOTAL %.1f ft' % sum(tot.values()))
