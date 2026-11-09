"""Saddle River Day School - formal response to the Johnson & Urban MEP punch list (JU# 24-050, 7/15/2026),
mechanical items 1-17, requested by Gabe Miani (March Associates) on 11/9/2026.

Run: python3 build_response.py
Out: SRDS - Punch List Response Letter.pdf   (letter on letterhead, item-by-item status)
     SRDS - Punch List Backup Binder.pdf     (exhibit index + exhibits from backup/)

DRAFT = True highlights every statement that is not yet backed by an email or document (yellow [CONFIRM ...]).
Set the confirmed wording in ITEMS / OTHER, drop the missing backup files into backup/ with the exhibit names in
EXHIBITS, set DRAFT = False and rebuild. Missing exhibits print a red "to be inserted" tab page while DRAFT.
"""
import os
import pymupdf
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle, SimpleDocTemplate, KeepTogether

DRAFT = True
DATE = 'November 9, 2026'
HERE = os.path.dirname(os.path.abspath(__file__))
BK = os.path.join(HERE, 'backup')
LOGO = os.path.join(HERE, '..', '..', '..', '..', 'logo-full.png'); LOGO_W, LOGO_H = 2367, 1303
LETTER_OUT = os.path.join(HERE, 'SRDS - Punch List Response Letter.pdf')
BINDER_OUT = os.path.join(HERE, 'SRDS - Punch List Backup Binder.pdf')

pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LSB', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LSI', '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf'))
pdfmetrics.registerFontFamily('LS', normal='LS', bold='LSB', italic='LSI', boldItalic='LSB')
NAVY = colors.HexColor('#1F3A5F'); LIGHT = colors.HexColor('#EEF2F7'); GREY = colors.HexColor('#555555')
STATUS_COL = {'COMPLETE': colors.HexColor('#1E7B34'), 'SUBMITTED': colors.HexColor('#1E7B34'),
              'IN PROGRESS': colors.HexColor('#B26A00'), 'BY AME': colors.HexColor('#1565C0'),
              'TO CONFIRM': colors.HexColor('#C62828')}

body = ParagraphStyle('b', fontName='LS', fontSize=9.6, leading=12.6)
cell = ParagraphStyle('c', fontName='LS', fontSize=8.1, leading=10.1)
cellb = ParagraphStyle('cb', parent=cell, fontName='LSB')
small = ParagraphStyle('s', fontName='LS', fontSize=7.6, leading=9.4, textColor=GREY)
h2 = ParagraphStyle('h2', fontName='LSB', fontSize=10.5, leading=13, textColor=NAVY, spaceBefore=6, spaceAfter=4)


def C(text):
    """Statement still to be confirmed before the letter goes out."""
    if DRAFT:
        return f'<span backColor="#FFF2A8">[CONFIRM: {text}]</span>'
    return text


# (no, engineer comment, status, response, backup exhibits)
ITEMS = [
    (1, 'Provide As-Built drawings, O&amp;M manuals, and Warranties.', 'IN PROGRESS',
     'Warranties complete: One-Year Labor Warranty (6/18/2026) and Contractor\'s Warranty on March form (9/1/2026), '
     'accepted by March 9/2/2026. Equipment IOM / O&amp;M manuals and manufacturer warranties submitted to March '
     '8/14/2026 (Dropbox transmittal). BMS as-builts and O&amp;M by AME (control submittal 25-05617) attached. '
     + C('HVAC ductwork and piping as-built drawings attached (MEC4)'),
     '1-A, 1-B, 1-C, 1-D, 1-E'),
    (2, 'Submit vendor equipment start-up reports.', 'IN PROGRESS',
     'Lab hood exhaust fan VFD start-up report (ADE, 6/3/2026) submitted 7/14 and 7/16/2026, attached. '
     'Boiler start-up and combustion test performed 5/20-5/21/2026; RTU start-up by ADE in May-June 2026. '
     + C('boiler (Lochinvar) and RTU (ADE/Greenheck) start-up reports obtained and attached'),
     '2-A, 2-B, 2-C'),
    (3, 'Controls contractor to submit start-up checklist showing all control and monitor points provided and tested.',
     'BY AME',
     'Point-to-point checkout and start-up checklist by AME, Inc. (controls subcontractor, Section 23 09 23). '
     + C('AME checklist received and attached'),
     '3'),
    (4, 'Test unoccupied and occupied modes of operation for all equipment.', 'COMPLETE',
     'Occupied and unoccupied modes tested with AME (reported complete 8/10/2026). '
     + C('AME schedule / trend confirmation attached'),
     '3'),
    (5, 'Provide air-side and water-side balancing reports.', 'SUBMITTED',
     'Air balancing report (Rite Technical Services, 6/17/2026) submitted 6/22/2026 and again 7/21/2026. '
     'Water balancing report (7/14/2026) submitted to March 8/31/2026. Both attached.',
     '5-A, 5-B'),
    (6, "Set thermostat limits per the owner's requirements.", 'BY AME',
     'Space thermostats locked out / limited by AME through the BMS; AME confirmed the correction 9/14/2026. '
     + C('owner confirms limits are acceptable'),
     '-'),
    (7, "Test heating/cooling mode of operation for RTU's.", 'COMPLETE',
     'RTU heating and cooling modes tested (8/10/2026). RTU factory controls and settings reviewed with ADE and '
     'AME on 9/21/2026. ' + C('all RTUs operating normally in current season, no open alarms'),
     '-'),
    (8, 'Provide training for the new systems and controls for the owner.', 'COMPLETE',
     'Equipment training provided on site 8/31/2026 to the school maintenance team; BMS training provided by AME. '
     'Training certification letter attached. ' + C('signed by school personnel'),
     '8'),
    (9, 'RTU condensate drains are PVC; spec M-002 calls for copper type L with wrought copper fittings.', 'COMPLETE',
     'RTU condensate drains replaced with type L copper and wrought copper fittings. ' + C('photos attached'),
     'P'),
    (10, 'RTU-1 high stage compressor extremely loud (93 dB); investigate and correct.', 'IN PROGRESS',
     'Investigated with the manufacturer\'s representative (ADE) and the engineer: the unit operates within the '
     'manufacturer\'s parameters; the sound is due to the unit type and location above the offices. Compressor '
     'sound blankets ordered from Greenheck (8/2026). ' + C('blankets installed on ___ / scheduled for ___'),
     'P'),
    (11, 'Refrigerant lines through roof curb boots installed incorrectly; replace boots, clamp to line set.',
     'COMPLETE',
     'Per the engineer\'s direction on site, the line set insulation at the curb boots was reworked so the insulation '
     'jacket butts against the boot on both sides. ' + C('completed on ___, photos attached'),
     'P'),
    (12, 'Provide 3 L-brackets anchored into the slab at the base of the hydronic expansion tanks.', 'COMPLETE',
     C('L-brackets installed and anchored on ___, photos attached'),
     'P'),
    (13, 'Fin tube radiator enclosures not securely mounted; provide additional support.', 'COMPLETE',
     'Enclosures secured with additional supports (8/10/2026). ' + C('corner pieces installed'),
     'P'),
    (14, 'Install rooftop fireplace exhaust fan control panel cover.', 'COMPLETE',
     C('control panel cover installed on ___, photo attached'),
     'P'),
    (15, 'Bare control cable behind fin tube radiators to be in flex metal conduit with connectors.', 'COMPLETE',
     'Control cable behind the fin tube radiators enclosed in flexible metal conduit with connectors at both ends '
     '(complete 8/10/2026). ' + C('photo attached'),
     'P'),
    (16, 'Test all science lab hood exhaust fan systems.', 'COMPLETE',
     'Lab hood exhaust fans and VFDs started up (ADE, 6/3/2026), calibrated and tested; all six lab hoods verified '
     'in operation with March (J. Turano) and AME on 8/19/2026.',
     '2-A'),
    (17, 'Verify firestopping for hydronic piping through block / rated walls; sheet metal flashing or cement patch.',
     'COMPLETE',
     'Northern Wolves penetrations firestopped and openings flashed / patched (8/10/2026). '
     + C('remaining electrical (ABEU) penetrations completed; photos attached'),
     'P'),
]

OTHER = [
    ('VAV access doors', 'Two 24x24 hidden-flange access doors selected by March (8/10/2026), ordered and delivered. '
     + C('installed on ___')),
    ('CUH-3', C('status: 120 V unit substitution (no new 208 V circuit) pending March approval since 8/19/2026 / installed on ___')),
    ('Attic stock', 'Spare fusible links purchased and ready for delivery; please advise where to deliver. '
     'B&amp;G RO-5 differential pressure read-out kit (Section 23 21 16) is discontinued by the manufacturer with no '
     'direct replacement. ' + C('equivalent substitute ___ / credit of $___ proposed')),
]

# exhibit code -> (title, file in backup/ or None, note when missing)
EXHIBITS = [
    ('A', 'Johnson & Urban MEP punch list, 7/15/2026 (JU# 24-050)', 'A - J&U MEP Punch List 2026-07-15.pdf', ''),
    ('1-A', 'NWAC One-Year Labor Warranty, 6/18/2026', '1-A NWAC One-Year Labor Warranty 2026-06-18.pdf', ''),
    ('1-B', "Contractor's Warranty (March form), 9/1/2026", '1-B Contractor Warranty March form 2026-09-01.pdf', ''),
    ('1-C', 'O&M / IOM manuals and manufacturer warranties - transmittal 8/14/2026', None, 'GENERATED'),
    ('1-D', 'HVAC as-built drawings, ductwork and piping (MEC4)', '1-D HVAC As-Built Drawings.pdf',
     'Get final as-builts from Alex Santos (MEC4); confirmed "can be done tomorrow" on 9/8/2026.'),
    ('1-E', 'AME BMS as-builts / O&M, control submittal 25-05617 (7/15/2026)', '1-E AME BMS As-Builts 25-05617.pdf',
     'In Ruslan\'s Gmail: James Winship (AME) 9/8/2026 "close-out docs", never sent on to March.'),
    ('2-A', 'ADE VFD start-up report, lab hood exhaust fans LHEF-1/2/3, 6/3/2026',
     '2-A ADE VFD Start-up Report 2026-06-03.pdf', ''),
    ('2-B', 'Boiler start-up and combustion test report (May 2026)', '2-B Boiler Start-up Report.pdf',
     'Not found in email. Request from ADE / Lochinvar rep who did the 5/20-5/21 start-up.'),
    ('2-C', 'RTU start-up reports (ADE / Greenheck)', '2-C RTU Start-up Reports.pdf',
     'Not found in email. Request from Ryan Adams (ADE).'),
    ('3', 'AME controls start-up checklist / point checkout', '3 AME Point Checkout.pdf',
     'Not found in email. Request from James Winship / Arth Patel (AME).'),
    ('5-A', 'Air balancing report, Rite Technical Services, 6/17/2026',
     '5-A Air Balancing Report 2026-06-17 (Rite Technical).pdf', ''),
    ('5-B', 'Water balancing report, Rite Technical Services, 7/14/2026',
     '5-B Water Balancing Report 2026-07-14 (Rite Technical).pdf', ''),
    ('8', 'HVAC owner training certification, training of 8/31/2026', '8 HVAC Owner Training Certification 2026-08-31.pdf',
     'Signed copy needed. Unsigned version sent 10/6/2026 is used until then.'),
    ('P', 'Field photos: items 9, 10, 11, 12, 13, 14, 15, 17, access doors', 'P Field Photos.pdf',
     'Andrei / Anwar to take dated photos of each item.'),
]
FALLBACK = {'8': '8 HVAC Owner Training Certification 2026-08-31 (unsigned).pdf'}


# ---------------- letter ----------------
def letterhead(c, doc):
    c.saveState()
    W, H = letter
    lh = 46; lw = lh * LOGO_W / LOGO_H
    c.drawImage(LOGO, 0.75 * inch, H - 20 - lh, lw, lh, mask='auto')
    c.setFont('LS', 8.5); c.setFillColor(colors.black)
    c.drawRightString(W - 0.75 * inch, H - 38, '55 9th Street, Unit 55A-2, Brooklyn, NY 11215')
    c.drawRightString(W - 0.75 * inch, H - 50, '(347) 463-9248  |  northernwolvesac.com')
    c.setStrokeColor(NAVY); c.setLineWidth(2); c.line(0.75 * inch, H - 74, W - 0.75 * inch, H - 74)
    c.setFont('LS', 7.5); c.setFillColor(GREY)
    c.drawString(0.75 * inch, 26, 'Northern Wolves Inc.  |  Saddle River Day School  |  Response to MEP punch list JU# 24-050')
    c.drawRightString(W - 0.75 * inch, 26, f'Page {doc.page}')
    if DRAFT:
        c.setFont('LSB', 9); c.setFillColor(colors.HexColor('#C62828'))
        c.drawCentredString(W / 2, H - 88, 'DRAFT - yellow items to be confirmed before issue')
    c.restoreState()


def build_letter():
    doc = SimpleDocTemplate(LETTER_OUT, pagesize=letter, leftMargin=0.75 * inch, rightMargin=0.75 * inch,
                            topMargin=1.4 * inch, bottomMargin=0.6 * inch,
                            title='SRDS - Response to MEP Punch List', author='Northern Wolves Inc.')
    s = []
    s.append(Paragraph(DATE, body)); s.append(Spacer(1, 8))
    s.append(Paragraph('March Associates Construction, Inc.<br/>601 Hamburg Turnpike, Suite 300<br/>Wayne, NJ 07470', body))
    s.append(Spacer(1, 6))
    s.append(Paragraph('<b>Attn:</b> Gabriel Miani, P.E., Senior Project Manager', body))
    s.append(Paragraph('<b>Cc:</b> Todd Laubach, Joey Turano, Lorrany (March Associates); James Winship (AME, Inc.)', body))
    s.append(Spacer(1, 8))
    s.append(Paragraph('<b>Project:</b> Saddle River Day School, 147 Chestnut Ridge Rd, Saddle River, NJ 07458 '
                       '(March Project No. 482)', body))
    s.append(Paragraph('<b>Re:</b> Response to Johnson &amp; Urban MEP Punch List dated July 15, 2026 (JU# 24-050) - '
                       'Mechanical items 1-17', body))
    s.append(Spacer(1, 10))
    s.append(Paragraph('Gabe,', body)); s.append(Spacer(1, 4))
    s.append(Paragraph(
        'As requested in your email of November 9, 2026, below is Northern Wolves Inc.\'s formal response to each '
        'mechanical item of the Johnson &amp; Urban punch list from the July 8, 2026 site walkthrough. This supersedes '
        'the work-in-progress update sent on August 10, 2026. Backup for each item is provided in the enclosed '
        'binder; exhibit numbers are shown in the last column. Items relating to the building controls were '
        'coordinated with AME, Inc., our controls subcontractor.', body))
    s.append(Spacer(1, 10))

    rows = [[Paragraph('<b>#</b>', cellb), Paragraph('<b>Engineer comment</b>', cellb), Paragraph('<b>Status</b>', cellb),
             Paragraph('<b>Northern Wolves response</b>', cellb), Paragraph('<b>Backup</b>', cellb)]]
    style = [('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#9AA5B1')), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
             ('BACKGROUND', (0, 0), (-1, 0), LIGHT), ('TOPPADDING', (0, 0), (-1, -1), 3),
             ('BOTTOMPADDING', (0, 0), (-1, -1), 3), ('LEFTPADDING', (0, 0), (-1, -1), 3), ('RIGHTPADDING', (0, 0), (-1, -1), 3)]
    for i, (n, comment, status, resp, ex) in enumerate(ITEMS, 1):
        col = STATUS_COL[status]
        rows.append([Paragraph(str(n), cellb), Paragraph(comment, cell),
                     Paragraph(f'<font color="{col.hexval().replace("0x", "#")}"><b>{status}</b></font>', cell),
                     Paragraph(resp, cell), Paragraph(ex, cell)])
    t = Table(rows, colWidths=[18, 128, 58, 240, 42], repeatRows=1)
    t.setStyle(TableStyle(style))
    s.append(t)

    s.append(Paragraph('Other close-out items', h2))
    for k, v in OTHER:
        s.append(Paragraph(f'<b>{k}:</b> {v}', body)); s.append(Spacer(1, 3))

    s.append(Spacer(1, 8))
    s.append(Paragraph(
        'With the enclosed documentation we consider the mechanical punch list items addressed. Please review and let '
        'us know if anything further is required to close out these items.', body))
    s.append(Spacer(1, 14))
    s.append(KeepTogether([Paragraph('Sincerely,', body), Spacer(1, 26),
                           Paragraph('Ruslan Zhdamarov<br/>Northern Wolves Inc.', body)]))
    s.append(Spacer(1, 10))
    s.append(Paragraph('Enclosure: SRDS - Punch List Backup Binder (exhibit index on page 2 of the binder).', small))
    doc.build(s, onFirstPage=letterhead, onLaterPages=letterhead)


# ---------------- binder ----------------
def tab_page(doc, code, title, missing_note=None):
    W, H = letter
    p = doc.new_page(width=W, height=H)
    p.draw_rect(pymupdf.Rect(0, 0, W, 90), color=None, fill=(0.12, 0.23, 0.37))
    p.insert_text((54, 58), f'EXHIBIT {code}', fontsize=28, color=(1, 1, 1), fontname='helv')
    p.insert_textbox(pymupdf.Rect(54, 140, W - 54, 260), title, fontsize=18, fontname='helv')
    p.insert_text((54, H - 40), 'Saddle River Day School - Northern Wolves Inc. - response to MEP punch list JU# 24-050',
                  fontsize=8, color=(0.4, 0.4, 0.4))
    if missing_note:
        p.insert_textbox(pymupdf.Rect(54, 300, W - 54, 420), 'TO BE INSERTED BEFORE ISSUE\n' + missing_note,
                         fontsize=13, color=(0.78, 0.16, 0.16))


def transmittal_page(doc):
    W, H = letter
    p = doc.new_page(width=W, height=H)
    txt = ('O&M / IOM MANUALS AND MANUFACTURER WARRANTIES - TRANSMITTAL\n\n'
           'Submitted by: Alikhan Ilyas, Northern Wolves Inc.\n'
           'Date: August 14, 2026\n'
           'To: Lorrany, March Associates (cc Gabriel Miani, P.E.)\n\n'
           'Content: Installation, operation and maintenance manuals and manufacturer warranties for all HVAC '
           'equipment furnished under the Northern Wolves subcontract, delivered as a shared Dropbox folder.\n\n'
           'Link:\nhttps://www.dropbox.com/scl/fo/rykt36ff0fkd4uh5br5dd/APIWgmKFP-MdthlZG_hjGqA'
           '?rlkey=f9ftczvasc0vsttiv1njzbx1d&dl=0\n\n'
           'A copy of the folder can be provided on a USB drive on request.')
    p.insert_textbox(pymupdf.Rect(54, 70, W - 54, H - 60), txt, fontsize=11, fontname='helv')


def build_binder():
    out = pymupdf.open()
    # cover
    W, H = letter
    cv = out.new_page(width=W, height=H)
    cv.insert_image(pymupdf.Rect(W / 2 - 110, 90, W / 2 + 110, 90 + 220 * LOGO_H / LOGO_W), filename=LOGO)
    cv.insert_textbox(pymupdf.Rect(54, 280, W - 54, 480),
                      'SADDLE RIVER DAY SCHOOL\n147 Chestnut Ridge Rd, Saddle River, NJ 07458\n\n'
                      'RESPONSE TO MEP PUNCH LIST (JU# 24-050)\nMechanical items 1-17 - Backup Binder\n\n'
                      f'Northern Wolves Inc.  |  {DATE}' + ('\n\nDRAFT' if DRAFT else ''),
                      fontsize=15, align=1, fontname='helv')
    # index
    ix = out.new_page(width=W, height=H)
    ix.insert_text((54, 70), 'EXHIBIT INDEX', fontsize=16, fontname='helv', color=(0.12, 0.23, 0.37))
    y = 100
    for code, title, fn, note in EXHIBITS:
        have = note == 'GENERATED' or (fn and os.path.exists(os.path.join(BK, fn))) or code in FALLBACK
        mark = '' if (have and not (code in FALLBACK and not os.path.exists(os.path.join(BK, fn)))) else '   (to be inserted)'
        ix.insert_text((54, y), f'{code}', fontsize=10.5, fontname='helv')
        ix.insert_textbox(pymupdf.Rect(100, y - 10, W - 54, y + 26), title + (mark if DRAFT else ''), fontsize=10.5)
        y += 30
    # exhibits
    for code, title, fn, note in EXHIBITS:
        if note == 'GENERATED':
            tab_page(out, code, title); transmittal_page(out); continue
        path = os.path.join(BK, fn) if fn else None
        if path and os.path.exists(path):
            tab_page(out, code, title); out.insert_pdf(pymupdf.open(path)); continue
        if code in FALLBACK:
            tab_page(out, code, title, note if DRAFT else None)
            out.insert_pdf(pymupdf.open(os.path.join(BK, FALLBACK[code]))); continue
        if DRAFT:
            tab_page(out, code, title, note)
    out.save(BINDER_OUT, garbage=4, deflate=True)
    return len(out)


if __name__ == '__main__':
    build_letter()
    n = build_binder()
    print(LETTER_OUT); print(BINDER_OUT, n, 'pages')
