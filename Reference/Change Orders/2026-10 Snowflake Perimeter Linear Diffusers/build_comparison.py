"""Bulletin 3 (engineer) vs shop drawing SD R2, per bubbled area - screenshots for Ruslan to confirm
(1) which Bulletin 3 ceiling linear diffusers (G) and branches are deleted, (2) whether the perimeter mains change.

SD R2 sheets are at 1/4" and Bulletin 3 at 1/8": B3 = 0.5 * SD + t per sheet, fitted on room numbers
found on both drawings (residual 0.0 pt) - see fit_sheets().

Run:  python3 build_comparison.py
Out:  Perimeter Linear Diffusers - Bulletin 3 vs SD R2.pdf
"""
import importlib.util, io, os, re
import numpy as np
import pymupdf
from reportlab.lib import colors
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('bb', os.path.join(HERE, 'build_breakdown.py'))
bb = importlib.util.module_from_spec(spec); spec.loader.exec_module(bb)
B3 = pymupdf.open(os.path.join(HERE, '..', '2026-09 Snowflake COP-SF-05 Bulletin 3', 'source',
                               'Bulletin 3 - M-529 M-530 M-531.pdf'))
OUT = os.path.join(HERE, 'Perimeter Linear Diffusers - Bulletin 3 vs SD R2')
PAD = 70                     # SD points around the cloud
PW, PH, M, TOP, BOT = bb.PW, bb.PH, bb.M, bb.TOP, bb.BOT
RED = colors.HexColor('#D71919')


def rooms(page, rotated):
    out = {}
    for w in page.get_text('words'):
        if re.fullmatch(r'\d\d\.\d\d[AB]?', w[4]):
            r = pymupdf.Rect(w[:4])
            if rotated:
                r = pymupdf.Rect(r * page.rotation_matrix).normalize()
            out.setdefault(w[4], []).append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
    return {k: v[0] for k, v in out.items() if len(v) == 1}


def fit_sheets():
    T = {}
    for f in bb.FLOORS:
        b = rooms(B3[f - 29], False)
        for i, s in enumerate('AB'):
            a = rooms(bb.DOCS[f][i], True)
            k = [x for x in a if x in b]
            A = np.array([a[x] for x in k]); Bp = np.array([b[x] for x in k])
            idx = np.arange(len(k))
            for _ in range(3):     # drop room tags placed differently on the two drawings
                sx, tx = np.linalg.lstsq(np.c_[A[idx, 0], np.ones(len(idx))], Bp[idx, 0], rcond=None)[0]
                sy, ty = np.linalg.lstsq(np.c_[A[idx, 1], np.ones(len(idx))], Bp[idx, 1], rcond=None)[0]
                err = np.hypot(sx * A[:, 0] + tx - Bp[:, 0], sy * A[:, 1] + ty - Bp[:, 1])
                idx = np.where(err < 3)[0]
            assert len(idx) >= 10 and err[idx].max() < 2, (f, s, len(idx))
            T[(f, s)] = (sx, tx, sy, ty)
    return T


T = fit_sheets()


def to_b3(a, r):
    sx, tx, sy, ty = T[(a['floor'], a['sheet'])]
    return pymupdf.Rect(sx * r.x0 + tx, sy * r.y0 + ty, sx * r.x1 + tx, sy * r.y1 + ty)


def g_tags(f):
    """Diffuser tags 'X (cfm)' on the Bulletin 3 sheet, with their positions."""
    out = []
    for b in B3[f - 29].get_text('dict')['blocks']:
        for l in b.get('lines', []):
            t = ' '.join(s['text'] for s in l['spans'])
            for m in re.finditer(r'\b([A-Z])\s*\((\d+)\)', t):
                r = pymupdf.Rect(l['bbox']); out.append((m[1], int(m[2]), r))
    return out


# assign each Bulletin 3 G tag to one area (inside the mapped cloud + 20 pt, nearest centre wins)
for f in bb.FLOORS:
    areas = bb.floor_areas(f)
    for a in areas:
        a['b3'] = to_b3(a, a['rect']); a['g'] = []
    for typ, cfm, r in g_tags(f):
        if typ != 'G':
            continue
        c = (r.tl + r.br) / 2
        hits = [a for a in areas if (a['b3'] + (-20, -20, 20, 20)).contains(c)]
        if hits:
            a = min(hits, key=lambda a: abs(((a['b3'].tl + a['b3'].br) / 2 - c)))
            a['g'].append(cfm)


def png(page, clip, dpi):
    return io.BytesIO(page.get_pixmap(dpi=int(dpi), clip=clip).tobytes('png'))


def pair_page(c, f, areas, part, parts):
    bb.header(c, f'{bb.ordn(f)} Floor - Bulletin 3 (engineer) vs Shop Drawing SD R2'
              + (f'  ({part}/{parts})' if parts > 1 else ''),
              'Left: Bulletin 3 M-5%d, cloud shown dashed  |  Right: SD R2 M-5%dA/B.SD  |  '
              'Q1 = G ceiling linear diffusers replaced  |  Q2 = perimeter main' % (f, f))
    W, H = PW - 2 * M, PH - TOP - BOT
    n = len(areas); cw = (W - (n - 1) * 12) / n
    for i, a in enumerate(areas):
        cx = M + i * (cw + 12); cy = TOP
        c.setStrokeColor(bb.GRAY); c.setLineWidth(0.8); c.rect(cx, PH - cy - H, cw, H)
        c.setFillColor(bb.ORANGE); c.rect(cx, PH - cy - 16, cw, 16, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont('LSB', 9)
        c.drawString(cx + 5, PH - cy - 11.5, f'{a["id"]}  {a["loc"]}'[:int(cw / 5)])
        sd = pymupdf.Rect(a['rect']) + (-PAD, -PAD, PAD, PAD)
        b3 = to_b3(a, sd)
        cap_h = 92
        img_h = H - 16 - cap_h - 8
        gap = 8
        portrait = sd.height > sd.width
        if portrait:      # side by side
            bw = (cw - 6 - gap) / 2
            boxes = [pymupdf.Rect(cx + 3, cy + 20, cx + 3 + bw, cy + 20 + img_h),
                     pymupdf.Rect(cx + 3 + bw + gap, cy + 20, cx + cw - 3, cy + 20 + img_h)]
        else:             # stacked
            bh = (img_h - gap) / 2
            boxes = [pymupdf.Rect(cx + 3, cy + 20, cx + cw - 3, cy + 20 + bh),
                     pymupdf.Rect(cx + 3, cy + 20 + bh + gap, cx + cw - 3, cy + 20 + img_h)]
        for j, (page, clip, lab) in enumerate([(B3[f - 29], b3, 'BULLETIN 3'), (bb.DOCS[f]['AB'.index(a['sheet'])], sd, 'SD R2')]):
            r = bb.fit(clip, boxes[j] + (0, 12, 0, 0))
            dpi = min(400, max(120, 72 * r.width / clip.width * 2.2))
            c.drawImage(ImageReader(png(page, clip, dpi)), r.x0, PH - r.y1, r.width, r.height)
            c.setStrokeColor(colors.HexColor('#9AA5B1')); c.setLineWidth(0.5); c.rect(r.x0, PH - r.y1, r.width, r.height)
            c.setFillColor(bb.NAVY if j else bb.GRAY); c.rect(r.x0, PH - r.y0, r.width, 12, stroke=0, fill=1)
            c.setFillColor(colors.white); c.setFont('LSB', 7.5); c.drawString(r.x0 + 3, PH - r.y0 + 3.5, lab)
            if j == 0:     # cloud outline on the Bulletin 3 crop
                k = r.width / clip.width; q = a['b3']
                c.setStrokeColor(bb.ORANGE); c.setLineWidth(1.2); c.setDash(4, 2)
                c.rect(r.x0 + (q.x0 - clip.x0) * k, PH - (r.y0 + (q.y1 - clip.y0) * k),
                       q.width * k, q.height * k); c.setDash()
        g = a['g']
        q1 = (f'<b>Q1</b> Bulletin 3: <b>{len(g)} x G</b> ({" / ".join(map(str, g))} CFM, {sum(g):,} total) '
              f'replaced by <b>{a["n"]} x LD</b> ({sum(a["cfm"]):,} CFM). Delete these G and their branches? Installed?')
        q2 = f'<b>Q2</b> Main in cloud: {bb.esc(a["main"])}. Existing to remain, or new / rerouted?'
        y = PH - cy - H + cap_h
        y -= bb.para(c, q1, bb.st, cx + 5, y, cw - 10) + 3
        bb.para(c, q2, bb.st, cx + 5, y, cw - 10)
    bb.footer(c); c.showPage()


def build():
    groups = []
    for f in bb.FLOORS:
        ar = bb.floor_areas(f)
        k = -(-len(ar) // 3); size = -(-len(ar) // k)
        chunks = [ar[i:i + size] for i in range(0, len(ar), size)]
        groups += [(f, ch, i + 1, len(chunks)) for i, ch in enumerate(chunks)]
    bb.NPAGES = len(groups) + 1; bb.page_no[0] = 0
    c = canvas.Canvas(OUT + '.pdf', pagesize=(PW, PH))
    c.setTitle('Perimeter Linear Diffusers - Bulletin 3 vs SD R2'); c.setAuthor('Northern Wolves AC')
    # summary page
    bb.header(c, 'Perimeter Linear Diffusers - Bulletin 3 vs SD R2 (for confirmation)',
              'Q1: Bulletin 3 ceiling linear diffusers (G) replaced by the perimeter LDs  |  Q2: perimeter mains in the clouds')
    rows = [['Area', 'Location', 'Bulletin 3 G\n(qty / CFM)', 'SD R2 LD\n(qty / CFM)', 'Main in cloud (SD R2)']]
    for a in bb.AREAS:
        rows.append([a['id'], Paragraph(bb.esc(a['loc']), bb.st), f'{len(a["g"])} / {sum(a["g"]):,}',
                     f'{a["n"]} / {sum(a["cfm"]):,}', Paragraph(bb.esc(a['main']), bb.st)])
    rows.append(['', 'Total', f'{sum(len(a["g"]) for a in bb.AREAS)} / {sum(sum(a["g"]) for a in bb.AREAS):,}',
                 f'{sum(a["n"] for a in bb.AREAS)} / {sum(sum(a["cfm"]) for a in bb.AREAS):,}', ''])
    h = bb.table(c, rows, M, PH - TOP, [44, 300, 100, 100, 380])
    y = PH - TOP - h - 14
    for t in ['G counts are the Bulletin 3 diffuser tags inside each cloud (mapped from the shop drawing); each tag '
              'is counted once. The perimeter G diffusers in Bulletin 3 sit in the ceiling set in from the window; '
              'the SD R2 LDs sit at the window wall in plenum boxes, so the G ceiling diffusers, their branch duct and '
              'flex would be deleted.',
              'Please confirm per area: (1) delete the G diffusers and their branches, and whether any are already '
              'installed (removal) or only furnished (credit / restock); (2) whether the perimeter main shown in the '
              'cloud is existing to remain with new taps only.']:
        y -= bb.para(c, t, bb.st, M, y, 920) + 6
    bb.footer(c); c.showPage()
    for f, ch, i, n in groups:
        pair_page(c, f, ch, i, n)
    c.save()


if __name__ == '__main__':
    build()
    for a in bb.AREAS:
        print(a['id'], 'G', a['g'], '-> LD', a['cfm'])
    print('ok', OUT)
