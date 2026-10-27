"""RTU-12 return air damper (RD-1) wiring diagram for the field tech - LA Fitness Bronx.

Punch item 3: return duct re-routed to the unit's horizontal return, so the factory downflow economizer return
damper is bypassed. Fix: United Enertech CD-100 23x50 in the return duct with Belimo AFB24-SR US (spring OPEN),
slaved to the economizer 2-10 V signal from the Symbio 700, plus a Dayton 1C745 gravity relief shutter + hood on
the return duct (building side of RD-1).

Run: python3 build_rtu12_damper_wiring.py  ->  RTU-12 Return Damper Wiring.pdf
"""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, '..', '..', '..', 'logo-full.png'); LOGO_W, LOGO_H = 2367, 1303
OUT = os.path.join(HERE, 'RTU-12 Return Damper Wiring.pdf')
DATE = '10/17/2026'

pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LSB', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFontFamily('LS', normal='LS', bold='LSB', italic='LS', boldItalic='LSB')
NAVY = colors.HexColor('#1F3A5F'); GREY = colors.HexColor('#555555'); LIGHT = colors.HexColor('#EEF2F7')
BLK = colors.black; RED = colors.HexColor('#D21F1F'); SIG = colors.HexColor('#1565C0'); GRY = colors.HexColor('#8A8A8A')
NEW = colors.HexColor('#E08A00')
W, H = landscape(letter)
M = 30
st = ParagraphStyle('s', fontName='LS', fontSize=8.3, leading=10.4)

c = canvas.Canvas(OUT, pagesize=(W, H))
c.setTitle('LA Fitness Bronx - RTU-12 Return Damper Wiring'); c.setAuthor('Northern Wolves AC')

# header
lh = 40; lw = lh * LOGO_W / LOGO_H
c.drawImage(LOGO, M, H - 14 - lh, lw, lh, mask='auto')
c.setFillColor(NAVY); c.setFont('LSB', 15)
c.drawString(M + lw + 14, H - 32, 'RTU-12 RETURN AIR DAMPER (RD-1) - FIELD WIRING')
c.setFont('LS', 9); c.setFillColor(GREY)
c.drawString(M + lw + 14, H - 46, 'LA Fitness Bronx, NY  |  Trane Precedent YHK240 (20 ton), Symbio 700, low-leak economizer  |  Punch list item 3')
c.setFont('LS', 8.5); c.drawRightString(W - M, H - 32, f'Northern Wolves AC  |  {DATE}')
c.drawRightString(W - M, H - 44, 'For installation')
c.setStrokeColor(NAVY); c.setLineWidth(2); c.line(M, H - 62, W - M, H - 62); c.setLineWidth(1)


def box(x, y, w, h, title, sub=None, col=BLK, dash=False, fill=None):
    c.setStrokeColor(col); c.setLineWidth(1.4)
    if dash:
        c.setDash(5, 3)
    if fill:
        c.setFillColor(fill); c.rect(x, y, w, h, stroke=1, fill=1)
    else:
        c.rect(x, y, w, h)
    c.setDash(); c.setLineWidth(1)
    c.setFillColor(col); c.setFont('LSB', 9); c.drawString(x + 6, y + h - 13, title)
    if sub:
        c.setFont('LS', 7.5); c.setFillColor(GREY)
        for i, s in enumerate(sub):
            c.drawString(x + 6, y + h - 24 - i * 9.5, s)
    c.setFillColor(BLK)


def term(x, y, label, side='r'):
    c.setFillColor(colors.white); c.setStrokeColor(BLK); c.circle(x, y, 3.2, stroke=1, fill=1)
    c.setFillColor(BLK); c.setFont('LSB', 7.5)
    if side == 'r':
        c.drawString(x + 6, y - 2.6, label)
    else:
        c.drawRightString(x - 6, y - 2.6, label)


def wire(pts, col, w=1.8, dash=None):
    c.setStrokeColor(col); c.setLineWidth(w)
    if dash:
        c.setDash(*dash)
    p = c.beginPath(); p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    c.drawPath(p, stroke=1, fill=0); c.setDash(); c.setLineWidth(1)


# ---------------- diagram area ----------------
top = H - 80
# RTU control box
bx, by, bw, bh = M, top - 205, 250, 205
box(bx, by, bw, bh, 'RTU-12 CONTROL BOX (existing)', ['Trane Precedent YHK240, Symbio 700'], NAVY)
# transformer
tx, ty = bx + 14, by + 112
box(tx, ty, 150, 62, '24 VAC control transformer', None)
term(tx + 150, ty + 30, '24 VAC (hot)', 'l')
term(tx + 150, ty + 12, 'COM (24 V common)', 'l')
# symbio
sx, sy = bx + 14, by + 34
box(sx, sy, 150, 66, 'Symbio 700', ['economizer actuator output'])
term(sx + 150, sy + 14, 'ECON Y (2-10 VDC)', 'l')
c.setFont('LS', 7); c.setFillColor(GREY)
c.drawString(bx + 8, by + 18, 'Factory harness - do not cut. Tap at the actuator plug;')
c.drawString(bx + 8, by + 8, 'meter each wire first (start-up step 1).')
c.setFillColor(BLK)

# existing economizer actuator
ex, ey, ew, eh = bx + bw + 60, top - 105, 170, 100
box(ex, ey, ew, eh, 'EXISTING economizer actuator', ['outdoor air / return damper assembly', '(downflow economizer, factory)'], GREY)
ein = {'1': ey + 62, '2': ey + 46, '3': ey + 30, '5': ey + 14}
for k, lab in (('1', '1  COM'), ('2', '2  24 VAC'), ('3', '3  Y  2-10 V'), ('5', '5  U  feedback')):
    term(ex, ein[k], lab, 'r')

# junction box
jx, jy, jw, jh = ex + 25, by, 150, 85
box(jx, jy, jw, jh, 'NEW junction box', ['weatherproof, on unit / duct', '18 AWG x 3 (or 4), outdoor rated,', 'liquidtight on the roof'], NEW, dash=True)
jt = {'1': jy + 40, '2': jy + 26, '3': jy + 12, '5': jy + 0}

# new actuator
ax, ay, aw, ah = W - M - 215, by, 215, 140
box(ax, ay, aw, ah, 'NEW RD-1: Belimo AFB24-SR US', ['on United Enertech CD-100, 23" x 50"', 'in return duct at RTU-12 (in airstream)',
                                                   'SPRING RETURN = DAMPER OPEN', '0% (2 V) = OPEN   100% (10 V) = CLOSED'], NEW)
at = {'1': ay + 68, '2': ay + 50, '3': ay + 32, '5': ay + 14}
for k, lab in (('1', '1  BLK  COM'), ('2', '2  RED  24 VAC'), ('3', '3  WHT  Y 2-10 V'), ('5', '5  GRY  U (not used)')):
    term(ax, at[k], lab, 'r')

# wires: transformer -> existing actuator (existing harness, drawn thin grey-ish dashed)
hot = (tx + 150, ty + 30); com = (tx + 150, ty + 12); sig = (sx + 150, sy + 14)
wire([com, (bx + bw + 20, com[1]), (bx + bw + 20, ein['1']), (ex, ein['1'])], BLK, 1.4, (4, 2))
wire([hot, (bx + bw + 30, hot[1]), (bx + bw + 30, ein['2']), (ex, ein['2'])], RED, 1.4, (4, 2))
wire([sig, (bx + bw + 40, sig[1]), (bx + bw + 40, ein['3']), (ex, ein['3'])], SIG, 1.4, (4, 2))
# taps (new) from existing conductors to junction box
for k, col, xo in (('1', BLK, 20), ('2', RED, 30), ('3', SIG, 40)):
    x0 = bx + bw + xo
    y_start = {'1': ein['1'], '2': ein['2'], '3': ein['3']}[k]
    c.setFillColor(col); c.circle(x0, y_start, 2.6, stroke=0, fill=1)
    wire([(x0, y_start), (x0, jt[k]), (jx, jt[k])], col, 2.4)
    term(jx, jt[k], '', 'r')
# junction box -> actuator
for k, col in (('1', BLK), ('2', RED), ('3', SIG)):
    wire([(jx + jw, jt[k]), (jx + jw + 22 - int(k) * 6, jt[k]), (jx + jw + 22 - int(k) * 6, at[k]), (ax, at[k])], col, 2.4)
# feedback taped
c.setStrokeColor(GRY); c.setLineWidth(1.6); c.line(ax, at['5'], ax - 10, at['5']); c.setLineWidth(1)
c.setFont('LS', 6.5); c.setFillColor(GRY); c.drawRightString(ax - 3, at['5'] - 10, 'tape off'); c.setFillColor(BLK)


# ---------------- bottom: sequence table + notes + test ----------------
yb = by - 18
seq = [['Economizer signal (Y)', 'Outdoor air damper', 'RD-1 return damper', 'Relief shutter'],
       ['2 V / power off', 'minimum / closed', 'OPEN (spring)', 'closed'],
       ['min. position (approx. 3-4 V)', 'minimum OA', 'nearly open', 'closed'],
       ['6 V', 'about 50 %', 'about 50 %', 'starts to open'],
       ['10 V (full economizer)', '100 % open', 'CLOSED', 'open, relieving']]
t = Table(seq, colWidths=[118, 88, 92, 78])
t.setStyle(TableStyle([('FONT', (0, 0), (-1, -1), 'LS', 7.8), ('FONT', (0, 0), (-1, 0), 'LSB', 7.8),
                       ('BACKGROUND', (0, 0), (-1, 0), NAVY), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                       ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#9AA5B1')),
                       ('TOPPADDING', (0, 0), (-1, -1), 2.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5)]))
c.setFont('LSB', 9); c.setFillColor(NAVY); c.drawString(M, yb, 'How it works'); c.setFillColor(BLK)
_, th = t.wrapOn(c, 0, 0); t.drawOn(c, M, yb - 6 - th)

notes = [
    '<b>1.</b> Power RD-1 from the <b>same</b> RTU 24 VAC transformer as the economizer actuator and share the <b>same common</b> '
    '(wire 1). A separate transformer with its own common will make the 2-10 V signal read wrong.',
    '<b>2.</b> Wire 3 (WHT) goes <b>only</b> to the economizer 2-10 VDC signal. Never land it on 24 VAC.',
    '<b>3.</b> If the existing actuator turns out to be a communicating type (no plain 2-10 V Y wire), take the signal from its '
    '<b>wire 5 (U, 2-10 V position feedback)</b> instead of wire 3.',
    '<b>4.</b> AFB24-SR load about 10 VA; check the transformer VA rating has room.',
    '<b>5.</b> Damper: install in the 23" x 50" return duct at the unit, screw frame on all sides and seal the perimeter. '
    'Add a 12" x 12" (min.) access door next to the actuator.',
    '<b>6.</b> Old bottom (downflow) return: confirm it is capped and sealed in the curb.',
    '<b>7.</b> Relief shutter (Dayton 1C745 + hood): on the return duct, <b>building side of RD-1</b>, as far from the unit as possible, '
    'blades horizontal, pivots at top, opening outward. No wiring.']
x2 = M + 400; y2 = yb
c.setFont('LSB', 9); c.setFillColor(NAVY); c.drawString(x2, y2, 'Notes'); c.setFillColor(BLK); y2 -= 4
for n in notes:
    p = Paragraph(n, st); _, ph = p.wrap(W - M - x2, 200); p.drawOn(c, x2, y2 - ph); y2 -= ph + 3

# legend
lx, ly = x2, y2 - 14
c.setFont('LSB', 8); c.drawString(lx, ly, 'Legend')
for i, (col, txt, dash) in enumerate([(RED, '24 VAC hot', None), (BLK, '24 V common', None), (SIG, '2-10 VDC signal (Y)', None),
                                      (GREY, 'existing factory wiring', (4, 2)), (NEW, 'new (Northern Wolves)', None)]):
    yy = ly - 13 - i * 11
    wire([(lx, yy + 3), (lx + 26, yy + 3)], col, 2 if not dash else 1.4, dash)
    c.setFont('LS', 7.5); c.setFillColor(BLK); c.drawString(lx + 32, yy, txt)


tests = ['<b>1.</b> Before tapping: meter the existing actuator - 24 VAC between wires 1-2; 2-10 VDC between 1-3 that changes '
         'when the economizer is stepped in Symbio 700 service test.',
         '<b>2.</b> Power off: RD-1 springs fully <b>OPEN</b>.',
         '<b>3.</b> Economizer at minimum: RD-1 open (or nearly).',
         '<b>4.</b> Service test 100 % economizer: OA damper open, RD-1 <b>CLOSED</b>, relief blades open.',
         '<b>5.</b> Back to normal: RD-1 re-opens smoothly, no binding.',
         '<b>6.</b> Balancer: building pressure at full economizer (target +0.05 in. wg max). If high, set the AFB24-SR '
         'end stop so RD-1 does not fully close. Record result in TAB report.']
x3 = M; y3 = yb - 6 - th - 16
c.setFont('LSB', 9); c.setFillColor(NAVY); c.drawString(x3, y3, 'Start-up check'); c.setFillColor(BLK); y3 -= 4
for n in tests:
    p = Paragraph(n, st); _, ph = p.wrap(376, 200); p.drawOn(c, x3, y3 - ph); y3 -= ph + 2.5

c.setFont('LS', 7); c.setFillColor(colors.gray)
c.drawString(M, 16, 'Northern Wolves AC  |  55 9th St, 55-A2, Brooklyn, NY 11215  |  (347) 463-9248  |  '
                    'Field wiring sketch - verify against Trane unit wiring diagram on the control box door.')
c.save()
print(OUT)
