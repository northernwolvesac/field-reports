"""Urban Health Plan - Plaza del Sol (37-12 108th St, Corona NY) - HVAC closeout binder.

Assembles: cover, contents, project directory, equipment schedule, NWAC guarantee letter, maintenance instructions,
then per-equipment sections (vendor O&M manuals + approved submittal as catalog data), manufacturer warranties,
as-built drawings and the TAB report.

Drop vendor documents into docs/ and re-run; anything missing prints as a "PENDING" sheet so the draft shows the gaps:
    docs/om/<KEY>*.pdf          O&M / IOM manuals    (KEY = RTU, MS, TX, EUH, ST, AO, TSTAT, CURB)
    docs/warranty/<KEY>*.pdf    manufacturer warranty statements / certificates
    docs/asbuilt/*.pdf          as-built drawings (latest set first by name)
    docs/tab/*.pdf              test & balance report
Run:  python3 build_closeout.py            -> "Urban Health - HVAC Closeout Package.pdf" (FINAL=False adds DRAFT marks)
"""
import glob
import os

import pymupdf
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, 'docs')
TMP = os.path.join(HERE, '_pages')
LOGO = os.path.join(HERE, '..', '..', '..', '..', 'logo-full.png'); LOGO_W, LOGO_H = 2367, 1303
OUT = os.path.join(HERE, 'Urban Health - HVAC Closeout Package.pdf')
FINAL = True                        # True removes the DRAFT marks and the pending sheets' red banner
DATE = 'November 25, 2026'
WARRANTY_START = None               # e.g. 'March 2, 2026'; None -> "date of substantial completion"

pdfmetrics.registerFont(TTFont('LS', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LSB', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LSI', '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf'))
pdfmetrics.registerFontFamily('LS', normal='LS', bold='LSB', italic='LSI', boldItalic='LSB')
NAVY = colors.HexColor('#1F3A5F'); LIGHT = colors.HexColor('#EEF2F7'); GREY = colors.HexColor('#555555')
RED = colors.HexColor('#C62828')
body = ParagraphStyle('b', fontName='LS', fontSize=10, leading=14, alignment=TA_JUSTIFY)
cell = ParagraphStyle('c', fontName='LS', fontSize=8, leading=10)
cellb = ParagraphStyle('cb', parent=cell, fontName='LSB', textColor=colors.white)

PROJECT = 'Urban Health Plan - Plaza del Sol Primary Care Site'
ADDRESS = '37-12 108th Street, 2nd Floor, Corona, NY 11368'
W, H = letter

DIRECTORY = [
    ('Owner', 'Urban Health Plan, Inc.', 'Richard Perez', 'Richard.Perez@urbanhealthplan.org  |  917-244-5931'),
    ('General Contractor', 'Sentinel Builders, LLC - 245 5th Ave, Suite 5109, New York, NY 10016', 'Ryan Jennings, President',
     'rjennings@sentinel-builders.com  |  646-974-8234'),
    ('Architect', 'Delgado Gilbride & Keenan Architects (dgk) - 57 Main St, Westport, CT 06880', 'Gerry Gilbride',
     'dgkarchitects@aol.com  |  203-858-4401'),
    ('MEP Engineer', 'OLA Consulting Engineers - 8 West 38th St, Suite 900, New York, NY 10018', 'Project NDGK0020.07', ''),
    ('HVAC Contractor', 'Northern Wolves Inc. - 55 9th Street, Unit 55A-2, Brooklyn, NY 11215',
     'Ruslan Zhdamarov, President  |  Andrei Kastanyan, PM', 'Office 347-463-9248  |  hello@northernwolvesac.com'),
    ('RTU supplier', 'Lennox Commercial - Northeast (order 830518044)', 'Matthew Recenello',
     'Northeast.Commercial@lennoxind.com  |  973-939-3923'),
    ('Mini split supplier', 'Homans Associates (Mitsubishi Electric)', 'Rajiv Dyal', 'rajiv.dyal@homans.com  |  646-276-3300'),
    ('Exhaust fan supplier', 'Engineered Air Solutions (Rupp Air)', 'Randy Sapoff',
     'rsapoff@engineeredairsolutions.com  |  973-536-2220'),
]

# key, section title, schedule rows (tag, qty, description, manufacturer / model, location), approved submittals, supplier
# The GC asked for O&M manuals and manufacturer warranties only (no submittals) -> submittal lists left empty.
EQUIPMENT = [
    ('RTU', 'Packaged Rooftop Units RTU-1 to RTU-6',
     [('RTU-1 to RTU-6', '6', 'Packaged gas / electric rooftop unit, 4 ton, R-410A, economizer, 208/3/60, '
       'ComfortSense 8500 thermostat', 'Lennox LGT048H4E (LGT048H4EB1Y)', 'Roof (steel dunnage)')],
     [], 'Lennox Commercial'),
    ('MS', 'IT Room Ductless Split System AC-A / ACC-A',
     [('AC-A', '1', 'Wall mounted indoor unit, 1 ton, cooling only, PAR-40MAAU controller, condensate pump',
       'Mitsubishi PKA-A12LA', 'IT room'),
      ('ACC-A', '1', 'Outdoor condensing unit with wind baffle WB-PA4', 'Mitsubishi PUY-A12NKA7', 'Roof')],
     [], 'Homans Associates'),
    ('TX', 'Exhaust Fans TX-1 to TX-6',
     [('TX-1 to TX-6', '6', 'Direct drive centrifugal downblast roof exhaust fans, 115/1/60', 'Rupp Air DR10HRA / DR12HRA',
       'Roof')],
     [], 'Engineered Air Solutions'),
]

MAINTENANCE = [
    ('RTU-1 to RTU-6', 'Replace filters every 3 months (monthly in high-dust periods). Inspect and clean condenser and '
     'evaporator coils, condensate pan, drain and trap twice a year. Check economizer damper, actuator and controls each '
     'season. Annual heating start-up: inspect burners, heat exchanger, flue, gas pressure and safeties before heating '
     'season. Check refrigerant operating pressures, electrical connections and motor amps annually. Inspect curb, '
     'isolators and roof flashing annually.'),
    ('Thermostats', 'Verify schedules and set points each season; confirm time/date after power outages.'),
    ('AC-A / ACC-A', 'Clean indoor unit filters monthly. Clean indoor and outdoor coils, condensate pump reservoir and '
     'drain line twice a year. Check refrigerant operating pressures and electrical connections annually. Keep the '
     'outdoor unit and wind baffle clear of debris and snow.'),
    ('TX-1 to TX-6', 'Inspect and clean fan wheel, housing and grille every 6 months; check backdraft damper operation; '
     'verify fan speed setting and amp draw annually.'),
]


def logo_header(c, title):
    lh = 40; lw = lh * LOGO_W / LOGO_H
    c.drawImage(LOGO, 0.75 * inch, H - 18 - lh, lw, lh, mask='auto')
    c.setFont('LSB', 11); c.setFillColor(NAVY); c.drawRightString(W - 0.75 * inch, H - 36, title)
    c.setFont('LS', 8); c.setFillColor(GREY); c.drawRightString(W - 0.75 * inch, H - 48, PROJECT)
    c.setStrokeColor(NAVY); c.setLineWidth(1.2); c.line(0.75 * inch, H - 64, W - 0.75 * inch, H - 64)
    c.setFont('LS', 7.5); c.setFillColor(GREY)
    c.drawString(0.75 * inch, 0.45 * inch, 'Northern Wolves Inc.  |  55 9th Street, Unit 55A-2, Brooklyn, NY 11215  |  '
                 '347-463-9248')
    if not FINAL:
        c.setFont('LSB', 8); c.setFillColor(RED); c.drawRightString(W - 0.75 * inch, 0.45 * inch, 'DRAFT')
    c.setFillColor(colors.black)
    return H - 84


def place(c, flow, x, y, w):
    _, h = flow.wrap(w, 1000); flow.drawOn(c, x, y - h); return y - h


def grid(t, head=True):
    st = [('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#9AA5B1')), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
          ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4)]
    if head:
        st += [('BACKGROUND', (0, 0), (-1, 0), NAVY)]
    t.setStyle(TableStyle(st))


def new_pdf(name):
    os.makedirs(TMP, exist_ok=True)
    p = os.path.join(TMP, name)
    return p, canvas.Canvas(p, pagesize=letter)


def cover():
    p, c = new_pdf('00_cover.pdf')
    lw = 4.2 * inch; lh = lw * LOGO_H / LOGO_W
    c.drawImage(LOGO, (W - lw) / 2, H - 1.3 * inch - lh, lw, lh, mask='auto')
    y = H - 1.3 * inch - lh - 0.6 * inch
    c.setFillColor(NAVY); c.setFont('LSB', 24); c.drawCentredString(W / 2, y, 'HVAC CLOSEOUT DOCUMENTS'); y -= 30
    c.setFont('LS', 13); c.setFillColor(colors.black)
    c.drawCentredString(W / 2, y, 'Operation & Maintenance Manuals  |  Manufacturer Warranties  |  As-Built Drawings  |  TAB Report'); y -= 60
    c.setFont('LSB', 15); c.drawCentredString(W / 2, y, PROJECT); y -= 20
    c.setFont('LS', 12); c.drawCentredString(W / 2, y, ADDRESS); y -= 50
    rows = [('Owner', 'Urban Health Plan, Inc.'), ('General Contractor', 'Sentinel Builders, LLC'),
            ('Architect', 'Delgado Gilbride & Keenan Architects'), ('MEP Engineer', 'OLA Consulting Engineers  (NDGK0020.07)'),
            ('HVAC Contractor', 'Northern Wolves Inc.'), ('Date', DATE)]
    t = Table([[Paragraph('<b>%s</b>' % a, cell), Paragraph(b, cell)] for a, b in rows], colWidths=[1.6 * inch, 3.6 * inch])
    grid(t, head=False); t.setStyle(TableStyle([('FONTSIZE', (0, 0), (-1, -1), 10)]))
    place(c, t, (W - 5.2 * inch) / 2, y, 5.2 * inch)
    if not FINAL:
        c.setFont('LSB', 12); c.setFillColor(RED); c.drawCentredString(W / 2, 1.1 * inch, 'DRAFT - vendor documents pending')
    c.showPage(); c.save(); return p


def directory_and_schedule():
    p, c = new_pdf('02_directory.pdf')
    y = logo_header(c, 'PROJECT DIRECTORY')
    rows = [[Paragraph('<b>%s</b>' % h, cellb) for h in ['Role', 'Company', 'Contact', 'Email / phone']]]
    rows += [[Paragraph(x, cell) for x in r] for r in DIRECTORY]
    t = Table(rows, colWidths=[1.1 * inch, 2.4 * inch, 1.5 * inch, 2.0 * inch]); grid(t)
    y = place(c, t, 0.75 * inch, y, 7 * inch) - 18
    c.setFont('LSB', 11); c.setFillColor(NAVY); c.drawString(0.75 * inch, y, 'WARRANTY SERVICE'); y -= 6
    c.setFillColor(colors.black)
    y = place(c, Paragraph('For service or warranty calls on the HVAC systems contact Northern Wolves Inc., '
                           '347-463-9248, hello@northernwolvesac.com. Please give the unit tag (e.g. RTU-3) and a '
                           'description of the problem.', body), 0.75 * inch, y - 4, 7 * inch)
    c.showPage()
    y = logo_header(c, 'EQUIPMENT SCHEDULE')
    rows = [[Paragraph('<b>%s</b>' % h, cellb) for h in ['Tag', 'Qty', 'Description', 'Manufacturer / model', 'Location',
                                                         'Supplier']]]
    for key, title, sched, subs, supplier in EQUIPMENT:
        for tag, q, d, m, loc in sched:
            rows.append([Paragraph(x, cell) for x in (tag, q, d, m, loc, supplier)])
    t = Table(rows, colWidths=[0.95 * inch, 0.35 * inch, 2.2 * inch, 1.6 * inch, 0.95 * inch, 0.95 * inch]); grid(t)
    place(c, t, 0.75 * inch, y, 7 * inch)
    c.showPage(); c.save(); return p


def guarantee():
    p, c = new_pdf('03_guarantee.pdf')
    y = logo_header(c, 'CONTRACTOR GUARANTEE')
    c.setFont('LS', 10); c.drawString(0.75 * inch, y, DATE); y -= 30
    for line in ['Sentinel Builders, LLC', '245 5th Avenue, Suite 5109', 'New York, NY 10016', 'Attn: Mr. Ryan Jennings, President']:
        c.drawString(0.75 * inch, y, line); y -= 13
    y -= 12
    c.setFont('LSB', 10); c.drawString(0.75 * inch, y, 'RE:  %s - %s' % (PROJECT, ADDRESS)); y -= 13
    c.drawString(0.75 * inch + 27, y, 'HVAC Work - Contractor Guarantee / Labor Warranty'); y -= 24
    start = WARRANTY_START or 'the date of substantial completion of the Project as accepted by the Owner'
    paras = [
        'Northern Wolves Inc. ("NWAC") guarantees that the heating, ventilating and air conditioning work furnished and '
        'installed by NWAC under its subcontract with Sentinel Builders, LLC at the above project was performed in a good '
        'and workmanlike manner, in accordance with the contract drawings, specifications and approved submittals.',
        'NWAC warrants all labor and workmanship, and all materials furnished by NWAC, against defects for a period of '
        '<b>one (1) year</b> from %s, or for any longer period required by the contract documents. During this period NWAC '
        'will repair or replace, at no cost to the Owner, any work found defective, including any damage to other work '
        'caused by such defect or by its repair.' % start,
        'Manufacturers\' equipment warranties (including any extended compressor or heat exchanger warranties) are assigned '
        'to the Owner and are included in this binder. During the NWAC warranty period NWAC will process warranty claims '
        'with the manufacturers on the Owner\'s behalf and provide the labor to replace covered parts.',
        'This guarantee does not cover damage caused by misuse, abuse, accident, vandalism, alteration or repair by others, '
        'failure to perform the maintenance described in the manufacturers\' instructions (including filter changes), '
        'power supply problems, or acts of nature.',
        'Warranty service requests: Northern Wolves Inc., 347-463-9248, hello@northernwolvesac.com.',
    ]
    for t in paras:
        y = place(c, Paragraph(t, body), 0.75 * inch, y, 7 * inch) - 10
    y -= 6; c.setFont('LS', 10); c.drawString(0.75 * inch, y, 'Respectfully submitted,'); y -= 16
    c.setFont('LSB', 10); c.drawString(0.75 * inch, y, 'NORTHERN WOLVES INC.'); y -= 44
    c.setLineWidth(0.6); c.setStrokeColor(colors.black); c.line(0.75 * inch, y, 3.6 * inch, y)
    c.line(4.4 * inch, y, 6.4 * inch, y); y -= 12
    c.setFont('LS', 9.5); c.drawString(0.75 * inch, y, 'Ruslan Zhdamarov, President'); c.drawString(4.4 * inch, y, 'Date')
    c.showPage(); c.save(); return p


def maintenance():
    p, c = new_pdf('04_maintenance.pdf')
    y = logo_header(c, 'MAINTENANCE INSTRUCTIONS')
    y = place(c, Paragraph('Recommended routine maintenance for the HVAC equipment on this project. The manufacturers\' '
                           'O&M manuals in the following sections govern; where they differ, follow the manufacturer. '
                           'Maintenance must be performed by qualified HVAC technicians to keep the warranties in effect.',
                           body), 0.75 * inch, y, 7 * inch) - 10
    rows = [[Paragraph('<b>Equipment</b>', cellb), Paragraph('<b>Recommended maintenance</b>', cellb)]]
    rows += [[Paragraph('<b>%s</b>' % a, cell), Paragraph(b, cell)] for a, b in MAINTENANCE]
    t = Table(rows, colWidths=[1.5 * inch, 5.5 * inch]); grid(t)
    place(c, t, 0.75 * inch, y, 7 * inch)
    c.showPage(); c.save(); return p


def sheet(name, title, lines, pending=False):
    p, c = new_pdf(name)
    y = logo_header(c, title)
    c.setFont('LSB', 20); c.setFillColor(NAVY); c.drawCentredString(W / 2, H / 2 + 60, title)
    c.setFillColor(colors.black); y = H / 2 + 30
    for ln in lines:
        y = place(c, Paragraph(ln, ParagraphStyle('x', parent=body, alignment=1)), 1.25 * inch, y, 6 * inch) - 6
    if pending and not FINAL:
        c.setFont('LSB', 14); c.setFillColor(RED); c.drawCentredString(W / 2, y - 30, 'PENDING - document requested from supplier')
    c.showPage(); c.save(); return p


def found(sub, key):
    return sorted(glob.glob(os.path.join(DOCS, sub, key + '*.pdf')))


def build():
    parts = []          # (path, toc title or None)
    parts.append((cover(), None))
    parts.append((None, 'TOC'))
    parts.append((directory_and_schedule(), 'Project Directory and Equipment Schedule'))
    parts.append((maintenance(), 'Maintenance Instructions'))
    status = []
    for i, (key, title, sched, subs, supplier) in enumerate(EQUIPMENT, 1):
        om = found('om', key); wa = found('warranty', key)
        lines = ['Supplier: %s' % supplier] + ['%s (%s)  %s' % (m, q, t) for t, q, d, m, loc in sched]
        parts.append((sheet('10_%02d_div.pdf' % i, 'SECTION %d - %s' % (i, title.upper()), lines), '%d. %s' % (i, title)))
        if om:
            parts += [(f, None) for f in om]
        elif True:
            parts.append((sheet('10_%02d_om.pdf' % i, 'O&M MANUAL - %s' % title,
                                ['Installation, operation and maintenance manual to be inserted.', 'Requested from %s.' % supplier],
                                pending=True), None))
        for s in subs:
            parts.append((os.path.join(DOCS, 'submittals', s), None))
        status.append((title, 'yes' if om else ('n/a' if key in ('CURB', 'DUCT') else 'PENDING'),
                       'yes' if wa else ('n/a' if key in ('CURB', 'DUCT', 'TSTAT') else 'PENDING')))
    # warranties
    n = len(EQUIPMENT) + 1
    parts.append((sheet('20_div.pdf', 'SECTION %d - MANUFACTURER WARRANTIES' % n,
                        ['Manufacturers\' warranty statements and certificates, assigned to the Owner.']),
                  '%d. Manufacturer Warranties' % n))
    for key, title, sched, subs, supplier in EQUIPMENT:
        wa = found('warranty', key)
        if wa:
            parts += [(f, None) for f in wa]
        elif True:
            parts.append((sheet('20_%s.pdf' % key, 'WARRANTY - %s' % title, ['Requested from %s.' % supplier], pending=True), None))
    n += 1
    ab = sorted(glob.glob(os.path.join(DOCS, 'asbuilt', '*.pdf')), reverse=True)
    parts.append((sheet('30_div.pdf', 'SECTION %d - AS-BUILT DRAWINGS' % n, ['HVAC as-built drawings, North and South, '
                                                                              '2nd floor and roof.']), '%d. As-Built Drawings' % n))
    parts += [(ab[0], None)] if ab else [(sheet('30_p.pdf', 'AS-BUILT DRAWINGS', ['To be inserted.'], pending=True), None)]
    n += 1
    tab = sorted(glob.glob(os.path.join(DOCS, 'tab', '*.pdf')))
    parts.append((sheet('40_div.pdf', 'SECTION %d - TEST AND BALANCE REPORT' % n, ['Air balance report.']),
                  '%d. Test and Balance Report' % n))
    parts += [(f, None) for f in tab] if tab else [(sheet('40_p.pdf', 'TEST AND BALANCE REPORT', ['To be inserted.'],
                                                          pending=True), None)]

    # assemble, then write the contents page with real page numbers
    out = pymupdf.open(); toc = []; toc_at = None
    for path, title in parts:
        if path is None:
            toc_at = len(out); continue
        if title:
            toc.append((title, len(out) + 2))       # +1 for 1-based, +1 for the contents page inserted below
        out.insert_pdf(pymupdf.open(path))
    p, c = new_pdf('01_toc.pdf')
    y = logo_header(c, 'TABLE OF CONTENTS') - 6
    for t, pg in toc:
        c.setFont('LS', 10.5); c.drawString(0.9 * inch, y, t); c.drawRightString(W - 0.9 * inch, y, str(pg))
        c.setStrokeColor(colors.HexColor('#C9D1DB')); c.setDash(1, 2); c.line(0.9 * inch + c.stringWidth(t, 'LS', 10.5) + 4,
                                                                               y + 2, W - 0.9 * inch - 22, y + 2); c.setDash()
        y -= 20
    if not FINAL:
        y -= 14; c.setFont('LSB', 10); c.setFillColor(RED); c.drawString(0.9 * inch, y, 'Open items (draft only):'); y -= 15
        c.setFont('LS', 9); c.setFillColor(colors.black)
        for t, om, wa in status:
            if 'PENDING' in (om, wa):
                c.drawString(1.0 * inch, y, '%s - O&M: %s, warranty: %s' % (t, om, wa)); y -= 12
        if not ab: c.drawString(1.0 * inch, y, 'As-built drawings'); y -= 12
        if not tab: c.drawString(1.0 * inch, y, 'Test and balance report'); y -= 12
    c.showPage(); c.save()
    out.insert_pdf(pymupdf.open(p), start_at=toc_at)
    for i, pg in enumerate(out):
        if i:
            pg.insert_text((W - 0.75 * inch - 40, H - 0.3 * inch), 'Page %d of %d' % (i + 1, len(out)), fontsize=7,
                           color=(0.35, 0.35, 0.35))
    out.set_toc([[1, t, pg] for t, pg in toc])
    out.subset_fonts()                                   # vendor manuals embed full fonts; ~25% smaller
    out.rewrite_images(dpi_threshold=160, dpi_target=150, quality=70)
    out.save(OUT, garbage=4, deflate=True, deflate_images=True, deflate_fonts=True, use_objstms=1)
    split_parts(pymupdf.open(OUT), toc)
    return len(out), status


PART_LIMIT = 9.3e6      # Gmail connector attachment limit is 10 MB per file


def split_parts(full, toc):
    """Save e-mailable parts under PART_LIMIT, breaking at section starts where possible; parts 2+ repeat cover + contents."""
    for f in glob.glob(OUT.replace('.pdf', ' - Part *.pdf')):
        os.remove(f)
    starts = sorted(pg - 1 for t, pg in toc)              # 0-based first page of each section
    def size(a, b, front):
        v = pymupdf.open()
        if front:
            v.insert_pdf(full, from_page=0, to_page=1)
        v.insert_pdf(full, from_page=a, to_page=b)
        return len(v.tobytes(garbage=4, deflate=True, use_objstms=1)), v
    ranges, a, n = [], 0, len(full)
    while a < n:
        lo, hi = a, n - 1                                 # largest b with size(a..b) under the limit
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if size(a, mid, bool(ranges))[0] <= PART_LIMIT: lo = mid
            else: hi = mid - 1
        b = lo
        if b < n - 1:
            brk = [s for s in starts if a + 10 < s <= b]  # prefer ending just before a section divider
            if brk: b = brk[-1] - 1
        ranges.append((a, b)); a = b + 1
    for i, (a, b) in enumerate(ranges, 1):
        _, v = size(a, b, i > 1)
        v.save(OUT.replace('.pdf', ' - Part %d of %d.pdf' % (i, len(ranges))), garbage=4, deflate=True, use_objstms=1)


if __name__ == '__main__':
    import shutil
    n, status = build()
    shutil.rmtree(TMP, ignore_errors=True)
    print(OUT, n, 'pages')
    for s in status:
        print('  ', *s)
