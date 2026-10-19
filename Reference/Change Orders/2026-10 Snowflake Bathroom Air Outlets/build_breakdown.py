"""Snowflake 7 Times Square fl. 29-31: restroom air outlets - scope and quantity breakdown by floor (no pricing yet).

Source: engineer's M-529 / M-530 / M-531 (Bulletin 3 sheets) re-issued 10/14/2026 with red clouds (PDF polygon
annotations) at the Women's and Men's restrooms on every floor and at the 24x8 duct into Food Prep 30.12B (30th).
"Before" crops come from the Bulletin 3 sheets (COP-SF-05 source); both PDFs share the same sheet coordinates.

Typical restroom (all six identical): two continuous linear supply diffusers type C (Titus FL-15-HT, (1) 1-1/2" slot),
C(250) and C(200), each approx. 17 LF with 4'-0" active (note: "Arch to confirm final length. 4'-0" of active
supply/exhaust required"), schedule notes 5 / 6: cable operated dampers, non-active length used as return with light
shields. New 12x8: approx. 28 LF from the existing 12x8 at the restroom entry to C(200), approx. 17 LF from a second
point of connection at the vanity wall to C(250). Lengths scaled at 1/8" = 1'-0" (9 pt per ft).

Run:  python3 build_breakdown.py
Out:  Restroom Air Outlets - Breakdown by Floor.pdf
"""
import io, os
import pymupdf
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, TABLOID
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

pymupdf.TOOLS.mupdf_display_errors(False)
HERE = os.path.dirname(os.path.abspath(__file__))
NEW = pymupdf.open(os.path.join(HERE, 'source', 'Bathroom mech air outlets CO - M-529 M-530 M-531 (10-14-2026).pdf'))
OLD = pymupdf.open(os.path.join(HERE, '..', '2026-09 Snowflake COP-SF-05 Bulletin 3', 'source',
                                'Bulletin 3 - M-529 M-530 M-531.pdf'))
OUT = os.path.join(HERE, 'Restroom Air Outlets - Breakdown by Floor')
DATE = '10/19/2026'
FLOORS = [29, 30, 31]

RR = dict(ld=[('C', 250, 17), ('C', 200, 17)], active=4,
          duct=[('12x8', 28, 'from existing 12x8 at restroom entry to C(200)'),
                ('12x8', 17, 'from point of connection at vanity wall to C(250)')],
          conn=2, vd=2)
ROOMS = {29: ["Women's RR 29.39", "Men's RR 29.33"], 30: ["Women's RR 30.33", "Men's RR 30.26"],
         31: ["Women's RR 31.57", "Men's RR 31.41"]}
FSD30 = dict(name='Food Prep / Holding 30.12B', item='Combination fire/smoke damper 24x8 with duct access door at rated '
             'wall on existing 24x8 supply duct (FPB-D (750) to A (750))')


def areas(f):
    """[(id, title, annot rect)] in annotation order: Women's, Men's, (30th: FSD)."""
    ann = [a.rect for a in NEW[f - 29].annots()]
    out = [(f'{f}-1', ROOMS[f][0], ann[0]), (f'{f}-2', ROOMS[f][1], ann[1])]
    if f == 30:
        out.append(('30-3', FSD30['name'], ann[2]))
    assert len(ann) == len(out), (f, len(ann))
    return out


# ---------------- layout helpers ----------------
pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LSB', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFontFamily('LS', normal='LS', bold='LSB', italic='LS', boldItalic='LSB')
PW, PH = landscape(TABLOID)
M, TOP, BOT = 30, 62, 34
NAVY = colors.HexColor('#1F3A5F'); ORANGE = colors.HexColor('#E08A00'); GRAY = colors.HexColor('#555555')
LIGHT = colors.HexColor('#EEF2F7')
st = ParagraphStyle('b', fontName='LS', fontSize=9, leading=11.5)
sth = ParagraphStyle('h', fontName='LSB', fontSize=10.5, leading=13, textColor=NAVY)
ordn = lambda n: f'{n}' + ('st' if n % 10 == 1 else 'nd' if n % 10 == 2 else 'rd' if n % 10 == 3 else 'th')
NPAGES = 1 + len(FLOORS)
page_no = [0]


def header(c, title, sub):
    c.setFillColor(NAVY); c.rect(0, PH - 52, PW, 52, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('LSB', 16); c.drawString(M, PH - 26, title)
    c.setFont('LS', 10); c.drawString(M, PH - 42, sub)
    c.setFont('LSB', 11); c.drawRightString(PW - M, PH - 26, 'NORTHERN WOLVES AC')
    c.setFont('LS', 9); c.drawRightString(PW - M, PH - 42, 'Snowflake Fitout - 7 Times Square, Floors 29-31  |  Restroom Air Outlets')


def footer(c):
    page_no[0] += 1
    c.setFillColor(colors.gray); c.setFont('LS', 8)
    c.drawString(M, 16, f'Northern Wolves AC  |  55 9th St, 55-A2, Brooklyn, NY 11215  |  (347) 463-9248  |  {DATE}  |  '
                        'Quantities from M-529 / M-530 / M-531 clouded 10/14/2026 - no pricing')
    c.drawRightString(PW - M, 16, f'Page {page_no[0]} of {NPAGES}')


def table(c, data, x, ytop, widths, bold_last=True):
    t = Table(data, colWidths=widths)
    s = [('FONT', (0, 0), (-1, -1), 'LS', 9), ('ALIGN', (1, 0), (-1, -1), 'RIGHT'), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
         ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#9AA5B1')),
         ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
         ('BACKGROUND', (0, 0), (-1, 0), NAVY), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
         ('FONT', (0, 0), (-1, 0), 'LSB', 8.5), ('ALIGN', (0, 0), (-1, 0), 'CENTER'), ('VALIGN', (0, 0), (-1, 0), 'MIDDLE')]
    if bold_last:
        s += [('FONT', (0, -1), (-1, -1), 'LSB', 9), ('BACKGROUND', (0, -1), (-1, -1), LIGHT)]
    t.setStyle(TableStyle(s)); _, h = t.wrapOn(c, 0, 0); t.drawOn(c, x, ytop - h)
    return h


def para(c, text, style, x, ytop, w):
    p = Paragraph(text, style); _, h = p.wrap(w, 1000); p.drawOn(c, x, ytop - h); return h


def fit(rect, box):
    r = pymupdf.Rect(rect); bx = pymupdf.Rect(box)
    s = min(bx.width / r.width, bx.height / r.height)
    w, h = r.width * s, r.height * s
    x0 = bx.x0 + (bx.width - w) / 2; y0 = bx.y0 + (bx.height - h) / 2
    return pymupdf.Rect(x0, y0, x0 + w, y0 + h)


def png(page, clip, dpi, annots=True):
    return io.BytesIO(page.get_pixmap(dpi=int(dpi), clip=clip, annots=annots).tobytes('png'))


# ---------------- quantities ----------------
def floor_qty(f):
    n = 2
    q = dict(rr=n, ld=n * len(RR['ld']), ld_lf=n * sum(l for _, _, l in RR['ld']),
             active_lf=n * len(RR['ld']) * RR['active'], duct_lf=n * sum(l for _, l, _ in RR['duct']),
             conn=n * RR['conn'], vd=n * RR['vd'], fsd=1 if f == 30 else 0)
    q['inactive_lf'] = q['ld_lf'] - q['active_lf']
    return q


Q = {f: floor_qty(f) for f in FLOORS}


def summary_page(c):
    header(c, 'Restroom Air Outlets - Breakdown by Floor',
           'Clouded areas on M-529 / M-530 / M-531 (re-issued 10/14/2026)  |  Quantities only, pricing to follow')
    x = M; y = PH - TOP; w = 560
    y -= para(c, 'Scope (typical for each of the 6 restrooms)', sth, x, y, w) + 4
    notes = [
        'Two new continuous linear supply diffusers, type C (Titus FL-15-HT, (1) 1-1/2" slot): C(250) along the toilet '
        'partitions and C(200) along the urinal / stall side, each approx. 17 LF. Drawing note: "Arch to confirm final '
        'length. 4\'-0" of active supply/exhaust required."',
        'Per the air outlet schedule notes: cable operated dampers for linear diffusers (5); non-active lengths of '
        'linear diffusers used as return with light shields (6).',
        'New 12x8 supply ductwork: approx. 28 LF from the existing 12x8 at the restroom entry (point of new connection) '
        'to C(200), and approx. 17 LF from a second point of connection at the vanity wall to C(250). Insulated per spec.',
        '30th floor only: combination fire/smoke damper with duct access door on the existing 24x8 at the Food Prep / '
        'Holding 30.12B wall (FSD added in the cloud).',
        'Lengths scaled from the 1/8" = 1\'-0" plans; final diffuser lengths per architect.',
    ]
    for i, n in enumerate(notes, 1):
        y -= para(c, f'{i}. {n}', st, x, y, w) + 5
    y -= 8
    y -= para(c, 'Open items before pricing', sth, x, y, w) + 4
    for i, n in enumerate([
            'Linear diffuser length: price the drawn approx. 17 LF each, or wait for the architect? Active 4 LF + '
            'inactive (return / light shield) for the rest.',
            'Second point of connection at the vanity wall (to C(250)): which existing duct is it, and is it supply? '
            'The note reads "supply/exhaust".',
            'FSD on the 30th floor: wiring and fire alarm interface by the electrician / FA vendor (our scope: furnish, '
            'install, access door)?',
            'Is any of this ductwork or ceiling already installed (removal), or all new?'], 1):
        y -= para(c, f'{i}. {n}', st, x, y, w) + 5

    x = 620; y = PH - TOP; w = PW - M - x
    y -= para(c, 'Quantities by floor', sth, x, y, w) + 4
    rows = [['Floor', 'Rest-\nrooms', 'Linear diffusers\n(qty / LF)', 'Active /\ninactive LF', '12x8 duct\nLF',
             'Connections\nto existing', 'Cable op.\nVD', 'FSD\n24x8']]
    tot = dict.fromkeys(['rr', 'ld', 'ld_lf', 'active_lf', 'inactive_lf', 'duct_lf', 'conn', 'vd', 'fsd'], 0)
    for f in FLOORS:
        q = Q[f]
        for k in tot: tot[k] += q[k]
        rows.append([f'{ordn(f)} floor (M-5{f})', q['rr'], f'{q["ld"]} / {q["ld_lf"]}', f'{q["active_lf"]} / {q["inactive_lf"]}',
                     f'~{q["duct_lf"]}', q['conn'], q['vd'], q['fsd'] or '-'])
    rows.append(['Total', tot['rr'], f'{tot["ld"]} / {tot["ld_lf"]}', f'{tot["active_lf"]} / {tot["inactive_lf"]}',
                 f'~{tot["duct_lf"]}', tot['conn'], tot['vd'], tot['fsd']])
    y -= table(c, rows, x, y, [100, 44, 82, 66, 58, 70, 52, 42]) + 16
    y -= para(c, 'Per restroom (typical)', sth, x, y, w) + 4
    rows = [['Item', 'Qty', 'Unit']]
    for t, cfm, l in RR['ld']:
        rows.append([f'Linear supply diffuser {t}({cfm}), Titus FL-15-HT 1-slot, {RR["active"]} LF active, plenum on active '
                     'section, light shield on inactive', l, 'LF'])
    for s, l, note in RR['duct']:
        rows.append([f'{s} duct {note}, fittings, insulation, hangers', f'~{l}', 'LF'])
    rows.append(['Point of new connection to existing duct', RR['conn'], 'EA'])
    rows.append(['Cable operated volume damper at each linear diffuser', RR['vd'], 'EA'])
    rows.append(['Air balancing of new outlets', 2, 'EA'])
    table(c, [[Paragraph(str(r[0]), st) if i else r[0], r[1], r[2]] for i, r in enumerate(rows)], x, y, [420, 50, 44],
          bold_last=False)
    footer(c); c.showPage()


def floor_page(c, f):
    ar = areas(f)
    header(c, f'{ordn(f)} Floor - M-5{f}: Restroom Air Outlets, Before and After',
           'Left: Bulletin 3 (before)  |  Right: re-issued 10/14/2026 with cloud (after)')
    W, H = PW - 2 * M, PH - TOP - BOT
    n = len(ar); rh = (H - (n - 1) * 10) / n
    for k, (aid, title, R) in enumerate(ar):
        y0 = TOP + k * (rh + 10)
        c.setFillColor(ORANGE); c.rect(M, PH - y0 - 16, W, 16, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont('LSB', 9.5)
        if aid == '30-3':
            txt = f'{aid}  {title}: {FSD30["item"]}'
        else:
            txt = (f'{aid}  {title}: 2 linear diffusers C(250) / C(200), approx. {sum(l for *_, l in RR["ld"])} LF '
                   f'({RR["active"]} LF active each), approx. {sum(l for _, l, _ in RR["duct"])} LF 12x8, 2 connections, 2 cable op. VD')
        c.drawString(M + 5, PH - y0 - 11.5, txt[:190])
        clip = pymupdf.Rect(R) + (-40, -40, 40, 40)
        bw = (W - 10) / 2
        for j, (doc, lab) in enumerate([(OLD, 'BEFORE - Bulletin 3'), (NEW, 'AFTER - re-issued 10/14/2026')]):
            box = pymupdf.Rect(M + j * (bw + 10), y0 + 20, M + j * (bw + 10) + bw, y0 + rh)
            r = fit(clip, box + (0, 13, 0, 0))
            dpi = min(400, max(120, 72 * r.width / clip.width * 2.2))
            c.drawImage(ImageReader(png(doc[f - 29], clip, dpi, annots=bool(j))), r.x0, PH - r.y1, r.width, r.height)
            c.setStrokeColor(colors.HexColor('#9AA5B1')); c.setLineWidth(0.5); c.rect(r.x0, PH - r.y1, r.width, r.height)
            c.setFillColor(NAVY if j else GRAY); c.rect(r.x0, PH - r.y0, r.width, 12, stroke=0, fill=1)
            c.setFillColor(colors.white); c.setFont('LSB', 7.5); c.drawString(r.x0 + 3, PH - r.y0 + 3.5, lab)
    footer(c); c.showPage()


def build():
    c = canvas.Canvas(OUT + '.pdf', pagesize=(PW, PH))
    c.setTitle('Restroom Air Outlets - Breakdown by Floor'); c.setAuthor('Northern Wolves AC')
    summary_page(c)
    for f in FLOORS:
        floor_page(c, f)
    c.save()


if __name__ == '__main__':
    build()
    for f in FLOORS:
        print(f, Q[f])
    print('ok', OUT)
