"""Seafarers 18 Vesey St - NWAC RFI #04: ACE comment "oil leak detection probe cable to be provided" (submittal 230000-19.2).

Run: python3 build_rfi04.py  ->  RFI-04_Fuel_Oil_Leak_Detection_Cable.pdf
House RFI format (see Reference/Bids/2026-09 Boss Belmont Park - RFI 01/RFI Record.md): cover + one direct page.
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

S = os.path.dirname(os.path.abspath(__file__)) + "/"
LOGO = os.path.join(S, "..", "..", "..", "..", "logo-full.png")
OUT = S + "RFI-04_Fuel_Oil_Leak_Detection_Cable.pdf"
FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FD + "LiberationSans-Italic.ttf"))
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

DATE, RFI, REV = "10/30/2026", "04", "Rev. 0"
SUBJECT = "Fuel oil supply / return - oil leak detection probe cable (ACE comment on submittal 230000-19.2)"
PW, PH = letter
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); LIGHT = colors.HexColor("#eef3f8")
LINE = colors.HexColor("#c7ced6")
pT = ParagraphStyle("t", fontName="Arial-Bold", fontSize=16, leading=20, textColor=BLUE, spaceAfter=10)
pH = ParagraphStyle("h", fontName="Arial-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=10, spaceAfter=4)
pB = ParagraphStyle("b", fontName="Arial", fontSize=9, leading=12)
pC = ParagraphStyle("c", fontName="Arial", fontSize=8.2, leading=10.5)
pCB = ParagraphStyle("cb", parent=pC, fontName="Arial-Bold")


def first(c, doc):
    img = ImageReader(LOGO); w = 113; h = w * 1303 / 2367
    c.drawImage(img, 45, PH - 32 - h, width=w, height=h, mask="auto")
    c.setFont("Arial", 9); c.drawRightString(PW - 45, PH - 40, "RFI #%s %s / Date: %s" % (RFI, REV, DATE))
    foot(c, doc)


def later(c, doc):
    c.setFont("Arial", 8); c.setFillColor(GREY)
    c.drawString(45, PH - 30, "Seafarers International House - 18 Vesey St - RFI #%s %s - %s" % (RFI, REV, DATE))
    c.setFillColor(colors.black); foot(c, doc)


def foot(c, doc):
    c.setFont("Arial", 7.5); c.setFillColor(GREY)
    c.drawString(45, 25, "Northern Wolves AC - 55 9th St, 55-A2, Brooklyn, NY 11215 - (347) 463-9248")
    c.drawRightString(PW - 45, 25, "Page %d" % doc.page); c.setFillColor(colors.black)


def tbl(rows, widths, head=True, label_col=False):
    rows = [[Paragraph(str(x), pCB if (head and i == 0) or (label_col and j == 0) else pC) for j, x in enumerate(r)]
            for i, r in enumerate(rows)]
    t = Table(rows, colWidths=widths, repeatRows=1 if head else 0)
    st = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
          ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    if head:
        st.append(("BACKGROUND", (0, 0), (-1, 0), LIGHT))
    if label_col:
        st.append(("BACKGROUND", (0, 0), (0, -1), LIGHT))
    t.setStyle(TableStyle(st)); return t


W = PW - 90
story = [Spacer(1, 70), Paragraph("Request for Information", pT),
         tbl([["Project", "Seafarers International House - 18 Vesey St, New York, NY 10007 (KBD job 30-26004)"],
              ["General Contractor", "KBD Group (Kajima Building & Design Group, Inc.) - Janina Leshik, Peter Sawiris"],
              ["Engineer", "All City Engineering, P.C. (ACE)"],
              ["Architect", "Arcari + Iovino Architects PC"],
              ["RFI #", "NWAC %s, %s" % (RFI, REV)],
              ["Date", DATE],
              ["Subject", SUBJECT],
              ["Drawing No.", "FO-1 Fuel Oil Piping Layout (submittal 230000-19.2); M-101.00"]],
             [110, W - 110], head=False, label_col=True),
         Paragraph("Contents", pH),
         Paragraph("1. Question and proposed solution (page 2).", pB),
         Paragraph("Reference documents", pH),
         tbl([["Document", "Status"],
              ["Submittal 230000-19.2, FO-1 Fuel Oil Piping Layout (Rev. 02, 9/17/2026)",
               "Make Corrections Noted 10/20/2026. ACE comment: \"OIL LEAK DETECTION PROBE CABLE TO BE PROVIDED.\""],
              ["Submittal 230000-15.2, Core Engineered Solutions SBM5622 R002 (tank, pump set, controls, Brugg piping)",
               "No Exceptions Taken 6/11/2026"],
              ["M-101.00 (Rev 0, issued for bid 1/8/2026)", "Shows Brugg double-wall piping with vacuum leak monitoring"]],
             [W * 0.55, W * 0.45]),
         Paragraph("Submitted by / distribution", pH),
         Paragraph("Submitted by: Alikhan Ilyas, Northern Wolves AC - alikhan@northernwolvesac.com - (347) 463-9248<br/>"
                   "Distribution: KBD Group (Janina Leshik, Peter Sawiris); Arcari + Iovino (Chris Santos); ACE.", pB),
         PageBreak(),
         Paragraph("1. Question", pH),
         Paragraph("ACE's review of submittal 230000-19.2 (10/20/2026) requires: <i>\"Oil leak detection probe cable to be "
                   "provided.\"</i> The comment does not give a location, length or product. A leak detection cable is "
                   "not shown on the contract drawings (M-101.00 shows the Brugg vacuum leak monitoring only).", pB),
         Paragraph("Leak detection already in the approved Core package (230000-15.2)", pH),
         tbl([["Item", "Coverage"],
              ["FOC-LMS-VAC-4 vacuum leak monitor on the Brugg Flexwell-HL interstice (1\" FOS, 1-1/2\" FOR)",
               "Continuous monitoring of the full double-wall run, sub-cellar to roof. Alarms on a breach of the inner "
               "or outer wall."],
              ["00L-LS leak sensors", "Tank FOT-1 rupture basin and pump set FOP-1 containment pan"],
              ["Vent overflow sensor; generator sub-base tank leak switch", "Vent line and 200% generator tank basin"],
              ["FOC control panel with remote annunciator and Modbus to BMS", "All alarms annunciated and reported"]],
             [W * 0.5, W * 0.5]),
         Paragraph("Proposed solution", pH),
         Paragraph("The Brugg piping is continuous with no intermediate joints, and its interstice is vacuum-monitored "
                   "along its full length. The only points where oil can leave the double wall are the end fittings. "
                   "NWAC proposes one additional Core 00L-LS point leak sensor at each end-fitting location and at the "
                   "low point of the 2-hr enclosure. All are wired to the FOC panel and annunciator:", pB),
         Spacer(1, 4),
         tbl([["Location", "Device"],
              ["Sub-cellar: base of the riser enclosure, low point", "00L-LS point leak sensor"],
              ["Sub-cellar: Brugg end fittings at pump set FOP-1 outlet / return", "00L-LS point leak sensor"],
              ["Roof: Brugg end fittings at the generator sub-base tank connection", "00L-LS point leak sensor"]],
             [W * 0.65, W * 0.35]),
         Paragraph("Requested from the Engineer", pH),
         Paragraph("1. Confirm the proposed solution satisfies the comment.<br/>"
                   "2. If a continuous hydrocarbon sensing cable is still required, define the locations, the length "
                   "and the product or performance standard.<br/>"
                   "3. Leak detection beyond the approved Core package is not shown on the contract documents. Any "
                   "additional devices, wiring and cable will be priced as a change to the contract.", pB)]

doc = BaseDocTemplate(OUT, pagesize=letter, leftMargin=45, rightMargin=45, topMargin=45, bottomMargin=40,
                      title="RFI #%s - %s" % (RFI, SUBJECT), author="Northern Wolves AC")
doc.addPageTemplates([PageTemplate("first", [Frame(45, 40, PW - 90, PH - 85)], onPage=first, autoNextPageTemplate="later"),
                      PageTemplate("later", [Frame(45, 40, PW - 90, PH - 85)], onPage=later)])
doc.build(story)
print(OUT)
