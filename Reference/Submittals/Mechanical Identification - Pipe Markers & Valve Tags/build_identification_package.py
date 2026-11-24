"""NWAC standard submittal - Mechanical identification: pipe markers and valve tags (ASME A13.1-2023).

Separate from the piping packages; used only when the contract documents / engineer require identification.
Data sheets are current Brimar originals (pipemarker.com, 2025) in source/.
Reuses the cover, divider and project-JSON system of the A2L refrigerant piping builder.

Run: python3 build_identification_package.py                     -> submittals-library/mechanical-identification-package.pdf
     python3 build_identification_package.py projects/<job>.json  -> project submittal with cover, in this folder
New job: copy projects/_TEMPLATE.json, fill it in, run the second command.
"""
import importlib.util
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    'nwac_base', os.path.join(HERE, '..', 'A2L Refrigerant Piping (R-32, R-454B)', 'build_a2l_package.py'))
B = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(B)
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

# (service, legend, marker type, remarks)
MARKER_ROWS = [
    ('Refrigerant - suction', 'REFRIGERANT SUCTION  R-32 (A2L)*', 'Strap-on (System #1) on insulated lines', 'Arrow; both directions where flow reverses (heat pump / VRF)'),
    ('Refrigerant - liquid', 'REFRIGERANT LIQUID  R-32 (A2L)*', 'Strap-on (System #1) on insulated lines', 'Arrow'),
    ('Refrigerant - hot gas / VRF 3-pipe', 'REFRIGERANT HOT GAS  R-32 (A2L)*', 'Strap-on (System #1)', 'Arrow'),
    ('Condensate drain', 'CONDENSATE DRAIN', 'Self-adhesive (EZ) or strap-on', 'Arrow'),
    ('Other services', 'Per legend list approved by engineer', 'Self-adhesive (EZ) or strap-on', ''),
]
TAG_ROWS = [
    ('Valve tags', 'Brimar stamped brass, 1-1/2" round, .032" brass, 3/16" hole',
     'Top line: service abbreviation (e.g. REF, CD); bottom line: valve number'),
    ('Tag fasteners', 'Brimar brass S-hook or #6 brass beaded chain', 'One per tag'),
    ('Valve chart', 'NWAC typed valve directory (number, service, location, normal position)',
     'Framed copy in the mechanical room; copy in the O&M manual'),
]
NOTES = [
    '<b>Standard:</b> ANSI / ASME A13.1-2023 "Scheme for the Identification of Piping Systems". Background and '
    'legend colors per the A13.1 fluid classification approved by the engineer (see Brimar color chart).',
    '<b>Marker size:</b> letter height and marker length per A13.1 for the outside diameter over insulation (see '
    'Brimar size chart).',
    '<b>Locations:</b> at each valve and access port, at each branch and change of direction, at each side of wall, '
    'floor and ceiling penetrations, at each piece of equipment, and at 20 ft maximum on straight runs; visible from '
    'the normal point of approach.',
    '<b>*Refrigerant legend:</b> shows the refrigerant designation used on the job (R-32 or R-454B) and "A2L".',
    '<b>Installation:</b> markers on clean, dry surfaces or over the insulation jacket; strap-on markers on insulated '
    'lines and outdoors; flow arrows point in the direction of flow.',
    '<b>Valve tags:</b> on every isolation and service valve, numbered to match the valve chart.',
]
SECTIONS = [
    ('PIPE MARKERS', 'ASME A13.1-2023 scheme, strap-on and self-adhesive markers', [
        ('source/Brimar - ASME A13.1-2023 Scheme, Colors and Marker Sizes 2025.pdf', None),
        ('source/Brimar - System 1 Pipe Markers 2025.pdf', None),
        ('source/Brimar - EZ Pipe Markers 2025.pdf', None)]),
    ('VALVE TAGS', 'Stamped brass valve tags and fasteners', [
        ('source/Brimar - Stamped Brass Valve Tags 2025.pdf', None),
        ('source/Brimar - Valve Tag Accessories 2025.pdf', None)]),
]


def schedule_pages(path, project_line, footer, refrig):
    W, H = landscape(letter)
    c = canvas.Canvas(path, pagesize=(W, H))
    y = B.header(c, W, H, 'MECHANICAL IDENTIFICATION SCHEDULE', project_line, footer) - 10
    c.setFont('Arial-Bold', 9); c.drawString(40, y - 8, 'PIPE MARKERS'); y -= 14
    rows = [[Paragraph('<b>%s</b>' % h, B.cellb) for h in ['Service', 'Legend', 'Marker type', 'Remarks']]]
    for a, b, cc, d in MARKER_ROWS:
        rows.append([Paragraph(a, B.cell), Paragraph(b.replace('R-32 (A2L)', refrig), B.cell), Paragraph(cc, B.cell),
                     Paragraph(d, B.cell)])
    t = Table(rows, colWidths=[150, 220, 180, W - 630]); B.grid(t)
    y = B.place(c, t, 40, y, W - 80) - 12
    c.setFont('Arial-Bold', 9); c.drawString(40, y - 8, 'VALVE TAGS'); y -= 14
    rows = [[Paragraph('<b>%s</b>' % h, B.cellb) for h in ['Item', 'Basis of design', 'Remarks']]]
    rows += [[Paragraph(a, B.cell), Paragraph(b, B.cell), Paragraph(d, B.cell)] for a, b, d in TAG_ROWS]
    t = Table(rows, colWidths=[150, 330, W - 560]); B.grid(t)
    y = B.place(c, t, 40, y, W - 80) - 12
    c.setFont('Arial-Bold', 9); c.drawString(40, y - 8, 'NOTES'); y -= 14
    colw = (W - 92) / 2; half = (len(NOTES) + 1) // 2; yl = yr = y
    for i, n in enumerate(NOTES):
        p = Paragraph('%d. %s' % (i + 1, n), B.note)
        if i < half:
            yl = B.place(c, p, 40, yl, colw) - 3
        else:
            yr = B.place(c, p, 52 + colw, yr, colw) - 3
    c.showPage(); c.save()


# point the shared builder at this template
B.HERE = HERE
B.TMP = os.path.join(HERE, '_pages')
B.PROJECTS = os.path.join(HERE, 'projects')
B.SECTIONS = SECTIONS
B.schedule_pages = schedule_pages
B.TITLE = 'Mechanical Identification - Pipe Markers & Valve Tags'
B.DIVIDER_HEADER = 'Mechanical Identification'
B.COVER_TITLE = lambda P: ['Mechanical Identification -', 'Pipe Markers & Valve Tags']
B.SCHEDULE_ENCL = 'Mechanical identification schedule (pipe markers, valve tags) with notes'
B.TEMPLATE_LINE = 'NWAC standard submittal  |  mechanical identification (ASME A13.1-2023)'
B.TEMPLATE_FOOTER = 'NWAC Standard Submittal - Mechanical Identification'
B.LIB_FILE = 'mechanical-identification-package.pdf'


def load_project(path):
    P = B.load_project(path)
    if 'spec' not in json.load(open(path)):
        P['spec'] = '23 05 53'
    if os.path.basename(P['out']).startswith('SUB-') and 'Refrigerant Piping' in P['out']:
        P['out'] = os.path.join(HERE, 'SUB-%s Rev %s - %s - Mechanical Identification.pdf' % (P['no'], P['rev'], P['name']))
    return P


if __name__ == '__main__':
    import sys, shutil
    if len(sys.argv) == 1:
        out = os.path.join(B.LIB, B.LIB_FILE)
        print(out, B.build(out), 'pages')
    for arg in sys.argv[1:]:
        P = load_project(arg if os.path.isabs(arg) or os.path.exists(arg) else os.path.join(B.PROJECTS, arg))
        print(P['out'], B.build(P['out'], P), 'pages')
    shutil.rmtree(B.TMP, ignore_errors=True)
