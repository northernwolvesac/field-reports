"""Subcontractor warranty letter for India Pentecostal Assembly (IPA Church), on Core Concepts Contracting's
required template (C24-001 IPA - SAMPLE - SUB WARRANTY LETTER 10.26.26). CCC rejected our standard letter on
11/24/2026 and asked for their template wording; the letter needs an original signature.
Run:  python3 build_warranty_letter.py  -> W-002 Warranty Letter (CCC template) - India Pentecostal Assembly.pdf"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'W-002 Warranty Letter (CCC template) - India Pentecostal Assembly.pdf')
LOGO = os.path.join(HERE, '..', '..', '..', '..', 'logo-full.png'); LOGO_W, LOGO_H = 2367, 1303
NAVY = colors.HexColor('#1d2d3d')
DATE = 'November 25, 2026'
COMPANY = 'Northern Wolves Inc.'

body = ParagraphStyle('b', fontName='Helvetica', fontSize=11, leading=15.5)
bold = ParagraphStyle('bb', parent=body, fontName='Helvetica-Bold')
just = ParagraphStyle('j', parent=body, alignment=4)


def letterhead(c, doc):
    c.saveState()
    W, H = letter
    lh = 46; lw = lh * LOGO_W / LOGO_H
    c.drawImage(LOGO, 0.9 * inch, H - 22 - lh, lw, lh, mask='auto')
    c.setFont('Helvetica-Bold', 10); c.setFillColor(NAVY)
    c.drawRightString(W - 0.9 * inch, H - 34, 'NORTHERN WOLVES INC.')
    c.setFont('Helvetica', 8.5); c.setFillColor(colors.black)
    c.drawRightString(W - 0.9 * inch, H - 46, '55 9th Street, Unit 55A-2, Brooklyn, NY 11215')
    c.drawRightString(W - 0.9 * inch, H - 57, '(347) 463-9248  |  northernwolvesac.com')
    c.setStrokeColor(NAVY); c.setLineWidth(2); c.line(0.9 * inch, H - 78, W - 0.9 * inch, H - 78)
    c.restoreState()


def build():
    doc = SimpleDocTemplate(OUT, pagesize=letter, leftMargin=0.9 * inch, rightMargin=0.9 * inch,
                            topMargin=1.45 * inch, bottomMargin=0.8 * inch,
                            title='Subcontractor Warranty - India Pentecostal Assembly', author=COMPANY)
    s = [Paragraph(DATE, body), Spacer(1, 18),
         Paragraph('ATT: Nicole LaMontagne<br/>Core Concept Contracting Corp<br/>687 Old Willets Path<br/>'
                   'Hauppauge, New York 11788', body), Spacer(1, 16)]
    re = Table([[Paragraph('<b>RE:</b>', body),
                 Paragraph('<b>India Pentecostal Assembly</b><br/>310 South Oyster Bay Road<br/>Syosset, NY 11791', body)]],
               colWidths=[38, 400])
    re.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                            ('TOPPADDING', (0, 0), (-1, -1), 0)]))
    s += [re, Spacer(1, 18),
          Paragraph(f'{COMPANY}, hereby guarantees the following for the above location.', body), Spacer(1, 12),
          Paragraph(f'<b>GUARANTEE:</b> All materials and workmanship shall be guaranteed for a period of One (1) Year '
                    f'from the time of substantial completion as of October 26, 2026 unless otherwise specified for a '
                    f'longer period of time. We shall be responsible for the cost incidental thereto, including damage '
                    f'to work done by others, existing structures, furnishings and/or equipment. If {COMPANY}, after '
                    f'written notice from the Owner, Architect or General Contractor, fails to comply promptly with the '
                    f'terms of this guarantee, the Owner may have the defects and/or damages corrected and {COMPANY} '
                    f'is responsible and shall be liable for all expenses incurred.', just),
          Spacer(1, 54)]
    sig = Table([['', '', ''],
                 [Paragraph('Signature', body), '',
                  Paragraph('Ruslan Zhdamarov, CEO / President<br/>' + COMPANY + '<br/>'
                            '<font size="8.5" color="#707070">Print Name &amp; Title</font>', body)]],
                colWidths=[210, 40, 220], rowHeights=[4, None])
    sig.setStyle(TableStyle([('LINEABOVE', (0, 1), (0, 1), 0.8, colors.black),
                             ('LINEABOVE', (2, 1), (2, 1), 0.8, colors.black),
                             ('LEFTPADDING', (0, 0), (-1, -1), 0), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    s += [sig]
    doc.build(s, onFirstPage=letterhead, onLaterPages=letterhead)
    print('built', OUT)


if __name__ == '__main__':
    build()
