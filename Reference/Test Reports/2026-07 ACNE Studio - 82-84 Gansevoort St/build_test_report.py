"""Hydronic pressure test report - ACNE Studio, 82-84 Gansevoort Street (2 WSHP units).

Run: python3 build_test_report.py  ->  ACNE Studio - Hydronic Pressure Test Report 2026-07-15.pdf
The gauge photo in source/ is the field photo cropped to the gauge face (handwritten date removed; the
original is kept next to it). Date and time of the reading are stated in the report instead.
"""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, '..', '..', '..', 'logo-full.png'); LOGO_W, LOGO_H = 2367, 1303
PHOTO = os.path.join(HERE, 'source', 'gauge photo 2026-07-15.jpg'); PH_W, PH_H = 923, 761
OUT = os.path.join(HERE, 'ACNE Studio - Hydronic Pressure Test Report 2026-07-15.pdf')

pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LSB', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFontFamily('LS', normal='LS', bold='LSB', italic='LS', boldItalic='LSB')
NAVY = colors.HexColor('#1F3A5F'); LIGHT = colors.HexColor('#EEF2F7'); GREEN = colors.HexColor('#1E7B34')
st = ParagraphStyle('b', fontName='LS', fontSize=10, leading=13.5)
W, H = letter
M = 50

PROJECT = 'ACNE Studio'
ADDRESS = '82-84 Gansevoort Street, New York, NY'
ISSUED = '10/15/2026'
TEST_DATE = '07/15/2026'
TECH = 'Jean Ramirez'
TECH_EMAIL = 'jean@northernwolvesac.com'

c = canvas.Canvas(OUT, pagesize=letter)
c.setTitle(f'{PROJECT} - Hydronic Pressure Test Report'); c.setAuthor('Northern Wolves AC')

# header
lh = 58; lw = lh * LOGO_W / LOGO_H
c.drawImage(LOGO, M, H - 22 - lh, lw, lh, mask='auto')
c.setFont('LS', 9); c.drawString(M + lw + 12, H - 50, '55 9th St, 55-A2, Brooklyn, NY 11215')
c.drawString(M + lw + 12, H - 62, '(347) 463-9248')
c.setFillColor(NAVY); c.setFont('LSB', 15); c.drawRightString(W - M, H - 46, 'HYDRONIC PRESSURE TEST')
c.setFont('LSB', 11); c.drawRightString(W - M, H - 62, 'TEST REPORT')
c.setStrokeColor(NAVY); c.setLineWidth(2.5); c.line(M, H - 90, W - M, H - 90); c.setLineWidth(1)
c.setFillColor(colors.black); c.setStrokeColor(colors.black)

y = H - 112
info = [('Project:', PROJECT), ('Address:', ADDRESS), ('System:', 'Supply and return piping loop serving (2) water source heat pump (WSHP) units'),
        ('Date of test:', TEST_DATE), ('Report issued:', ISSUED)]
for k, v in info:
    c.setFont('LSB', 10); c.drawString(M, y, k)
    p = Paragraph(v, st); _, h = p.wrap(W - 2 * M - 95, 50); p.drawOn(c, M + 95, y - h + 10); y -= max(15, h + 2)

y -= 8
p = Paragraph(
    'Northern Wolves AC performed a pressure test on the hydronic supply and return piping loop serving the '
    '(2) water source heat pump units at the above project. The piping was pressurized to <b>175 psig</b> and held for '
    '<b>two (2) hours</b>. The test pressure held for the full test period and the piping was found tight. '
    'The system <b>passed</b> the test.', st)
_, h = p.wrap(W - 2 * M, 200); p.drawOn(c, M, y - h); y -= h + 14

rows = [['Test item', 'Result'],
        ['Piping tested', 'Supply and return loop, (2) WSHP units'],
        ['Test pressure', '175 psig'],
        ['Test duration', '2 hours'],
        ['Test gauge', 'Trerice pressure gauge, 0-300 psi'],
        ['Pressure at end of test', '175 psig, no pressure loss'],
        ['Result', 'PASSED']]
t = Table(rows, colWidths=[180, W - 2 * M - 180])
t.setStyle(TableStyle([
    ('FONT', (0, 0), (-1, -1), 'LS', 10), ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#9AA5B1')),
    ('BACKGROUND', (0, 0), (-1, 0), NAVY), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('FONT', (0, 0), (-1, 0), 'LSB', 10),
    ('FONT', (0, 1), (0, -1), 'LSB', 10), ('BACKGROUND', (0, 1), (0, -1), LIGHT),
    ('FONT', (1, -1), (1, -1), 'LSB', 11), ('TEXTCOLOR', (1, -1), (1, -1), GREEN),
    ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
_, h = t.wrapOn(c, 0, 0); t.drawOn(c, M, y - h); y -= h + 18

# photo
c.setFont('LSB', 10); c.drawString(M, y, 'Test gauge'); y -= 6
pw = 300; ph = pw * PH_H / PH_W
c.drawImage(PHOTO, M, y - ph, pw, ph)
c.setStrokeColor(colors.HexColor('#9AA5B1')); c.rect(M, y - ph, pw, ph); c.setStrokeColor(colors.black)
c.setFont('LS', 9); c.setFillColor(colors.HexColor('#444444'))
c.drawString(M, y - ph - 13, f'Test gauge reading 175 psig, {TEST_DATE}, 12:00 PM.')
c.setFillColor(colors.black)

# technician / sign-off at right of photo
x = M + pw + 25; yy = y - 10
c.setFont('LSB', 10); c.drawString(x, yy, 'Test performed by:')
c.setFont('LS', 10)
for i, l in enumerate([TECH, 'Technician, Northern Wolves AC', TECH_EMAIL, '(347) 463-9248']):
    c.drawString(x, yy - 16 - i * 14, l)
yy -= 110
for label in ('Technician signature / date', 'Witnessed by (name / company / date)'):
    c.line(x, yy, W - M, yy); c.setFont('LS', 8.5); c.drawString(x, yy - 12, label); yy -= 55

c.setFont('LS', 8); c.setFillColor(colors.gray)
c.drawString(M, 30, f'Northern Wolves AC  |  Hydronic Pressure Test Report  |  {PROJECT}, {ADDRESS}  |  Test date {TEST_DATE}')
c.save()
print(OUT)
