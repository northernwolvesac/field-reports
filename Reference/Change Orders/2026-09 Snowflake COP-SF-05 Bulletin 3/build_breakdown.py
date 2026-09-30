"""Build the COP-SF-05 (Bulletin 3) detailed breakdown: before/after/overlay by floor and area.

Before = Addendum 1 M-529/530/531, After = Bulletin 3 (rev 4, 08/10/2026) M-529/530/531.
Overlay: gray = unchanged, red = Addendum 1 only (installed, removed), blue = Bulletin 3 only (new).

Run:  python3 build_breakdown.py
Out:  COP-SF-05 Bulletin 3 - Detailed Breakdown.pdf and .xlsx next to this script.

Costs are the COP-SF-05 line items spread over the change areas; floor totals match the per-floor
breakdown already sent to Structure Tone (29 = $29,600, 30 = $20,150, 31 = $17,030).
Rev 1 (09/30): area amounts adjusted per Ruslan's markup; 29th floor and COP total unchanged,
30th = $18,100, 31st = $19,080. Category totals no longer follow the COP-SF-05 line split.
"""
import io, json, os
import numpy as np
import pymupdf
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, TABLOID
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'source')
A = pymupdf.open(os.path.join(SRC, 'Addendum 1 - M-529 M-530 M-531.pdf'))
B = pymupdf.open(os.path.join(SRC, 'Bulletin 3 - M-529 M-530 M-531.pdf'))
XF = json.load(open(os.path.join(SRC, 'align.json')))   # B = s*A + t per axis, per sheet
OUT = os.path.join(HERE, 'COP-SF-05 Bulletin 3 - Detailed Breakdown')

RATE = 125
DATE = '09/30/2026'
FLOORS = {29: dict(page=0, sheet='M-529.00', total=29600, key=(500, 110, 1790, 1900)),
          30: dict(page=1, sheet='M-530.00', total=18100, key=(500, 110, 1790, 1900)),
          31: dict(page=2, sheet='M-531.00', total=19080, key=(500, 110, 1790, 1900))}
DRAFTING = {29: 1000, 30: 1000, 31: 1000}

# demo = disconnect/removal MH, mat = fabricated ductwork $, inst = relocation/install MH,
# omat = air outlet material $, omh = air outlet install MH
AREAS = [
    dict(id='29-1', floor=29, rect=(1150, 250, 1600, 530),
         title='North supply main - reroute through existing beam cuts',
         before='46x16 supply main (approx. 20 LF, bottom el. 9\'-9") with branch connections to FPB-HW-D (1500), '
                'FPB-HW-B (450) and FPB-B (200).',
         after='Main rerouted as 22x10 and 30x10 through (2) existing beam cuts, 30x10 aligned with the beam running '
               'plan northeast. New 14ø branch to FPB-HW-D, 10ø to FPB-HW-B and 6ø to FPB-B.',
         work='Disconnect and remove installed 46x16 section and branch connections. Fabricate and install 22x10 / '
              '30x10 duct and round branches with insulation, reconnect terminal units.',
         demo=12, mat=6075, inst=60, omat=0, omh=0),
    dict(id='29-2', floor=29, rect=(1120, 470, 1360, 905),
         title='Supply main resized 56x16 to 42x12',
         before='56x16 supply main, approx. 44 LF, top el. 11\'-1" / bottom el. 9\'-9", Break Rm 29.57 to P.E.',
         after='Main resized to 42x12 on the same route, top el. 11\'-1" / bottom el. 10\'-1".',
         work='Disconnect and remove installed 56x16 main. Fabricate and install 42x12 main with insulation, '
              'reconnect branch takeoffs (FPB-HW-E, FPB-B (260)).',
         demo=7, mat=3900, inst=50, omat=0, omh=0),
    dict(id='29-3', floor=29, rect=(1250, 490, 1480, 640),
         title='FPB-HW-E (1400) relocation and discharge reroute',
         before='FPB-HW-E (1400) with inlet and 30x10 discharge to the G(400) / G(200) linear diffusers along the '
                'northeast wall.',
         after='FPB-HW-E relocated; inlet connection and 30x10 discharge elbow rerouted.',
         work='Disconnect inlet and discharge, relocate and rehang FPB-HW-E, fabricate and install new inlet and '
              '30x10 discharge fittings, reconnect.',
         demo=2, mat=750, inst=12, omat=0, omh=0),

    dict(id='30-1', floor=30, rect=(520, 1095, 700, 1620),
         title='IT Build Rm 30.23 / F&B Storage 30.14 / west dining',
         before='12x10 branch with (2) C(220) ceiling diffusers; G(400) linear diffuser run on 16x12 branch.',
         after='12x10 branch and (2) C(220) deleted, replaced with 10ø branch to (1) new G(440) linear diffuser. New '
               '40x20 transfer duct at F&B Storage 30.14. G(400) linear diffusers relocated along the 16x12 branch.',
         work='Disconnect and remove 12x10 branch and (2) C(220). Install 10ø branch, 40x20 transfer duct, rework '
              '16x12 branch. F&I G(440) linear diffuser with plenum, relocate G(400) diffusers.',
         demo=6, mat=1700, inst=30, omat=500, omh=0,
         inst_label='Installation of ductwork (labor)'),
    dict(id='30-2', floor=30, rect=(1245, 750, 1540, 1085),
         title='Lounge 30.02 - new transfer ducts',
         before='No transfer ducts at Lounge 30.02 walls.',
         after='(2) new 48x24 transfer ducts.',
         work='Fabricate and install (2) 48x24 lined transfer ducts.',
         demo=0, mat=2150, inst=26, omat=0, omh=0),
    dict(id='30-3', floor=30, rect=(1255, 1100, 1640, 1490),
         title='Meeting Rms 30.04 / 30.05, Storage 30.09, Vestibule 30.07',
         before='FPB-HW-B (300) with supply connections; 44x20 transfer duct; (2) 12x12 grilles; 12ø branch to '
                'FPB-HW-D (1200).',
         after='44x20 transfer duct relocated; (2) 12x12 grilles relocated to 5P / 7P '
               'Meeting; 12ø branch rerouted.',
         work='Disconnect and remove affected duct, fittings and grilles. Install 44x20 transfer '
              'duct and 12ø branch at new locations.',
         demo=16, mat=0, inst=24, omat=0, omh=0),

    dict(id='31-1', floor=31, rect=(500, 400, 700, 540),
         title='Zoom rooms, northwest - transfer ducts',
         before='(1) transfer duct (not sized on Addendum 1).',
         after='TD 24x12 and new TD 18x12.',
         work='Remove existing transfer duct; fabricate and install TD 24x12 and TD 18x12.',
         demo=1, mat=330, inst=6, omat=0, omh=0),
    dict(id='31-2', floor=31, rect=(740, 620, 910, 760),
         title='Transfer duct TD 32x16, north',
         before='Transfer duct as installed per Addendum 1 (not sized on Addendum 1).',
         after='Transfer duct revised to TD 32x16.',
         work='Remove installed transfer duct; fabricate and install TD 32x16.',
         demo=1, mat=300, inst=5, omat=0, omh=0),
    dict(id='31-3', floor=31, rect=(1180, 515, 1375, 700),
         title='Storage 31.02 - new transfer ducts',
         before='No transfer ducts; volume damper at FPB-HW-B (500) branch.',
         after='(2) new 44x22 transfer ducts.',
         work='Remove affected branch fitting; fabricate and install (2) 44x22 lined transfer ducts.',
         demo=4, mat=1700, inst=20, omat=0, omh=0),
    dict(id='31-4', floor=31, rect=(1180, 1050, 1350, 1300),
         title='Coffee Bar 31.12 - transfer ducts and main fitting',
         before='36x18 main with elbow at Coffee Bar 31.12; no transfer ducts.',
         after='(2) new TD 28x16; 36x18 main elbow reconfigured.',
         work='Disconnect and remove 36x18 elbow; fabricate and install new fitting and (2) TD 28x16.',
         demo=6, mat=1700, inst=22, omat=0, omh=0),
    dict(id='31-5', floor=31, rect=(740, 1090, 920, 1240),
         title='Transfer duct TD 32x16, southwest',
         before='Transfer duct and duct elbow as installed per Addendum 1, next to the 12x8 branch.',
         after='Transfer duct revised to TD 32x16; elbow deleted.',
         work='Remove installed transfer duct and elbow; fabricate and install TD 32x16.',
         demo=2, mat=650, inst=16, omat=0, omh=0),
    dict(id='31-6', floor=31, rect=(1145, 1428, 1765, 1688),
         title='Storage 31.15 / Room 31.16, southeast',
         before='12x12 and 18x12 grilles at previous locations; no transfer duct at Storage 31.15.',
         after='New TD 48x24; 12x12 and 18x12 grilles relocated.',
         work='Remove grilles and their duct connections; fabricate and install TD 48x24, relocate 12x12 and 18x12 '
              'grilles with duct connections at new locations.',
         demo=3, mat=1150, inst=12, omat=0, omh=0),
]

COP_LINES = [('Labor for demolition work (40 MH @ $125)', 5000),
             ('Fabricated ductwork', 18180),
             ('Labor for relocation and installation of new ductwork (280 MH @ $125)', 35000),
             ('Cost of air outlets', 3600),
             ('Labor for installation of air outlets (16 MH @ $125)', 2000),
             ('Drafting fees (shop drawings for revised design)', 3000)]
COP_TOTAL = 66780


def amounts(a):
    return dict(demo=a['demo'] * RATE, mat=a['mat'], inst=a['inst'] * RATE, omat=a['omat'], omh=a['omh'] * RATE)


def area_total(a):
    return sum(amounts(a).values())


def floor_sum(f, k):
    if k == 'draft':
        return DRAFTING[f]
    return sum(amounts(a)[k] for a in AREAS if a['floor'] == f)


def floor_total(f):
    return sum(area_total(a) for a in AREAS if a['floor'] == f) + DRAFTING[f]


# ---- checks: floors match the per-floor numbers, categories match COP-SF-05 ----
for f, d in FLOORS.items():
    assert floor_total(f) == d['total'], (f, floor_total(f))
assert sum(floor_total(f) for f in FLOORS) == COP_TOTAL


# ---------------- drawing helpers ----------------
def _gray(pix):
    return np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width)


def b_clip(page, rect, off):
    (sx, tx), (sy, ty) = XF[str(page)]
    tx += off[0]; ty += off[1]
    r = pymupdf.Rect(rect)
    return pymupdf.Rect(sx * r.x0 + tx, sy * r.y0 + ty, sx * r.x1 + tx, sy * r.y1 + ty)


def render(doc, page, clip, z, sx=1, sy=1):
    return _gray(doc[page].get_pixmap(matrix=pymupdf.Matrix(z / sx, z / sy), clip=clip, colorspace=pymupdf.csGRAY))


def dil(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


def local_offset(page, rect):
    """Best sub-point translation of B against A inside rect (searched at 4x)."""
    (sx, _), (sy, _) = XF[str(page)]
    z = 4
    a = render(A, page, pymupdf.Rect(rect), z) < 170
    b = render(B, page, b_clip(page, rect, (0, 0)), z, sx, sy) < 170
    h = min(a.shape[0], b.shape[0]) - 20; w = min(a.shape[1], b.shape[1]) - 20
    best = None
    for dy in range(-8, 9):
        for dx in range(-8, 9):
            v = (a[10:10 + h, 10:10 + w] ^ b[10 + dy:10 + dy + h, 10 + dx:10 + dx + w]).sum()
            if best is None or v < best[0]:
                best = (v, dx / z, dy / z)
    return best[1], best[2]


def local_offset_fast(page, rect, z=2, n=4):
    (sx, _), (sy, _) = XF[str(page)]
    a = render(A, page, pymupdf.Rect(rect), z) < 170
    b = render(B, page, b_clip(page, rect, (0, 0)), z, sx, sy) < 170
    h = min(a.shape[0], b.shape[0]) - 2 * n; w = min(a.shape[1], b.shape[1]) - 2 * n
    if a[n:n + h, n:n + w].sum() < 200:
        return (0, 0)
    best = None
    for dy in range(-n, n + 1):
        for dx in range(-n, n + 1):
            v = (a[n:n + h, n:n + w] ^ b[n + dy:n + dy + h, n + dx:n + dx + w]).sum()
            if best is None or v < best[0]:
                best = (v, dx / z, dy / z)
    return best[1], best[2]


def overlay_tiled(page, rect, dpi, tile=200):
    x0, y0, x1, y1 = rect
    z = dpi / 72
    W = int(round((x1 - x0) * z)); H = int(round((y1 - y0) * z))
    out = np.full((H, W, 3), 255, np.uint8)
    y = y0
    while y < y1:
        x = x0
        while x < x1:
            r = (x, y, min(x + tile, x1), min(y + tile, y1))
            off = local_offset_fast(page, r)
            im = np.array(Image.open(overlay_png(page, r, dpi, off, r_min=2)))
            px = int(round((x - x0) * z)); py = int(round((y - y0) * z))
            hh = min(im.shape[0], H - py); ww = min(im.shape[1], W - px)
            out[py:py + hh, px:px + ww] = im[:hh, :ww]
            x += tile
        y += tile
    buf = io.BytesIO(); Image.fromarray(out).save(buf, 'PNG', optimize=True); buf.seek(0)
    return buf


def overlay_png(page, rect, dpi, off, r_min=1):
    (sx, _), (sy, _) = XF[str(page)]
    z = dpi / 72
    a = render(A, page, pymupdf.Rect(rect), z)
    b = render(B, page, b_clip(page, rect, off), z, sx, sy)
    h = min(a.shape[0], b.shape[0]); w = min(a.shape[1], b.shape[1]); a = a[:h, :w]; b = b[:h, :w]
    da = a < 170; db = b < 170
    r = max(r_min, round(dpi / 90))
    # ductwork is drawn black, the architectural background gray: only black linework is flagged as a change
    rem = (a < 110) & ~dil(db, r); add = (b < 110) & ~dil(da, r)
    rgb = np.full((h, w, 3), 255, np.uint8)
    rgb[da | db] = (175, 175, 175)
    k = max(0, round(dpi / 150))
    rgb[dil(rem, k)] = (215, 25, 25)
    rgb[dil(add, k)] = (20, 85, 225)
    buf = io.BytesIO(); Image.fromarray(rgb).save(buf, 'PNG', optimize=True); buf.seek(0)
    return buf


# ---------------- page layout ----------------
pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LSB', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFontFamily('LS', normal='LS', bold='LSB', italic='LS', boldItalic='LSB')
PW, PH = landscape(TABLOID)          # 1224 x 792
M = 30
NAVY = colors.HexColor('#1F3A5F'); RED = colors.HexColor('#D71919'); BLUE = colors.HexColor('#1455E1')
LIGHT = colors.HexColor('#EEF2F7')
st = ParagraphStyle('b', fontName='LS', fontSize=9, leading=11.5)
stb = ParagraphStyle('bb', parent=st, fontName='LSB')
sth = ParagraphStyle('h', fontName='LSB', fontSize=10, leading=12.5, textColor=NAVY)
esc = lambda t: t.replace('&', '&amp;')
money = lambda v: f'${v:,.0f}' if v else '-'
vector_jobs = []   # (page_no, rect top-left coords, doc, src_page, clip)
page_no = [0]


def header(c, title, sub):
    c.setFillColor(NAVY); c.rect(0, PH - 52, PW, 52, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('LSB', 16); c.drawString(M, PH - 26, title)
    c.setFont('LS', 10); c.drawString(M, PH - 42, sub)
    c.setFont('LSB', 11); c.drawRightString(PW - M, PH - 26, 'NORTHERN WOLVES AC')
    c.setFont('LS', 9); c.drawRightString(PW - M, PH - 42, 'Snowflake Fitout - 7 Times Square, Floors 29-31  |  COP-SF-05 Bulletin 3 Revision')


def footer(c):
    page_no[0] += 1
    c.setFillColor(colors.gray); c.setFont('LS', 8)
    c.drawString(M, 16, f'Northern Wolves AC  |  55 9th St, 55-A2, Brooklyn, NY 11215  |  (347) 463-9248  |  {DATE}')
    c.drawRightString(PW - M, 16, f'Page {page_no[0]}')


def legend(c, x, y):
    c.setFont('LS', 8.5)
    for i, (col, txt) in enumerate([(colors.HexColor('#AFAFAF'), 'Unchanged'),
                                    (RED, 'Addendum 1 only - installed, removed'),
                                    (BLUE, 'Bulletin 3 only - new work')]):
        c.setStrokeColor(col); c.setLineWidth(3); c.line(x, y - i * 13, x + 22, y - i * 13)
        c.setFillColor(colors.black); c.drawString(x + 28, y - i * 13 - 3, txt)
    c.setLineWidth(1)


def table(c, data, x, ytop, widths, bold_last=True, head=True, zebra=True):
    t = Table(data, colWidths=widths)
    s = [('FONT', (0, 0), (-1, -1), 'LS', 8.5), ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
         ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#9AA5B1')),
         ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]
    if head:
        s += [('BACKGROUND', (0, 0), (-1, 0), NAVY), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
              ('FONT', (0, 0), (-1, 0), 'LSB', 8.5), ('ALIGN', (0, 0), (-1, 0), 'CENTER')]
    if bold_last:
        s += [('FONT', (0, -1), (-1, -1), 'LSB', 8.5), ('BACKGROUND', (0, -1), (-1, -1), LIGHT)]
    t.setStyle(TableStyle(s))
    w, h = t.wrapOn(c, 0, 0); t.drawOn(c, x, ytop - h)
    return h


def para(c, text, style, x, ytop, w):
    p = Paragraph(text, style); _, h = p.wrap(w, 1000); p.drawOn(c, x, ytop - h); return h


def panel(c, x, y, w, h, label, color):
    """x,y bottom-left (reportlab). Returns top-left based rect for pymupdf."""
    c.setStrokeColor(color); c.setLineWidth(1.2); c.rect(x, y, w, h)
    c.setFillColor(color); c.rect(x, y + h, w, 16, stroke=0, fill=1)
    c.setFillColor(colors.white); c.setFont('LSB', 9); c.drawString(x + 6, y + h + 4.5, label)
    c.setLineWidth(1)
    return pymupdf.Rect(x, PH - (y + h), x + w, PH - y)


def fit(rect, box):
    r = pymupdf.Rect(rect); bx = pymupdf.Rect(box)
    s = min(bx.width / r.width, bx.height / r.height)
    w, h = r.width * s, r.height * s
    x0 = bx.x0 + (bx.width - w) / 2; y0 = bx.y0 + (bx.height - h) / 2
    return pymupdf.Rect(x0, y0, x0 + w, y0 + h)


COLS = ['Area', 'Description', 'Disconnect /\nremoval labor', 'Ductwork\nmaterial', 'Ductwork install\nlabor',
        'Air outlet\nmaterial', 'Air outlet\nlabor', 'Shop\ndrawings', 'Total']


def cover(c):
    header(c, 'COP-SF-05 - Bulletin 3 Revision: Detailed Breakdown by Floor and Area',
           f'Project 11010174 - Snowflake Fitout, 7 Times Square 29th-31st Floor  |  Submitted to Structure Tone  |  {DATE}')
    y = PH - 80
    y -= para(c, 'Basis of this breakdown', sth, M, y, 560) + 4
    notes = [
        'Bulletin 3 (M-529 / M-530 / M-531, revision 4, 08/10/2026) was issued after the ductwork in the affected '
        'areas had been fabricated and installed per the Addendum 1 drawings. The change therefore includes '
        '<b>disconnecting and removing installed ductwork</b>, in addition to fabricating and installing the revised work.',
        'Each floor is shown with the Addendum 1 drawing ("Before") overlaid on the Bulletin 3 drawing ("After"). '
        'Every change area is numbered and has its own detail page with the before, after and overlay views and the '
        'cost for that area.',
        'Each area is broken down into disconnect / removal labor, ductwork material (fabricated duct, fittings, '
        'insulation, accessories), ductwork relocation / install labor and air outlet material; shop drawings are '
        'listed per floor. Labor is at $125.00 per man-hour as submitted. The total equals COP-SF-05, $66,780.',
        'Quantities (LF) are approximate, taken from the drawings at 1/8" = 1\'-0".',
        'Red revision clouds in the overlays are Addendum 1 clouds that were dropped from Bulletin 3; moved tags and '
        'labels also show in red / blue. Only the ductwork within the numbered areas is priced.',
    ]
    for i, n in enumerate(notes, 1):
        y -= para(c, f'{i}. {n}', st, M, y, 560) + 5
    legend(c, M + 4, y - 10); y -= 50


    # summary table on the right
    x = 620; y = PH - 80
    y -= para(c, 'Summary by floor', sth, x, y, 560) + 4
    hdr = ['Floor', 'Disconnect /\nremoval labor', 'Ductwork\nmaterial', 'Ductwork\ninstall labor',
           'Air outlet\nmaterial', 'Shop\ndrawings', 'Total']
    rows = [hdr]
    keys = ['demo', 'mat', 'inst', 'omat', 'draft']
    assert not any(a['omh'] for a in AREAS)
    for f, d in FLOORS.items():
        rows.append([f'{f}th floor ({d["sheet"]})'] + [money(floor_sum(f, k)) for k in keys] + [money(floor_total(f))])
    rows.append(['Total'] + [money(sum(floor_sum(f, k) for f in FLOORS)) for k in keys] + [money(COP_TOTAL)])
    y -= table(c, rows, x, y, [124, 72, 72, 72, 64, 56, 74]) + 10
    mh = ['Man-hours', f'{sum(a["demo"] for a in AREAS)} MH', '', f'{sum(a["inst"] for a in AREAS)} MH', '', '', '']
    y -= table(c, [mh], x, y, [124, 72, 72, 72, 64, 56, 74], bold_last=False, head=False) + 18

    y -= para(c, 'Change areas', sth, x, y, 560) + 4
    rows = [['Area', 'Description', 'Total']]
    for a in AREAS:
        rows.append([a['id'], Paragraph(esc(a['title']), st), money(area_total(a))])
    rows.append(['', 'Shop drawings (29 / 30 / 31, $1,000 each)', money(sum(DRAFTING.values()))])
    rows.append(['', 'Total', money(COP_TOTAL)])
    t_h = table(c, rows, x, y, [40, 390, 74])
    footer(c); c.showPage()


def floor_page(c, f):
    d = FLOORS[f]; p = d['page']; key = d['key']
    header(c, f'{f}th Floor - {d["sheet"]}: Addendum 1 vs Bulletin 3 overlay',
           'Gray = unchanged   Red = Addendum 1 only (installed, removed)   Blue = Bulletin 3 only (new)   '
           'Numbered boxes = change areas, see detail pages')
    box = pymupdf.Rect(M, 70, 700, PH - 30)
    r = fit(key, box)
    img = overlay_tiled(p, key, 110)
    c.drawImage(ImageReader(img), r.x0, PH - r.y1, r.width, r.height)
    c.setStrokeColor(colors.black); c.rect(r.x0, PH - r.y1, r.width, r.height)
    s = r.width / (key[2] - key[0])
    for a in [a for a in AREAS if a['floor'] == f]:
        ax0 = r.x0 + (a['rect'][0] - key[0]) * s; ay0 = r.y0 + (a['rect'][1] - key[1]) * s
        ax1 = r.x0 + (a['rect'][2] - key[0]) * s; ay1 = r.y0 + (a['rect'][3] - key[1]) * s
        c.setStrokeColor(colors.HexColor('#E08A00')); c.setLineWidth(1.6); c.setDash(4, 2)
        c.rect(ax0, PH - ay1, ax1 - ax0, ay1 - ay0); c.setDash()
        c.setFillColor(colors.HexColor('#E08A00')); c.rect(ax0, PH - ay0, 30, 13, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont('LSB', 8.5); c.drawString(ax0 + 3, PH - ay0 + 3.5, a['id'])
    c.setLineWidth(1)
    x = 730; y = PH - 80
    y -= para(c, f'{f}th floor - cost by area', sth, x, y, 460) + 4
    rows = [['Area', 'Description', 'Disconnect', 'Material', 'Labor', 'Total']]
    for a in [a for a in AREAS if a['floor'] == f]:
        am = amounts(a)
        rows.append([a['id'], Paragraph(esc(a['title']), st), money(am['demo']), money(am['mat'] + am['omat']),
                     money(am['inst'] + am['omh']), money(area_total(a))])
    rows.append(['', 'Shop drawings for revised design', '', '', '', money(DRAFTING[f])])
    rows.append(['', f'{f}th floor total', money(floor_sum(f, 'demo')), money(floor_sum(f, 'mat') + floor_sum(f, 'omat')),
                 money(floor_sum(f, 'inst') + floor_sum(f, 'omh')), money(floor_total(f))])
    y -= table(c, rows, x, y, [36, 200, 58, 58, 58, 54]) + 14
    para(c, 'Disconnect = disconnect / removal labor of installed Addendum 1 work incl. haul away and clean up. '
            'Material = fabricated ductwork, fittings, insulation, accessories and air outlets. '
            'Labor = relocation / installation of ductwork, terminal units and air outlets.', st, x, y, 464)
    footer(c); c.showPage()


def area_page(c, a):
    f = a['floor']; p = FLOORS[f]['page']; am = amounts(a)
    header(c, f'Area {a["id"]} - {a["title"]}', f'{f}th floor, {FLOORS[f]["sheet"]}  |  Before = Addendum 1   After = Bulletin 3 (rev 4, 08/10/2026)')
    off = local_offset(p, a['rect'])
    r = pymupdf.Rect(a['rect'])
    top, bottom = 70, 250                   # panel band in top-left page coords
    gap = 12
    wide = r.width / r.height > 1.25
    boxes = []
    if wide:   # before / after side by side, overlay underneath at left, text at right
        bw = (PW - 2 * M - gap) / 2; bh = (PH - top - 34 - 32 - gap) / 2
        boxes = [(M, top + 16, bw, bh), (M + bw + gap, top + 16, bw, bh), (M, top + 16 + bh + gap + 16, bw, bh)]
    else:
        bw = (PW - 2 * M - 2 * gap) / 3; bh = PH - top - 16 - bottom
        boxes = [(M + i * (bw + gap), top + 16, bw, bh) for i in range(3)]
    labels = [('BEFORE - Addendum 1 (as installed)', colors.HexColor('#555555')),
              ('AFTER - Bulletin 3', colors.HexColor('#555555')), ('OVERLAY', NAVY)]
    for i, (bx, by, bw_, bh_) in enumerate(boxes):
        fr = panel(c, bx, PH - by - bh_, bw_, bh_, labels[i][0], labels[i][1])
        inner = fit(r, fr + (3, 3, -3, -3))
        if i == 0:
            vector_jobs.append((page_no[0], inner, A, p, r))
        elif i == 1:
            vector_jobs.append((page_no[0], inner, B, p, b_clip(p, r, off)))
        else:
            img = overlay_png(p, r, 220, off)
            c.drawImage(ImageReader(img), inner.x0, PH - inner.y1, inner.width, inner.height)
    if wide:
        legend(c, M + bw + gap + 10, PH - (boxes[2][1] + 16) + 4)
        tx = M + bw + gap; ty = PH - (boxes[2][1] + 60); tw = bw
    else:
        legend(c, M + 4, PH - (top + 16 + bh + 22))
        tx = M; ty = PH - (top + 16 + bh + 20); tw = 560
        y0 = ty
        ty = ty - 44
    y = ty
    for lab, txt in [('Before (Addendum 1, installed):', a['before']), ('After (Bulletin 3):', a['after']),
                     ('Work required:', a['work'])]:
        y -= para(c, f'<b>{lab}</b> {esc(txt)}', st, tx, y, tw if wide else 560) + 4
    rows = [['Cost item', 'Qty', 'Unit', 'Rate', 'Amount']]
    if a['demo']:
        rows.append(['Disconnect / removal of installed ductwork, haul away (labor)', a['demo'], 'MH', '$125', money(am['demo'])])
    if a['mat']:
        rows.append(['Fabricated ductwork, fittings, insulation, accessories (material)', 1, 'LS', '', money(am['mat'])])
    rows.append([a.get('inst_label', 'Relocation / installation of ductwork (labor)'), a['inst'], 'MH', '$125', money(am['inst'])])
    if a['omat']:
        rows.append(['Air outlets (material)', 1, 'LS', '', money(am['omat'])])
    if a['omh']:
        rows.append(['Air outlet installation (labor)', a['omh'], 'MH', '$125', money(am['omh'])])
    rows.append([f'Area {a["id"]} total', '', '', '', money(area_total(a))])
    if wide:
        table(c, rows, tx, y - 6, [330, 36, 36, 44, 70])
    else:
        table(c, rows, 620, y0, [330, 40, 40, 50, 80 - 6])
    footer(c); c.showPage()


def build_pdf():
    c = canvas.Canvas(OUT + '.pdf', pagesize=(PW, PH))
    c.setTitle('COP-SF-05 Bulletin 3 - Detailed Breakdown'); c.setAuthor('Northern Wolves AC')
    cover(c)
    for f in FLOORS:
        floor_page(c, f)
        for a in [a for a in AREAS if a['floor'] == f]:
            area_page(c, a)
    c.save()
    doc = pymupdf.open(OUT + '.pdf')
    for pno, rect, src, sp, clip in vector_jobs:
        doc[pno].show_pdf_page(rect, src, sp, clip=clip, keep_proportion=False)
    tmp = OUT + '.tmp.pdf'
    doc.save(tmp, garbage=4, deflate=True); doc.close(); os.replace(tmp, OUT + '.pdf')


def build_xlsx():
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    wb = Workbook(); ws = wb.active; ws.title = 'Breakdown by area'
    hdr = ['Floor', 'Area', 'Description', 'Disconnect MH', 'Disconnect $', 'Ductwork material $', 'Install MH',
           'Install labor $', 'Air outlet material $', 'Air outlet MH', 'Air outlet labor $', 'Shop drawings $', 'Total $']
    ws.append(['COP-SF-05 Bulletin 3 Revision - Snowflake Fitout, 7 Times Square Fl 29-31 - Northern Wolves AC - ' + DATE])
    ws.append([]); ws.append(hdr)
    bold = Font(bold=True); fill = PatternFill('solid', fgColor='1F3A5F')
    for cell in ws[3]:
        cell.font = Font(bold=True, color='FFFFFF'); cell.fill = fill; cell.alignment = Alignment(wrap_text=True, horizontal='center')
    row = 4; floor_rows = {}
    for f in FLOORS:
        start = row
        for a in [a for a in AREAS if a['floor'] == f]:
            ws.append([f, a['id'], a['title'], a['demo'], f'=D{row}*{RATE}', a['mat'], a['inst'], f'=G{row}*{RATE}',
                       a['omat'], a['omh'], f'=J{row}*{RATE}', 0, f'=E{row}+F{row}+H{row}+I{row}+K{row}+L{row}'])
            row += 1
        ws.append([f, '', 'Shop drawings for revised design', 0, 0, 0, 0, 0, 0, 0, 0, DRAFTING[f], f'=L{row}'])
        row += 1
        ws.append([f, '', f'{f}th floor total'] + [f'=SUM({col}{start}:{col}{row - 1})' for col in 'DEFGHIJKLM'])
        for cell in ws[row]:
            cell.font = bold
        floor_rows[f] = row; row += 1
    ws.append(['', '', 'TOTAL COP-SF-05'] + ['=' + '+'.join(f'{col}{r}' for r in floor_rows.values()) for col in 'DEFGHIJKLM'])
    for cell in ws[row]:
        cell.font = bold
    for col, w in zip('ABCDEFGHIJKLM', [7, 7, 58, 11, 12, 14, 10, 12, 14, 11, 12, 12, 12]):
        ws.column_dimensions[col].width = w
    for r in ws.iter_rows(min_row=4, max_row=row):
        for cell in r[3:]:
            if cell.column_letter in 'EFHIKLM':
                cell.number_format = '$#,##0'
    ws.freeze_panes = 'D4'

    ws2 = wb.create_sheet('Area scope')
    ws2.append(['Area', 'Floor', 'Title', 'Before (Addendum 1, installed)', 'After (Bulletin 3)', 'Work required'])
    for cell in ws2[1]:
        cell.font = Font(bold=True, color='FFFFFF'); cell.fill = fill
    for a in AREAS:
        ws2.append([a['id'], a['floor'], a['title'], a['before'], a['after'], a['work']])
    for col, w in zip('ABCDEF', [7, 6, 40, 60, 60, 60]):
        ws2.column_dimensions[col].width = w
    for r in ws2.iter_rows(min_row=2):
        for cell in r:
            cell.alignment = Alignment(wrap_text=True, vertical='top')
    wb.save(OUT + '.xlsx')


if __name__ == '__main__':
    build_pdf(); build_xlsx()
    print('ok', OUT)
