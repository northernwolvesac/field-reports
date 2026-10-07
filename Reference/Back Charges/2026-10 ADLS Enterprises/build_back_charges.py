"""Back charges to ADLS Enterprises, LLC (sheet metal / install sub) against their final invoices 234 and 235.

Run: python3 build_back_charges.py  ->  BC-2026-001 Sompo.pdf, BC-2026-002 Matchaful.pdf
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
pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LSB', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFontFamily('LS', normal='LS', bold='LSB', italic='LS', boldItalic='LSB')
NAVY = colors.HexColor('#1F3A5F'); LIGHT = colors.HexColor('#EEF2F7')
st = ParagraphStyle('b', fontName='LS', fontSize=10, leading=13.5)
W, H = letter
M = 50
DATE = '10/07/2026'
RATE = 125
SUB = ['ADLS Enterprises, LLC', '912 N Erie Ave', 'Lindenhurst, NY 11757', 'adlsenterprisesllc@gmail.com  |  347-988-9453']

BCS = [
    dict(no='BC-ADLS-001-2026', project='Sompo', file='BC-ADLS-001-2026 Sompo.pdf',
         inv='234', inv_date='09/17/2026', inv_amt=9800, contract=29000,
         dates='09/14/2026 - 09/21/2026', hours=64,
         work='Completion of ductwork installation and diffuser installation left incomplete under the ADLS subcontract.'),
    dict(no='BC-ADLS-002-2026', project='Matchaful', file='BC-ADLS-002-2026 Matchaful.pdf',
         inv='235', inv_date='09/17/2026', inv_amt=8000, contract=None,
         dates='08/04/2026 - 08/07/2026', hours=84,
         work='Completion of AC unit and condenser installation, connection of fresh air ductwork and diffuser installation '
              'left incomplete under the ADLS subcontract.'),
]


def money(v):
    return f'-${-v:,.2f}' if v < 0 else f'${v:,.2f}'


def table(c, data, x, ytop, widths, bold_rows=(), head=True):
    t = Table(data, colWidths=widths)
    s = [('FONT', (0, 0), (-1, -1), 'LS', 10), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
         ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#9AA5B1')),
         ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]
    if head:
        s += [('BACKGROUND', (0, 0), (-1, 0), NAVY), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
              ('FONT', (0, 0), (-1, 0), 'LSB', 10)]
    for r in bold_rows:
        s += [('FONT', (0, r), (-1, r), 'LSB', 10), ('BACKGROUND', (0, r), (-1, r), LIGHT)]
    t.setStyle(TableStyle(s))
    _, h = t.wrapOn(c, 0, 0); t.drawOn(c, x, ytop - h)
    return h


def build(bc):
    amt = bc['hours'] * RATE
    net = bc['inv_amt'] - amt
    c = canvas.Canvas(os.path.join(HERE, bc['file']), pagesize=letter)
    c.setTitle(f"Back Charge {bc['no']} - {bc['project']}"); c.setAuthor('Northern Wolves AC')
    # header
    c.setFillColor(NAVY); c.rect(0, H - 80, W, 80, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont('LSB', 18); c.drawString(M, H - 38, 'NORTHERN WOLVES AC')
    c.setFont('LS', 9.5); c.drawString(M, H - 54, '55 9th St, 55-A2, Brooklyn, NY 11215  |  (347) 463-9248')
    c.setFont('LSB', 20); c.drawRightString(W - M, H - 40, 'BACK CHARGE')
    c.setFont('LS', 10); c.drawRightString(W - M, H - 57, f"No. {bc['no']}")
    c.setFillColor(colors.black)

    y = H - 110
    c.setFont('LSB', 10); c.drawString(M, y, 'To (Subcontractor):')
    c.setFont('LS', 10)
    for i, l in enumerate(SUB):
        c.drawString(M, y - 15 - i * 13, l)
    info = [('Date:', DATE), ('Project:', bc['project']), ('Reference:', f"ADLS Invoice #{bc['inv']} dated {bc['inv_date']}"),
            ('Work dates:', bc['dates'])]
    for i, (k, v) in enumerate(info):
        c.setFont('LSB', 10); c.drawString(330, y - i * 15, k)
        c.setFont('LS', 10); c.drawString(400, y - i * 15, v)

    y -= 90
    p = Paragraph(
        f"Northern Wolves AC hereby issues a back charge to ADLS Enterprises, LLC for labor performed by Northern Wolves AC "
        f"mechanics on the <b>{bc['project']}</b> project to complete work within the ADLS scope of work. "
        f"This back charge will be deducted from ADLS Invoice #{bc['inv']}.", st)
    _, h = p.wrap(W - 2 * M, 200); p.drawOn(c, M, y - h); y -= h + 16

    rows = [['Description', 'Dates', 'Hours', 'Rate', 'Amount'],
            [Paragraph(bc['work'], st), bc['dates'].replace(' - ', '\n- '), f"{bc['hours']}", f'${RATE:.2f}/hr', money(amt)],
            ['Total back charge', '', '', '', money(amt)]]
    y -= table(c, rows, M, y, [230, 90, 50, 60, 82], bold_rows=(2,)) + 22

    c.setFont('LSB', 11); c.drawString(M, y, 'Application to ADLS Invoice #' + bc['inv']); y -= 8
    rec = [['', 'Amount'],
           [f"ADLS Invoice #{bc['inv']} - final balance" + (f" (original contract ${bc['contract']:,})" if bc['contract'] else ''),
            money(bc['inv_amt'])],
           [f"Less: Back Charge {bc['no']}", money(-amt)]]
    if net >= 0:
        rec.append(['Net amount payable to ADLS Enterprises, LLC', money(net)])
    else:
        rec.append(['Balance due from ADLS Enterprises, LLC to Northern Wolves AC', money(-net)])
    y -= table(c, rec, M, y, [430, 82], bold_rows=(3,)) + 18

    if net < 0:
        p = Paragraph(
            f"The back charge exceeds Invoice #{bc['inv']}. Invoice #{bc['inv']} is offset in full, and the remaining "
            f"<b>{money(-net)}</b> is due from ADLS Enterprises, LLC to Northern Wolves AC. Northern Wolves AC may deduct this "
            f"amount from any other payment due to ADLS Enterprises, LLC.", st)
        _, h = p.wrap(W - 2 * M, 200); p.drawOn(c, M, y - h); y -= h + 14

    p = Paragraph('Please sign and return a copy to acknowledge this back charge. Questions: '
                  'christino@northernwolvesac.com.', st)
    _, h = p.wrap(W - 2 * M, 200); p.drawOn(c, M, y - h); y -= h + 50

    c.setFont('LS', 10)
    for x, who in ((M, 'Northern Wolves AC'), (320, 'ADLS Enterprises, LLC')):
        c.line(x, y, x + 220, y)
        c.drawString(x, y - 13, f'{who} - signature')
        c.line(x, y - 45, x + 220, y - 45)
        c.drawString(x, y - 58, 'Name / Title / Date')
    c.setFont('LS', 8); c.setFillColor(colors.gray)
    c.drawString(M, 30, f"Northern Wolves AC  |  Back Charge {bc['no']}  |  {bc['project']}  |  {DATE}")
    c.save()
    return amt, net


if __name__ == '__main__':
    for bc in BCS:
        print(bc['no'], bc['project'], *build(bc))
