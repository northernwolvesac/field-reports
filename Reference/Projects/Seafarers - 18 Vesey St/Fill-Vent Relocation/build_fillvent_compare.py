"""Seafarers 18 Vesey St - fuel oil fill / vent: contract drawings vs RFI#26 (NWAC RFI#02) relocation to the garage.

Run: python3 build_fillvent_compare.py  ->  Fill-Vent Relocation - Contract vs RFI26.pdf
Images in img/ were cut from the IFB set (FS102, FS300) and from RFI#26_Fuel Oil Fill Location_ACE Response.pdf
(Drive 1oIC-zNhiE8JvCMF2LAN1Ee0dhOT3TDAO): page 3 1st-floor plan, page 4 ACE photo markup, page 2 RFI form.
"""
import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
                                Image)
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

S = os.path.dirname(os.path.abspath(__file__)) + "/"
I = S + "img/"
LOGO = os.path.join(S, "..", "..", "..", "..", "logo-full.png")
OUT = S + "Fill-Vent Relocation - Contract vs RFI26.pdf"
FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FD + "LiberationSans-Italic.ttf"))
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

DATE = "10/31/2026"
PW, PH = landscape(letter)
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); LIGHT = colors.HexColor("#eef3f8")
LINE = colors.HexColor("#c7ced6")
pT = ParagraphStyle("t", fontName="Arial-Bold", fontSize=15, leading=19, textColor=BLUE, spaceAfter=6)
pH = ParagraphStyle("h", fontName="Arial-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=6, spaceAfter=4)
pB = ParagraphStyle("b", fontName="Arial", fontSize=9, leading=12)
pC = ParagraphStyle("c", fontName="Arial", fontSize=8.2, leading=10.5)
pCB = ParagraphStyle("cb", parent=pC, fontName="Arial-Bold")
W = PW - 80


def page(c, doc):
    img = ImageReader(LOGO); w = 80; h = w * 1303 / 2367
    c.drawImage(img, 40, PH - 18 - h, width=w, height=h, mask="auto")
    c.setFont("Arial", 8.5)
    c.drawRightString(PW - 40, PH - 30, "Seafarers International House - 18 Vesey St - Fuel oil fill / vent location")
    c.setFillColor(GREY); c.drawRightString(PW - 40, PH - 41, DATE)
    c.setFont("Arial", 7.5)
    c.drawString(40, 20, "Northern Wolves AC - internal review - contract drawings vs RFI#26")
    c.drawRightString(PW - 40, 20, "Page %d" % doc.page); c.setFillColor(colors.black)


def tbl(rows, widths):
    rows = [[Paragraph(str(x), pCB if i == 0 or j == 0 else pC) for j, x in enumerate(r)] for i, r in enumerate(rows)]
    t = Table(rows, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                           ("BACKGROUND", (0, 0), (-1, 0), LIGHT), ("BACKGROUND", (0, 0), (0, -1), LIGHT),
                           ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    return t


def img(name, max_w, max_h):
    ir = ImageReader(I + name); iw, ih = ir.getSize()
    k = min(max_w / iw, max_h / ih)
    return Image(I + name, width=iw * k, height=ih * k)


def caption(t):
    return Paragraph(t, ParagraphStyle("cap", parent=pC, textColor=colors.HexColor("#555555"), spaceBefore=2,
                                       spaceAfter=8))


story = [
    Spacer(1, 22), Paragraph("Fuel Oil Fill / Vent - Contract Drawings vs. Now (RFI#26)", pT),
    tbl([["", "Contract drawings (IFB 1/8/2026)", "Now (RFI#26, ACE response 8/25/2026)"],
         ["Location", "Vesey St facade, 1st floor, east end of the hallway at the exterior door, \"INSTALL ABOVE "
                      "SPRINKLER CONNECTION\" (FS102). Driveway to 10 Barclay St is hatched \"NOT IN SCOPE OF WORK\".",
          "Option 2: fuel oil box on the side wall inside the garage (driveway to 10 Barclay St). "
          "ACE: \"CONFIRM OPTION 2\"."],
         ["Fill terminal", "\"2\" WALL MOUNTED FUEL PORT\" on the facade (FS300). No fill box or spill bucket detail.",
          "Fill box on the garage wall, \"approx. location 2 feet away vertically from garage door and 2 feet "
          "horizontal\", \"confirm 2 feet away from building door\"."],
         ["Vent", "4\" FOV terminates on the facade, min. 2'-0\" above the fill port, with the overfill alarm "
                  "(FS300, MC 1305.7.2).",
          "\"We need to stick out of the building\" / \"2 feet above garage door opening\": the 4\" vent runs up the "
          "outside wall and terminates 2 ft above the garage door opening, 2 ft from building openings."],
         ["Routing", "From the tank room up through the sub-cellar and cellar (own 2-hr enclosure, FS101) to the "
                     "facade. Shop drawing Rev.03 (10/13): FOF 93'-7\", FOV 95'-2\" - still to this location.",
          "Not drawn yet. Fill and vent were excluded from the 19.2 approval (10/20) and must be resubmitted at the "
          "new location."],
         ["Who asked", "-", "NWAC's RFI#02 (8/20/2026), logged by KBD as RFI#26, asked for Option 1 (sidewalk above the "
                            "cellar vault) or Option 2 (garage wall). The reason is not stated in the RFI."]],
        [80, (W - 80) / 2, (W - 80) / 2]),
    Paragraph("What changes for us (to price once the new route is drawn)", pH),
    Paragraph("1. Fill box: the contract shows a plain wall-mounted fuel port; the garage location uses a fill box with spill "
              "containment (Core RFB-5RMSS4-2, about $1,800, no PO yet). "
              "2. Vent: new exterior run up the garage / building wall to 2 ft above the garage door, with wall "
              "penetration, supports and vent head. "
              "3. Fill and vent pipe length and fittings: new route from the cellar to the garage wall vs. "
              "FOF 93'-7\" / FOV 95'-2\" to the facade. "
              "4. Redrawing and resubmittal of the fill / vent shop drawing. "
              "Note for a change order: the relocation was requested by NWAC, so the basis has to be why the contract "
              "location could not be built (field condition), not an engineer-directed change.", pB),
    PageBreak(),
    Paragraph("1. Contract drawings - FS102 1st floor (fill / vent at the Vesey St facade)", pH),
    img("contract_FS102.jpg", W, 190),
    caption("FS102, IFB 1/8/2026: \"4\" OIL VENT / 2\" OIL FILL DN TO FUEL OIL TANK ROOM\", \"OVERFILL ALARM\", "
            "\"INSTALL ABOVE SPRINKLER CONNECTION\"."),
    Paragraph("2. Contract drawings - FS300 facade detail", pH),
    img("contract_FS300.jpg", 260, 190),
    caption("FS300: \"4\" VENT FOV\" min. 2'-0\" above the \"2\" WALL MOUNTED FUEL PORT\", overfill alarm between."),
    PageBreak(),
    Paragraph("3. Now - RFI#26 (NWAC RFI#02), 1st floor plan with options and ACE response", pH),
    img("rfi26_1st_floor.jpg", W, 270),
    caption("Shop drawing FO-SC 1st floor with Option 1 (sidewalk above the cellar vault) and Option 2 (box on the garage "
            "side wall). ACE: \"We are okay with option #2 however, we need to stick out of the building because we need "
            "to be 2 ft away from building opening.\""),
    PageBreak(),
    Paragraph("4. Now - RFI form with ACE answer, and ACE photo markup of the garage entrance (RFI#26)", pH),
    Table([[img("rfi26_form.jpg", W / 2 - 10, PH - 175), img("rfi26_photo.jpg", W / 2 - 10, PH - 175)]],
          colWidths=[W / 2, W / 2]),
    caption("ACE: \"Option 2\" box on the garage wall; vent \"we need to stick out of the building\", \"2 feet above garage "
            "door opening\", \"approx. location 2 feet away vertically from garage door and 2 feet horizontal\", "
            "\"confirm 2 feet away from building door\"."),
]

doc = BaseDocTemplate(OUT, pagesize=(PW, PH), leftMargin=40, rightMargin=40, topMargin=70, bottomMargin=35,
                      title="18 Vesey St - Fuel Oil Fill / Vent - Contract vs RFI#26", author="Northern Wolves AC")
doc.addPageTemplates([PageTemplate("p", [Frame(40, 35, PW - 80, PH - 105)], onPage=page)])
doc.build(story)
print(OUT)
