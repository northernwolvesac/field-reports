"""Back charges to ADLS Enterprises, LLC (sheet metal / install sub) against their final invoices 234 and 235.

Run: python3 build_back_charges.py  ->  BC-ADLS-001-2026 Sompo.pdf, BC-ADLS-002-2026 Matchaful.pdf,
     BC-ADLS-003-2026 Sompo - Clune SCO 003.pdf (Clune GC back charge passed through, SCO attached, contract sums redacted)
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
# company logo from the app root (2367 x 1303 RGBA, transparent background)
LOGO = os.path.join(HERE, '..', '..', '..', 'logo-full.png')
LOGO_W, LOGO_H = 2367, 1303
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

OWN_WORK = ('Northern Wolves AC hereby issues a back charge to ADLS Enterprises, LLC for labor performed by Northern Wolves AC '
            'mechanics on the <b>{project}</b> project to complete work within the ADLS scope of work. '
            'This back charge will be deducted from ADLS Invoice #{inv}.')

# items: (description, dates, hours, rate, amount); prior: earlier back charges already taken against the same invoice
BCS = [
    dict(no='BC-ADLS-001-2026', project='Sompo', file='BC-ADLS-001-2026 Sompo.pdf',
         inv='234', inv_date='09/17/2026', inv_amt=9800, contract=29000, dates='09/14/2026 - 09/21/2026',
         intro=OWN_WORK, prior=[],
         items=[('Completion of ductwork installation and diffuser installation left incomplete under the ADLS subcontract.',
                 '09/14/2026\n- 09/21/2026', '64', f'${RATE:.2f}/hr', 64 * RATE)]),
    dict(no='BC-ADLS-002-2026', project='Matchaful', file='BC-ADLS-002-2026 Matchaful.pdf',
         inv='235', inv_date='09/17/2026', inv_amt=8000, contract=None, dates='08/04/2026 - 08/07/2026',
         intro=OWN_WORK, prior=[],
         items=[('Completion of AC unit and condenser installation, connection of fresh air ductwork and diffuser '
                 'installation left incomplete under the ADLS subcontract.',
                 '08/04/2026\n- 08/07/2026', '84', f'${RATE:.2f}/hr', 84 * RATE)]),
    # GC back charge passed through at cost; Clune's SCO is attached with our contract sums redacted
    dict(no='BC-ADLS-003-2026', project='Sompo', file='BC-ADLS-003-2026 Sompo - Clune SCO 003.pdf',
         inv='234', inv_date='09/17/2026', inv_amt=9800, contract=29000, dates='08/01, 08/06, 08/08/2026',
         gc_ref='Clune SCO No. 003 (IT004)',
         intro=('Clune Construction Company LP, the general contractor on the <b>Sompo</b> project (1001 Franklin Ave, '
                'Floors 2 &amp; 3), issued a back charge to Northern Wolves AC under Subcontract Change Order No. 003, '
                'item IT004, dated 08/20/2026, for Clune superintendent and labor time. This back charge is passed through '
                'to ADLS Enterprises, LLC at cost and will be deducted from ADLS Invoice #{inv}. A copy of the Clune '
                'change order is attached.'),
         prior=[('BC-ADLS-001-2026', 8000)],
         items=[('Clune superintendent and labor, Saturday', '08/01/2026', '8', 'per Clune', None),
                ('Clune superintendent and labor, Thursday', '08/06/2026', '4', 'per Clune', None),
                ('Clune superintendent and labor, Saturday', '08/08/2026', '8', 'per Clune', None)],
         total=5440, attach='source/Clune SCO 003 signed - Sompo back charge.pdf',
         redact=[(20, 535, 596, 598)]),
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
    amt = bc.get('total') or sum(i[4] for i in bc['items'])
    assert amt == sum(i[4] for i in bc['items'] if i[4] is not None) or bc.get('total')
    prior = sum(v for _, v in bc['prior'])
    net = bc['inv_amt'] - prior - amt
    path = os.path.join(HERE, bc['file'])
    c = canvas.Canvas(path, pagesize=letter)
    c.setTitle(f"Back Charge {bc['no']} - {bc['project']}"); c.setAuthor('Northern Wolves AC')
    # header: company logo (black text, so on white) + title, navy rule underneath
    lh = 58; lw = lh * LOGO_W / LOGO_H
    c.drawImage(LOGO, M, H - 22 - lh, lw, lh, mask='auto')
    c.setFillColor(colors.black); c.setFont('LS', 9)
    c.drawString(M + lw + 12, H - 50, '55 9th St, 55-A2, Brooklyn, NY 11215')
    c.drawString(M + lw + 12, H - 62, '(347) 463-9248')
    c.setFillColor(NAVY)
    c.setFont('LSB', 20); c.drawRightString(W - M, H - 48, 'BACK CHARGE')
    c.setFont('LSB', 11); c.drawRightString(W - M, H - 64, f"No. {bc['no']}")
    c.setStrokeColor(NAVY); c.setLineWidth(2.5); c.line(M, H - 90, W - M, H - 90); c.setLineWidth(1)
    c.setFillColor(colors.black); c.setStrokeColor(colors.black)

    y = H - 118
    c.setFont('LSB', 10); c.drawString(M, y, 'To (Subcontractor):')
    c.setFont('LS', 10)
    for i, l in enumerate(SUB):
        c.drawString(M, y - 15 - i * 13, l)
    info = [('Date:', DATE), ('Project:', bc['project']), ('Reference:', f"ADLS Invoice #{bc['inv']} dated {bc['inv_date']}")]
    if bc.get('gc_ref'):
        info.append(('GC ref.:', bc['gc_ref']))
    info.append(('Work dates:', bc['dates']))
    for i, (k, v) in enumerate(info):
        c.setFont('LSB', 10); c.drawString(330, y - i * 15, k)
        c.setFont('LS', 10); c.drawString(400, y - i * 15, v)

    y -= 90
    p = Paragraph(bc['intro'].format(project=bc['project'], inv=bc['inv']), st)
    _, h = p.wrap(W - 2 * M, 200); p.drawOn(c, M, y - h); y -= h + 16

    rows = [['Description', 'Dates', 'Hours', 'Rate', 'Amount']]
    for d, dt, hr, rate, a in bc['items']:
        rows.append([Paragraph(d, st), dt, hr, rate, money(a) if a is not None else ''])
    rows.append(['Total back charge', '', str(sum(int(i[2]) for i in bc['items'])), '', money(amt)])
    y -= table(c, rows, M, y, [230, 90, 50, 60, 82], bold_rows=(len(rows) - 1,)) + 22

    c.setFont('LSB', 11); c.drawString(M, y, 'Application to ADLS Invoice #' + bc['inv']); y -= 8
    rec = [['', 'Amount'],
           [f"ADLS Invoice #{bc['inv']} - final balance" + (f" (original contract ${bc['contract']:,})" if bc['contract'] else ''),
            money(bc['inv_amt'])]]
    for no, v in bc['prior']:
        rec.append([f'Less: Back Charge {no} (previously issued)', money(-v)])
    rec.append([f"Less: Back Charge {bc['no']}", money(-amt)])
    if net >= 0:
        rec.append(['Net amount payable to ADLS Enterprises, LLC', money(net)])
    else:
        rec.append(['Balance due from ADLS Enterprises, LLC to Northern Wolves AC', money(-net)])
    y -= table(c, rec, M, y, [430, 82], bold_rows=(len(rec) - 1,)) + 18

    if net < 0:
        p = Paragraph(
            f"The back charges exceed Invoice #{bc['inv']}. Invoice #{bc['inv']} is offset in full, and the remaining "
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

    if bc.get('attach'):
        import pymupdf
        doc = pymupdf.open(path)
        src = pymupdf.open(os.path.join(HERE, bc['attach']))
        for r in bc.get('redact', []):     # hide our contract sums with the GC before sending to the sub
            src[0].add_redact_annot(pymupdf.Rect(r), fill=(1, 1, 1))
        src[0].apply_redactions()
        src[0].insert_text((20, 575), '[Contract sums removed]', fontsize=9, color=(0.4, 0.4, 0.4))
        doc.insert_pdf(src)
        last = doc[-1]
        last.insert_text((40, 780), f"Attachment to Back Charge {bc['no']}: {bc['gc_ref']}", fontsize=9, color=(0.12, 0.23, 0.37))
        tmp = path + '.tmp'
        doc.save(tmp, garbage=4, deflate=True); doc.close(); os.replace(tmp, path)
    return amt, net


if __name__ == '__main__':
    for bc in BCS:
        print(bc['no'], bc['project'], *build(bc))
