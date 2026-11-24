"""NWAC standard submittal - Refrigerant piping for A2L refrigerants (R-32 / R-454B).

Refrigerant piping only (no condensate, water or hydronic items). Every data sheet is a current manufacturer
original in source/ (downloaded 11/24/2026). No pages from other contractors' packages.

Run: python3 build_a2l_package.py                          -> submittals-library/refrigerant-piping-a2l-package.pdf
     python3 build_a2l_package.py projects/<job>.json       -> project submittal with cover, in this folder
New job: copy projects/_TEMPLATE.json, fill it in, run the second command.
"""
import os
import pymupdf
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'source')
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LIB = os.path.join(ROOT, 'submittals-library')
LOGO = os.path.join(ROOT, 'logo-full.png'); LOGO_W, LOGO_H = 2367, 1303
TMP = os.path.join(HERE, '_pages')

FD = '/usr/share/fonts/truetype/liberation/'
pdfmetrics.registerFont(TTFont('Arial', FD + 'LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', FD + 'LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic', FD + 'LiberationSans-Italic.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial-Italic', boldItalic='Arial-Bold')
BLUE = colors.HexColor('#236fa1'); NAVY = colors.HexColor('#1F3A5F'); LIGHT = colors.HexColor('#EEF3F8')
GREY = colors.HexColor('#6a767c'); LINE = colors.HexColor('#9AA5B1')

TITLE = 'Refrigerant Piping (A2L) - Pipe, Fittings, Valves & Accessories'

# ---------------------------------------------------------------- content
REFRIG = 'R-32 / R-454B (A2L)'
PIPE_ROWS = [  # size OD, pipe, insulation, support, rod, max spacing
    ('1/4"', 'ACR soft (annealed coil)', 'Indoors 1"', '3/8"', "5'-0\""),
    ('3/8"', 'ACR soft (annealed coil)', 'Indoors 1"', '3/8"', "5'-0\""),
    ('1/2"', 'ACR soft (annealed coil)', 'Indoors 1"', '3/8"', "5'-0\""),
    ('5/8"', 'ACR soft (annealed coil)', 'Indoors 1"', '3/8"', "5'-0\""),
    ('3/4"', 'ACR hard drawn', 'Indoors 1" / Outdoors 2"', '3/8"', "5'-0\""),
    ('7/8"', 'ACR hard drawn', 'Indoors 1" / Outdoors 2"', '3/8"', "5'-0\""),
    ('1-1/8"', 'ACR hard drawn', 'Indoors 1-1/2" / Outdoors 3"', '3/8"', "6'-0\""),
    ('1-3/8"', 'ACR hard drawn', 'Indoors 1-1/2" / Outdoors 3"', '3/8"', "6'-0\""),
    ('1-5/8"', 'ACR hard drawn', 'Indoors 1-1/2" / Outdoors 3"', '3/8"', "8'-0\""),
]
FITTING = 'Wrot copper, L.R., brazed BCuP-5'
SUPPORT = 'Strut trapeze ITP 7201 with Fig. 167 shield, or ITP 8500 cushion clamp'

NOTES = [
    '<b>Refrigerant:</b> R-32 (or R-454B where the equipment is so specified), ASHRAE 34 safety group A2L. Design, '
    'installation and testing per ASHRAE 15-2022, ASME B31.5, NYC Mechanical Code Ch. 11, UL 60335-2-40 (equipment) '
    'and the equipment manufacturer\'s installation manual.',
    '<b>Tube:</b> ACR seamless copper, ASTM B280, UNS C12200, cleaned, dehydrated, nitrogen-charged and capped; UL '
    'recognized to 700 psig. Annealed coils 1/4" to 5/8" OD, hard drawn straight lengths 3/4" OD and larger.',
    '<b>Fittings:</b> wrought copper pressure fittings, ASME B16.22, long-radius elbows, UL recognized to 700 psig.',
    '<b>Joints:</b> brazed only. BCuP-5 (15% silver) for copper to copper; silver brazing alloy (BAg) with flux for '
    'copper to brass or steel. Continuous dry-nitrogen purge during brazing. No soft-solder joints. No field flare or '
    'mechanical joints in occupied spaces, except equipment-manufacturer connections complying with UL 60335-2-40 / '
    'ISO 14903.',
    '<b>Pressure rating:</b> equipment design pressure per manufacturer nameplate (R-32 / R-454B high side typically '
    '600-640 psig) is within the 700 psig rating of tube and fittings and the 775 psig MWP of the ball valves.',
    '<b>Testing:</b> dry-nitrogen pressure test at the equipment manufacturer\'s test pressure (not above component '
    'ratings), 24-hour hold with temperature correction; evacuation to 500 microns or lower with decay test; written '
    'test report.',
    '<b>Identification:</b> markers per ASME A13.1 showing the refrigerant designation (R-32 or R-454B) and "A2L", at '
    '20 ft maximum, at each side of wall and floor penetrations and at each valve and access port; stamped brass valve '
    'tags at isolation valves.',
    '<b>Supports:</b> spacing per NYC Mechanical Code Table 305.4 and MSS SP-58, and within 2 ft of each change of '
    'direction and of each equipment connection. Insulated lines bear on protection shields; insulation is continuous '
    'through supports.',
    '<b>By others:</b> refrigerant leak detection, mitigation ventilation and equipment A2L safety controls (with the '
    'equipment submittal); firestopping of rated penetrations; condensate drain piping (separate submittal).',
]

VALVE_ROWS = [
    ('Isolation ball valve', '1/4" - 1-5/8" OD', 'Mueller Refrigeration Cyclemaster, standard port with access port, '
     'ODS braze ends', 'MWP 775 psig (1-5/8" and below), UL 207 recognized; where shown on drawings'),
    ('Access / charging port', 'With valves', 'Schrader-type access port integral to ball valve / equipment service '
     'valves', 'Sealed cap'),
]
ACCESSORY_ROWS = [
    ('Brazing alloy', 'Lucas-Milhaupt Sil-Fos 15', 'AWS A5.8 BCuP-5, 15% Ag', 'Copper to copper'),
    ('Pipe insulation', 'Armacell AP ArmaFlex tube', 'Closed-cell elastomeric, ASTM C534 Type I', 'Thickness per schedule'),
    ('Insulation adhesive / tape', 'Armacell ArmaFlex 520, AP ArmaFlex tape', '', 'Seams and butt joints'),
    ('Outdoor insulation finish', 'Armacell ArmaFlex WB Finish', 'UV protective coating', 'All exterior insulation'),
    ('Strut / trapeze', 'ITP 7200 / 7201', '1-5/8" x 13/16", 14 ga, pre-galvanized', 'Trapeze supports'),
    ('Strut clamp', 'ITP 8500 cushion strut clamp', 'Thermoplastic-lined, for HVAC / refrigeration', 'Tube to strut'),
    ('Insulation protection shield', 'ITP Fig. 167', 'Galvanized steel, 180 deg', 'At each support, insulated lines'),
    ('Hanger rod / nuts / washers', 'ITP Fig. 54 / 56 / 52', '3/8" continuous threaded rod, zinc plated', ''),
    ('Beam attachments', 'ITP Fig. 61, 229, 21', 'Top beam clamp, beam clamp w/ extension, C-clamp', 'Steel structure'),
    ('Concrete anchors', 'DeWalt Hangermate+', 'Screw anchor for rod hanging, ICC-ES listed', 'Concrete slab / deck'),
    ('Pipe markers', 'Brimar System #1 / EZ markers', 'ASME A13.1-2023, legend "R-32 (A2L)"', '20 ft max'),
    ('Valve tags', 'Brimar stamped brass', '1-1/2" dia, .032" brass, chain', 'Each isolation valve'),
]

SECTIONS = [  # (divider title, contents line, [(file, label)])
    ('PIPE & FITTINGS', 'ACR copper tube, wrot copper fittings, UL 700 psig rating', [
        ('source/Streamline - Copper Tube for HVACR Applications - Submittal.pdf', None),
        ('source/Streamline - Standards - Copper Tube.pdf', None),
        ('source/Streamline - UL Recognized 700 PSI Statement.pdf', None),
        ('source/Streamline - Copper Fittings for HVACR Applications - Submittal.pdf', None)]),
    ('VALVES', 'Refrigerant ball valves with access port', [
        ('source/Mueller Refrigeration - Cyclemaster Ball Valves with Access Port.pdf', None),
        ('source/Mueller Refrigeration - Ball Valve Specifications.pdf', None),
        ('source/Mueller Refrigeration - Ball Valve UL Certification SA1392.pdf', None),
        ('source/Mueller Refrigeration - INST-003 Ball Valve Brazing Instructions.pdf', None)]),
    ('BRAZING', 'BCuP-5 brazing filler metal', [
        ('source/Lucas-Milhaupt - Sil-Fos 15 BCuP-5.pdf', None)]),
    ('INSULATION', 'Closed-cell elastomeric pipe insulation, adhesive, tape, outdoor finish', [
        ('LIB:pipe-insulation-armaflex.pdf', None)]),
    ('HANGERS & SUPPORTS', 'Strut, cushion clamps, shields, rod, nuts, washers, beam clamps, concrete anchors', [
        ('source/ITP - Volume 5 Catalog - selected pages.pdf', None),
        ('LIB:anchors.pdf', None)]),
    ('IDENTIFICATION', 'Refrigerant pipe markers and valve tags', [
        ('source/Brimar - System 1 Pipe Markers 2025.pdf', None),
        ('source/Brimar - EZ Pipe Markers 2025.pdf', None),
        ('source/Brimar - Brass Valve Tags 2025.pdf', None)]),
]

PROJECTS = os.path.join(HERE, 'projects')   # one JSON per job; see projects/_TEMPLATE.json


def load_project(path):
    import json
    with open(path) as f:
        P = json.load(f)
    P.setdefault('rev', '0'); P.setdefault('contract', '—'); P.setdefault('pm', '—'); P.setdefault('architect', '—')
    P.setdefault('spec', '23 23 00'); P.setdefault('refrig', 'R-32 (A2L)'); P.setdefault('response', [])
    P.setdefault('to', P.get('owner', '—'))
    P['out'] = os.path.join(HERE, P.get('out') or 'SUB-%s Rev %s - %s - Refrigerant Piping %s.pdf' % (
        P['no'], P['rev'], P['name'], P['refrig'].split(' ')[0]))
    return P


# ---------------------------------------------------------------- drawing helpers
cell = ParagraphStyle('c', fontName='Arial', fontSize=8, leading=9.8)
cellb = ParagraphStyle('cb', parent=cell, fontName='Arial-Bold')
note = ParagraphStyle('n', fontName='Arial', fontSize=7.3, leading=8.9)
body = ParagraphStyle('b', fontName='Arial', fontSize=10, leading=13)


def header(c, W, H, title, project, footer):
    lw = 100; lh = lw * LOGO_H / LOGO_W
    c.drawImage(LOGO, 40, H - 22 - lh, lw, lh, mask='auto')
    c.setFillColor(NAVY); c.setFont('Arial-Bold', 15); c.drawRightString(W - 40, H - 42, title)
    c.setFont('Arial', 9); c.setFillColor(colors.black)
    c.drawRightString(W - 40, H - 56, project)
    c.setStrokeColor(NAVY); c.setLineWidth(1.5); c.line(40, H - 30 - lh, W - 40, H - 30 - lh)
    c.setFont('Arial', 7.5); c.setFillColor(GREY)
    c.drawString(40, 22, 'Northern Wolves Air Conditioning  |  55 9th Street, Unit 55A-2, Brooklyn, NY 11215  |  (347) 463-9248')
    c.drawRightString(W - 40, 22, footer)
    c.setFillColor(colors.black)
    return H - 38 - lh


def place(c, flow, x, y_top, w):
    _, h = flow.wrap(w, 1000)
    flow.drawOn(c, x, y_top - h)
    return y_top - h


def grid(t, header_rows=1):
    t.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.5, LINE), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                           ('BACKGROUND', (0, 0), (-1, header_rows - 1), LIGHT),
                           ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    return t


def schedule_pages(path, project_line, footer, refrig):
    W, H = landscape(letter)
    c = canvas.Canvas(path, pagesize=(W, H))
    # page 1: pipe & fitting schedule + notes
    y = header(c, W, H, 'REFRIGERANT PIPE & FITTING SCHEDULE', project_line, footer) - 10
    hdr = [Paragraph('<b>%s</b>' % h, cellb) for h in
           ['Service', 'Size (OD)', 'Pipe', 'Fittings / Joints', 'Insulation (AP ArmaFlex)', 'Support', 'Rod',
            'Max. Spacing']]
    rows = [hdr]
    for i, (sz, pipe, ins, rod, sp) in enumerate(PIPE_ROWS):
        rows.append([Paragraph('<b>Refrigerant</b><br/>%s<br/>(700 psig)' % refrig, cell) if i == 0 else '',
                     Paragraph(sz, cell), Paragraph(pipe, cell), Paragraph(FITTING, cell), Paragraph(ins, cell),
                     Paragraph(SUPPORT, cell) if i == 0 else '', Paragraph(rod, cell), Paragraph(sp, cell)])
    t = Table(rows, colWidths=[78, 46, 108, 172, 122, 110, 30, 46])
    grid(t)
    t.setStyle(TableStyle([('SPAN', (0, 1), (0, -1)), ('SPAN', (5, 1), (5, -1)), ('VALIGN', (0, 1), (0, -1), 'MIDDLE')]))
    y = place(c, t, 40, y, W - 80) - 8
    legend = [[Paragraph('<b>ACR</b>', cell), Paragraph('Seamless copper tube for air conditioning and refrigeration '
                                                        'field service, ASTM B280, UNS C12200, cleaned and capped', cell)],
              [Paragraph('<b>Fittings</b>', cell), Paragraph('Wrought copper, ASME B16.22; long-radius elbows', cell)],
              [Paragraph('<b>Brazing</b>', cell), Paragraph('AWS A5.8 BCuP-5 (15% silver), dry-nitrogen purge', cell)]]
    lt = Table(legend, colWidths=[60, W - 140]); grid(lt, 0)
    y = place(c, lt, 40, y, W - 80) - 8
    c.setFont('Arial-Bold', 9); c.drawString(40, y - 8, 'NOTES - A2L REFRIGERANT PIPING'); y -= 14
    half = (len(NOTES) + 1) // 2
    colw = (W - 92) / 2
    yl = y; yr = y
    for i, n in enumerate(NOTES):
        p = Paragraph('%d. %s' % (i + 1, n), note)
        if i < half:
            yl = place(c, p, 40, yl, colw) - 3
        else:
            yr = place(c, p, 52 + colw, yr, colw) - 3
    c.showPage()
    # page 2: valve & accessory schedule
    y = header(c, W, H, 'REFRIGERANT VALVE & ACCESSORY SCHEDULE', project_line, footer) - 10
    c.setFont('Arial-Bold', 9); c.drawString(40, y - 8, 'VALVES - REFRIGERANT %s' % refrig); y -= 14
    rows = [[Paragraph('<b>%s</b>' % h, cellb) for h in ['Item', 'Size', 'Basis of design', 'Rating / remarks']]]
    rows += [[Paragraph(a, cell), Paragraph(b, cell), Paragraph(cc, cell), Paragraph(d, cell)] for a, b, cc, d in VALVE_ROWS]
    t = Table(rows, colWidths=[130, 90, 280, W - 580]); grid(t)
    y = place(c, t, 40, y, W - 80) - 12
    c.setFont('Arial-Bold', 9); c.drawString(40, y - 8, 'ACCESSORIES'); y -= 14
    rows = [[Paragraph('<b>%s</b>' % h, cellb) for h in ['Item', 'Basis of design', 'Description', 'Use']]]
    rows += [[Paragraph(a, cell), Paragraph(b, cell), Paragraph(cc, cell), Paragraph(d, cell)] for a, b, cc, d in ACCESSORY_ROWS]
    t = Table(rows, colWidths=[150, 190, 230, W - 650]); grid(t)
    y = place(c, t, 40, y, W - 80) - 10
    place(c, Paragraph('Product data for each item follows in the sections of this submittal. Equal products by other '
                       'manufacturers only with the same ratings and listings, subject to engineer approval.', note),
          40, y, W - 80)
    c.showPage(); c.save()


def divider(path, title, contents, project_line, footer, items):
    W, H = letter
    c = canvas.Canvas(path, pagesize=letter)
    header(c, W, H, TITLE.split(' - ')[0], project_line, footer)
    c.setFillColor(NAVY); c.rect(40, H / 2 + 10, W - 80, 70, stroke=0, fill=1)
    c.setFillColor(colors.white); c.setFont('Arial-Bold', 26); c.drawCentredString(W / 2, H / 2 + 36, title)
    c.setFillColor(colors.black); c.setFont('Arial', 11); c.drawCentredString(W / 2, H / 2 - 12, contents)
    y = H / 2 - 50
    c.setFont('Arial', 9.5)
    for it in items:
        c.drawCentredString(W / 2, y, it); y -= 14
    c.showPage(); c.save()


def cover(path, P):
    W, H = letter
    c = canvas.Canvas(path, pagesize=letter)
    lw = 150; lh = lw * LOGO_H / LOGO_W
    c.drawImage(LOGO, 48, H - 40 - lh, lw, lh, mask='auto')
    c.setFont('Arial-Bold', 22); c.drawRightString(W - 48, H - 60, 'SUBMITTAL')
    c.setFillColor(BLUE); c.setFont('Arial-Bold', 10.5); c.drawRightString(W - 48, H - 77, 'TRANSMITTAL / COVER LETTER')
    c.setFillColor(colors.black); c.setFont('Arial', 10)
    c.drawRightString(W - 48, H - 93, 'No. %s    Rev. %s    Date %s' % (P['no'], P['rev'], P['date']))
    c.setLineWidth(1); c.line(48, H - 132, W - 48, H - 132)
    y = [H - 150]

    def band(t):
        c.setFillColor(colors.HexColor('#F2F2F2')); c.rect(48, y[0] - 16, W - 96, 20, stroke=0, fill=1)
        c.setFillColor(colors.black); c.setFont('Arial-Bold', 9.5); c.drawString(56, y[0] - 10, t); y[0] -= 28

    def field(x, lab, lines, dy=None):
        c.setFont('Arial-Bold', 7); c.setFillColor(GREY); c.drawString(x, y[0], lab)
        c.setFont('Arial', 10); c.setFillColor(colors.black)
        yy = y[0] - 13
        for ln in (lines if isinstance(lines, list) else [lines]):
            c.drawString(x, yy, ln); yy -= 12.5
        return yy

    band('PROJECT')
    field(48, 'PROJECT', P['name']); field(W / 2, 'PROJECT / CONTRACT NO.', P['contract']); y[0] -= 29
    field(48, 'ADDRESS', P['address']); field(W / 2, 'OWNER / CUSTOMER', P['owner']); y[0] -= 29
    field(48, 'ARCHITECT / ENGINEER', P['architect']); field(W / 2, 'PROJECT MANAGER', P['pm'])
    y[0] -= 30
    band('TO / FROM')
    field(48, 'SUBMITTED TO', P['to']); yy = field(W / 2, 'SUBMITTED BY', P['by']); y[0] = yy - 10
    band('SUBMITTAL')
    field(48, 'TITLE / EQUIPMENT', ['Refrigerant Piping %s -' % P['refrig'], 'Pipe, Fittings, Valves & Accessories'])
    field(W / 2 - 30, 'SPEC SECTION', P['spec']); field(W - 200, 'TYPE', 'Product Data'); y[0] -= 38
    field(48, 'MANUFACTURER', 'Per schedule'); field(W / 2 - 30, 'MODEL / TAGS', 'Per schedule')
    field(W - 200, 'ACTION REQUESTED', 'For Approval'); y[0] -= 30
    if P['response']:
        band('REVISION %s - RESPONSE TO REVIEW COMMENTS' % P['rev'])
    for ln in P['response']:
        y[0] = place(c, Paragraph(ln, ParagraphStyle('r', fontName='Arial', fontSize=9.2, leading=12)), 56, y[0] + 6,
                     W - 112) - 6
    y[0] -= 4
    band('ENCLOSURES')
    encl = ['Refrigerant pipe & fitting schedule with A2L notes; valve & accessory schedule'] + \
           ['%s - %s' % (s[0].title(), s[1]) for s in SECTIONS]
    c.setFont('Arial', 8.6)
    for i, e in enumerate(encl, 1):
        c.drawString(56, y[0] + 6, '%d.  %s' % (i, e)); y[0] -= 11.5
    y[0] -= 6
    place(c, Paragraph('<i>Northern Wolves Air Conditioning has reviewed this submittal and certifies that it complies '
                       'with the contract documents, except as noted above.</i>',
                       ParagraphStyle('i', fontName='Arial', fontSize=8.5, leading=11, textColor=GREY)), 48, y[0] + 6, W - 96)
    # reviewer boxes
    bx = 52; bh = min(100, y[0] - 22 - bx)
    c.setStrokeColor(LINE); c.rect(48, bx, (W - 96) / 2 - 6, bh); c.rect(W / 2 + 6, bx, (W - 96) / 2 - 6, bh)
    c.setFont('Arial-Bold', 8); c.setFillColor(GREY)
    c.drawString(58, bx + bh - 14, 'REVIEWER ACTION'); c.drawString(W / 2 + 16, bx + bh - 14, 'REVIEWER STAMP / COMMENTS')
    c.setFont('Arial', 9.5); c.setFillColor(colors.black)
    for i, t in enumerate(['No Exceptions Taken', 'Approved as Noted', 'Revise and Resubmit', 'Rejected']):
        xx = 60 + (i // 2) * 130; yy = bx + bh - 36 - (i % 2) * 22
        c.rect(xx, yy, 8, 8); c.drawString(xx + 14, yy, t)
    c.setFont('Arial', 7.5); c.setFillColor(GREY)
    c.drawString(48, 36, 'Northern Wolves Air Conditioning  ·  New York & New Jersey  ·  SUB-%s Rev %s' % (P['no'], P['rev']))
    c.showPage(); c.save()


def build(out, P=None):
    os.makedirs(TMP, exist_ok=True)
    if P:
        project_line = '%s  |  SUB-%s Rev %s  |  %s' % (P['name'], P['no'], P['rev'], P['date'])
        footer = 'SUB-%s Rev %s' % (P['no'], P['rev'])
        refrig = P['refrig']
    else:
        project_line = 'NWAC standard submittal  |  refrigerant piping for A2L refrigerants'
        footer = 'NWAC Standard Submittal - Refrigerant Piping (A2L)'
        refrig = REFRIG
    doc = pymupdf.open()
    if P:
        cover(os.path.join(TMP, 'cover.pdf'), P); doc.insert_pdf(pymupdf.open(os.path.join(TMP, 'cover.pdf')))
    schedule_pages(os.path.join(TMP, 'sched.pdf'), project_line, footer, refrig)
    doc.insert_pdf(pymupdf.open(os.path.join(TMP, 'sched.pdf')))
    for i, (title, contents, files) in enumerate(SECTIONS):
        items = []
        for f, _ in files:
            nm = os.path.basename(f.replace('LIB:', '')).replace('.pdf', '')
            items.append({'pipe-insulation-armaflex': 'Armacell - AP ArmaFlex tube, 520 adhesive, tape, WB finish',
                          'anchors': 'DeWalt - Hangermate+ concrete screw anchors'}.get(nm, nm))
        dp = os.path.join(TMP, 'div%d.pdf' % i)
        divider(dp, title, contents, project_line, footer, items)
        doc.insert_pdf(pymupdf.open(dp))
        for f, _ in files:
            path = os.path.join(LIB, f[4:]) if f.startswith('LIB:') else os.path.join(HERE, f)
            doc.insert_pdf(pymupdf.open(path))
    doc.set_metadata({'title': (('SUB-%s Rev %s - ' % (P['no'], P['rev'])) if P else '') + TITLE,
                      'author': 'Northern Wolves Air Conditioning', 'producer': 'NWAC build_a2l_package.py'})
    doc.save(out, garbage=4, deflate=True)
    return len(doc)


if __name__ == '__main__':
    import sys, shutil
    if len(sys.argv) == 1:          # no argument: rebuild the app library template
        lib_out = os.path.join(LIB, 'refrigerant-piping-a2l-package.pdf')
        print(lib_out, build(lib_out), 'pages')
    for arg in sys.argv[1:]:        # each argument: a project JSON -> project submittal with cover
        P = load_project(arg if os.path.isabs(arg) or os.path.exists(arg) else os.path.join(PROJECTS, arg))
        print(P['out'], build(P['out'], P), 'pages')
    shutil.rmtree(TMP, ignore_errors=True)
