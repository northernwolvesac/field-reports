"""Seafarers 18 Vesey St - NWAC RFI #04: ACE comment on submittal 230000-19.2 "oil leak detection probe cable to be provided",
answered with the Brugg FLEXWELL-HL UL 1369 listing. (The second 2-hr enclosure comment is the GC's scope - dropped 10/31.)

Run: python3 build_rfi04.py  ->  RFI-04_Fuel_Oil_Leak_Detection_Cable.pdf
House RFI format (see Reference/Bids/2026-09 Boss Belmont Park - RFI 01/RFI Record.md): cover + one direct page,
then Attachment A (Brugg data sheet, quoted lines highlighted, stamped).
"""
import os, io
import pymupdf
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
BRUGG = os.path.join(S, "..", "source", "Brugg FLEXWELL-HL Data Sheet 2025.pdf")
OUT = S + "RFI-04_Fuel_Oil_Leak_Detection_Cable.pdf"
FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FD + "LiberationSans-Italic.ttf"))
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

DATE, RFI, REV = "10/30/2026", "04", "Rev. 0"
SUBJECT = "Fuel oil supply / return (Brugg FLEXWELL-HL) - leak detection probe cable (ACE comment on submittal 230000-19.2)"
STAMP = "ATTACHMENT A - RFI #%s %s - Northern Wolves AC" % (RFI, REV)
PW, PH = letter
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); LIGHT = colors.HexColor("#eef3f8")
LINE = colors.HexColor("#c7ced6")
pT = ParagraphStyle("t", fontName="Arial-Bold", fontSize=16, leading=20, textColor=BLUE, spaceAfter=10)
pH = ParagraphStyle("h", fontName="Arial-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=9, spaceAfter=4)
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
              ["Drawing No.", "FO-1 (submittal 230000-19.2); FS101, FS300; M-101.00"]],
             [110, W - 110], head=False, label_col=True),
         Paragraph("Contents", pH),
         Paragraph("1. Question and proposed solution (page 2).<br/>"
                   "Attachment A: Brugg FLEXWELL-HL data sheet, UL 1369 leak monitoring line highlighted (pages 3-4).", pB),
         Paragraph("Reference documents", pH),
         tbl([["Document", "Status"],
              ["Submittal 230000-19.2, FO-1 Fuel Oil Piping Layout (Rev. 02, 9/17/2026)",
               "Make Corrections Noted 10/20/2026"],
              ["Submittal 230000-15.2, Core Engineered Solutions SBM5622 R002 (tank, pump set, controls, Brugg piping, "
               "vacuum leak monitor)", "No Exceptions Taken 6/11/2026"],
              ["Brugg FLEXWELL-HL data sheet (UL 1369 \"Severe\", above ground)", "Attachment A"],
              ["FS101-FS105, FS300, M-101.00 (Rev 0, issued for bid 1/8/2026)",
               "Brugg double-wall piping with vacuum leak panel"]],
             [W * 0.55, W * 0.45]),
         Paragraph("Submitted by / distribution", pH),
         Paragraph("Submitted by: Alikhan Ilyas, Northern Wolves AC - alikhan@northernwolvesac.com - (347) 463-9248<br/>"
                   "Distribution: KBD Group (Janina Leshik, Peter Sawiris); Arcari + Iovino (Chris Santos); ACE.", pB),
         PageBreak(),
         Paragraph("1. Question", pH),
         Paragraph("ACE's review of submittal 230000-19.2 (10/20/2026) added a requirement to the 1\" FOS / 1-1/2\" FOR "
                   "Brugg FLEXWELL-HL piping from the sub-cellar to the roof generator:", pB),
         Spacer(1, 3),
         tbl([["ACE comment", "Contract documents"],
              ["\"Oil leak detection probe cable to be provided.\" (no location, length or product given)",
               "Not shown on any sheet. FS101 / FS300 show the \"BRUGG VACUUM SYSTEM\" / \"BRUGG VACUUM LEAK PANEL\" only."]],
             [W * 0.5, W * 0.5]),
         Paragraph("Brugg FLEXWELL-HL listing (Attachment A)", pH),
         tbl([["Data sheet", "Bearing on the comment"],
              ["\"No requirement for constant leak monitoring per UL 1369 for BRUGG FLEXWELL-HL.\"",
               "The listing does not require monitoring. The project still adds continuous vacuum monitoring "
               "(Core FOC-LMS-VAC-4) of the full interstice, with leak sensors at the tank basin and pump skid."],
              ["Continuous lengths, no intermediate joints; closed mechanical end fittings",
               "The only points where oil can leave the double wall are the two end fittings."]],
             [W * 0.45, W * 0.55]),
         Paragraph("Proposed solution", pH),
         Paragraph("No probe cable. Keep the approved vacuum monitoring and add one Core 00L-LS point leak sensor at each "
                   "Brugg end-fitting location (sub-cellar at pump set FOP-1, roof at the generator tank connection), "
                   "wired to the FOC panel and annunciator.", pB),
         Paragraph("Requested from the Engineer", pH),
         Paragraph("1. Confirm the proposed solution.<br/>"
                   "2. If a probe cable is still required, identify the code section that requires it for UL 1369 listed "
                   "piping, and define the locations, length and product. It is not shown on the contract documents; "
                   "the added work will be priced as a change to the contract.", pB)]


def build_cover():
    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=letter, leftMargin=45, rightMargin=45, topMargin=45, bottomMargin=40,
                          title="RFI #%s - %s" % (RFI, SUBJECT), author="Northern Wolves AC")
    doc.addPageTemplates([PageTemplate("first", [Frame(45, 40, PW - 90, PH - 85)], onPage=first,
                                       autoNextPageTemplate="later"),
                          PageTemplate("later", [Frame(45, 40, PW - 90, PH - 85)], onPage=later)])
    doc.build(story)
    return pymupdf.open("pdf", buf.getvalue())


def attachment():
    a = pymupdf.open(BRUGG)
    for q in ["No requirement for constant leak", "monitoring per UL 1369 for BRUGG", "FLEXWELL®-HL."]:
        for r in a[0].search_for(q):
            if r.y0 > 625 and r.x0 > 400:   # only the leak monitoring statement, bottom right of page 1
                a[0].add_highlight_annot(r)
    for p in a:
        p.insert_text((36, 24), STAMP, fontsize=9, fontname="helv", color=(0.82, 0.1, 0.1))
    return a


out = build_cover()
out.insert_pdf(attachment())
out.set_metadata({"title": "RFI #%s - %s" % (RFI, SUBJECT), "author": "Northern Wolves AC"})
out.save(OUT, garbage=3, deflate=True)
print(OUT, out.page_count)
