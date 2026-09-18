from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

import os
S = os.path.dirname(os.path.abspath(__file__)) + "/"
LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "logo-full.png")
PROJECT = "225-233 Park Ave South - Multi-Floor TI & Demolition"
OUT = S + "bid.(%s).pdf" % PROJECT

FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))

PW, PH = letter
LX = 45          # company block / bullets column
TX = 42          # section text x
BX = 72          # bullet text x
RX = PW - 45
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); SIG = colors.HexColor("#6a767c")
BLACK = colors.black

QUOTE = "3127"
DATE = "9/18/2026"
CUSTOMER = "Clune Construction"
PREPARED = ["Prepared By:", "Alikhan Ilyas", "(347) 463-9248", "alikhan@northernwolvesac.com"]

SCOPE = [
  ("10th Floor - HVAC make-safe for demolition (M-910, dated 07.26.2026)", [
    "Coordinate condenser water shutdown and drain-down with building management",
    "Cut and cap CWS/R at riser valves in MER; drain floor condenser water piping",
    "Refrigerant recovery from AC-10-1, AC-10-2, AC-10-3, AC-10-4 with documentation",
    "Disconnect and cap condenser water and condensate piping at AC units",
    "Disconnect standalone controls and thermostats at AC units, VAV boxes and EF-10-2",
    "Cut and cap toilet exhaust duct at riser; cut OA duct at louver, cover louver with R-21 board",
    "Cap open duct and pipe ends; leave equipment in place, safe for removal by demolition contractor",
  ]),
  ("10th Floor MER - new mechanical work (M-110, M-601, M-701, IFC dated 08.31.2026)", [
    "Install AC-10-1 and AC-10-2 (units furnished by others) on spring isolators; rig by freight elevator",
    "Furnish and install 3\" CWS/R from existing 4\" riser valves with piping trim per M-701",
    "Furnish and install 1-1/2\" condensate drain to existing floor drain",
    "Furnish and install welded lined supply plenums, 62x20 supply duct and fire dampers to MER wall, capped",
    "Furnish and install OAF-10-1, EDH-10-1, 30x12 OA duct with damper, louver and plenum box",
    "Furnish and install GXF-10-1, 22x12 exhaust duct with damper, louver and plenum box",
    "Cut 62x20 and 30x12 openings at MER wall; fire stop and seal penetrations",
    "Duct and pipe insulation, labeling, hangers and supports",
    "Standalone controls and standalone leak detectors with local alarm; install BMS-furnished devices",
    "Furnish disconnect switches for AC units (installed by EC)",
    "Pressure test, start-up, 3rd party air and water balancing with reports",
    "Submittals, shop drawings and close-out documents",
  ]),
  ("11th Floor - HVAC make-safe for demolition (M-911, dated 07.27.2026)", [
    "Coordinate condenser water shutdown and drain-down with building management",
    "Cut and cap CWS/R at riser valves in MER; drain floor condenser water piping",
    "Refrigerant recovery from AC-11-1, AC-11-2, AC-11-3 with documentation",
    "Disconnect and cap condenser water and condensate piping at AC units",
    "Disconnect standalone controls and thermostats at AC units and VAV boxes",
    "Cut and cap toilet exhaust duct at riser; disconnect OA duct at louver, cover louver with R-21 board",
    "Cap open duct and pipe ends; leave equipment in place, safe for removal by demolition contractor",
  ]),
  ("11th Floor MER - new mechanical work (M-111, M-601, M-701, IFC dated 08.31.2026)", [
    "Install AC-11-1 and AC-11-2 (units furnished by others) on spring isolators; rig by freight elevator",
    "Furnish and install 3\" CWS/R from existing 4\" riser valves with piping trim per M-701",
    "Furnish and install 1-1/2\" condensate drain to existing floor drain",
    "Furnish and install welded lined supply plenums, 62x20 supply duct and fire dampers to MER wall, capped",
    "Furnish and install OAF-11-1, EDH-11-1, 30x12 OA duct with damper, louver and plenum box",
    "Furnish and install GXF-11-1, 22x12 exhaust duct with damper, louver and plenum box",
    "Cut 62x20 and 30x12 openings at MER wall; fire stop and seal penetrations",
    "Duct and pipe insulation, labeling, hangers and supports",
    "Standalone controls and standalone leak detectors with local alarm; install BMS-furnished devices",
    "Furnish disconnect switches for AC units (installed by EC)",
    "Pressure test, start-up, 3rd party air and water balancing with reports",
    "Submittals, shop drawings and close-out documents",
  ]),
  ("12th Floor - HVAC make-safe for demolition (M-912, dated 07.27.2026)", [
    "Coordinate condenser water shutdown and drain-down with building management",
    "Cut and cap condenser water branches to supplemental units at riser valves in MER",
    "Refrigerant recovery from AC-1, AC-2, FCU-X-1 with documentation",
    "Disconnect and cap condenser water and condensate piping at units",
    "Cut and cap base building supply duct at MER demising wall; AC-12-1 remains in service",
    "Disconnect EF-12-1 and EF-12-2; cut and cap exhaust ducts at louvers, cover louvers with R-21 board",
    "Disconnect standalone controls and thermostats; leave equipment in place, safe for removal by demolition contractor",
  ]),
  ("General", [
    "Provide 1 year Labor Warranty",
  ]),
]

NOTES = [
  "Deposit of 30% required.",
  "Demolition scope is make-safe only: removal, rigging out and disposal of existing equipment, ductwork and piping by demolition contractor.",
  "Trane AC units for 10th and 11th floor MER furnished by others; installation only. If units must be received and stored outside the project, additional cost will be provided separately.",
  "Controls: standalone controls and standalone leak detectors only, no interlocks to BMS. BMS controls, control valves, sensors, actuators and BMS leak detectors furnished by BMS company; installed by Northern Wolves; wiring and programming by BMS company.",
  "Duct smoke detectors furnished and wired by others. Northern Wolves assists with mounting to ductwork; our technician will be present during wiring termination to the unit and testing.",
  "Condenser water shutdown and cut and cap work is priced for one after-hours shutdown per floor.",
]

EXCLUSIONS = [
  "BMS controls removal or disconnects; standalone controls only",
  "BMS controls, valves, sensors, actuators, wiring and programming",
  "Duct smoke detectors and fire alarm work",
  "Electrical power wiring, starters and disconnect installation",
  "11th floor lot line wall opening: no HVAC work; structural, architectural and fire alarm by others",
  "Overtime except as noted",
  "Scaffolding with permits; crane and street hoisting",
  "Fire Stop other than our own penetrations",
  "Cutting and patching roof, structural walls, floors; patching and painting of MER wall openings",
  "Roof dunnage/steel/iron beams for outdoor equipment.",
  "Structural work",
  "Permits and fees; DOB filing; special inspections",
  "Bond",
  "Gas Piping, Gas Meter.",
  "Plumbing and floor drains",
  "Asbestos or hazardous material abatement",
  "Warranty for existing equipment",
  "Core Drilling",
]

TERMS = ("Northern Wolves Inc provides one year warranty for the system it will install. In case of technical fault after "
         "one year all the repairing cost will be additional. The firm will not be responsible for the warranty claim if the "
         "system is externally damaged by any means. Firm only caters the internal design faults.")

PRICES = [
  ("10th Floor - HVAC make-safe for demolition", "$18,000.00"),
  ("10th Floor MER - new mechanical work", "$114,000.00"),
  ("11th Floor - HVAC make-safe for demolition", "$18,000.00"),
  ("11th Floor MER - new mechanical work", "$114,000.00"),
  ("12th Floor - HVAC make-safe for demolition", "$14,000.00"),
]
TOTAL = "$278,000.00"

pB = ParagraphStyle("b", fontName="Arial", fontSize=10.5, leading=12, textColor=BLACK)
pBB = ParagraphStyle("bb", fontName="Arial-Bold", fontSize=10.5, leading=12, textColor=BLACK)


class Doc:
    def __init__(self):
        self.c = canvas.Canvas(OUT, pagesize=letter)
        self.c.setTitle(PROJECT); self.c.setAuthor("Northern Wolves AC")
        self.y = PH - 28

    def need(self, h):
        if self.y - h < 40:
            self.c.showPage(); self.y = PH - 28

    def head(self, t):
        self.need(30)
        self.y -= 10
        self.c.setFont("Arial-Bold", 10.5); self.c.setFillColor(BLUE)
        self.c.drawString(TX, self.y - 9, t); self.y -= 24
        self.c.setFillColor(BLACK)

    def sub(self, t):
        self.need(26)
        self.c.setFont("Arial-Bold", 10.5); self.c.setFillColor(BLACK)
        self.c.drawString(BX, self.y - 9, t); self.y -= 14

    def bullet(self, t, bold=False):
        p = Paragraph(t, pBB if bold else pB)
        _, h = p.wrap(RX - BX, 200)
        self.need(h + 1)
        p.drawOn(self.c, BX, self.y - h)
        self.c.setFillColor(BLACK); self.c.rect(61, self.y - 8, 3, 3, fill=1, stroke=0)
        self.y -= h

    def bullets(self, items, bold=False):
        for t in items: self.bullet(t, bold)

    def header(self):
        c = self.c
        img = ImageReader(LOGO); w = 113; h = w * 1303 / 2367
        c.drawImage(img, 45, PH - 32 - h, width=w, height=h, mask="auto")
        c.setFont("Arial", 9); c.setFillColor(BLACK)
        c.drawRightString(RX, PH - 40, "Quote: %s / Date: %s" % (QUOTE, DATE))
        y = PH - 118
        for line in ["Northern Wolves AC", "55 9th St, 55-A2", "Brooklyn, NY", "11215, US", "(347) 463-9248"]:
            c.drawString(LX, y, line); y -= 10.5
        y -= 12
        for line in PREPARED:
            c.drawString(LX, y, line); y -= 10.5
        c.setFont("Arial", 8); c.setFillColor(GREY); c.drawRightString(RX, PH - 118, "Customer")
        c.setFont("Arial", 9); c.setFillColor(BLACK); c.drawRightString(RX, PH - 128, CUSTOMER)
        self.y = PH - 275
        c.setFont("Arial", 10.5); c.drawString(TX, self.y, "Project: ")
        c.setFont("Arial-Bold", 10.5); c.drawString(TX + c.stringWidth("Project: ", "Arial", 10.5), self.y,
                                                    "225-233 Park Ave South - Multiple Floors Tenant Improvement & Demolition")
        self.y -= 23
        c.setFont("Arial", 10.5); c.drawString(TX, self.y, "Address: ")
        c.setFont("Arial-Bold", 10.5); c.drawString(TX + c.stringWidth("Address: ", "Arial", 10.5), self.y,
                                                    "225-233 Park Ave South, New York, NY 10003")
        self.y -= 23
        c.setFont("Arial-Bold", 10.5)
        c.drawString(TX, self.y, "Mechanical drawings dated: 07.26.2026, 07.27.2026 (demolition), 08.31.2026 (MER IFC)")
        self.y -= 14

    def price_block(self):
        self.need(120)
        self.y -= 16
        bw, bh = 316, 60
        c = self.c
        c.setStrokeColor(BLACK); c.setLineWidth(1.5)
        c.rect(53, self.y - bh, bw, bh)
        c.setFont("Arial", 18); c.setFillColor(BLACK)
        c.drawCentredString(53 + bw / 2, self.y - 30, TOTAL)
        c.setFont("Arial-Bold", 11)
        c.drawCentredString(53 + bw / 2, self.y - 50, "TOTAL FOR ALL 5 PACKAGES")
        # signature
        c.setFont("Arial", 9); c.setFillColor(SIG)
        c.drawString(402, self.y - 8, "Accepted By"); c.drawString(538, self.y - 8, "Date")
        c.setFillColor(BLACK)
        for x in range(402, 490, 3): c.rect(x, self.y - 58, 1, 2, fill=1, stroke=0)
        for x in range(538, 568, 3): c.rect(x, self.y - 58, 1, 2, fill=1, stroke=0)
        self.y -= bh + 10


d = Doc()
d.header()
d.head("Scope of Work")
for title, items in SCOPE:
    d.sub(title)
    d.bullets(items)
    d.y -= 6
d.head("Exclusions / Notes")
d.bullets(NOTES, bold=True)
d.y -= 4
d.bullets(EXCLUSIONS, bold=True)
d.head("Terms")
p = Paragraph(TERMS, pB); _, h = p.wrap(RX - BX, 200); d.need(h); p.drawOn(d.c, BX, d.y - h); d.y -= h
d.head("Price Breakdown")
for label, amt in PRICES:
    d.need(14)
    d.c.setFont("Arial-Bold", 10.5); d.c.setFillColor(BLACK)
    d.c.rect(61, d.y - 8, 3, 3, fill=1, stroke=0)
    d.c.drawString(BX, d.y - 9, label); d.c.drawRightString(RX, d.y - 9, amt); d.y -= 12
d.price_block()
d.c.save()
print(OUT)
