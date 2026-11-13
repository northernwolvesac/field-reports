"""India Home Senior Housing, Site 1 (170-11 89th Avenue) - Mechanical Value Engineering Proposals for Procida.

No pricing (deducts to follow once items are selected), screenshots for every VE item.
Run: python3 crops.py && python3 build_ve_proposals.py
Screenshots come from the Altera mechanical pricing set dated 07.31.2026 (crops.py).
Reference quote: 3838 (8/30/2026) to Procida Construction.
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
                                Image, KeepTogether, CondPageBreak)
from reportlab.lib.styles import ParagraphStyle

S = os.path.dirname(os.path.abspath(__file__)) + "/"
LOGO = os.path.join(S, "..", "..", "..", "logo-full.png")
OUT = S + "VE Proposals - India Home Site 1 - 170-11 89th Ave.pdf"
IMG = S + "img/"

FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FD + "LiberationSans-Italic.ttf"))
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

PW, PH = letter
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); LIGHT = colors.HexColor("#eef3f8")
LINE = colors.HexColor("#c7ced6")
REV, DATE, QUOTE = "Rev 0", "11/13/2026", "3838"

VE = [
  dict(no="VE-01", title="Apartment exhaust: one exhaust riser per shaft (kitchen and bath combined)",
       area="Floors 2 to 9, shaft stacks 1 to 5; roof ERV-1 and ERV-2",
       designed=[
         "Each of the 5 shaft stacks carries 3 risers: OA (supply), KX (kitchen exhaust) and TX (toilet exhaust), "
         "15 risers from the 2nd floor to the roof ERV-1 / ERV-2",
         "Kitchen exhaust KG-1 on ZRT-1 (35/110 CFM) to the KX riser; bath exhaust CVEG (25 CFM) to the TX riser",
       ],
       proposed=[
         "Kitchen and bath exhaust branches of each apartment connect to one exhaust riser per stack, sized for the "
         "combined airflow: 5 exhaust risers in lieu of 10",
         "Same ERVs, grilles and regulators; KG-1 kitchen grilles with washable grease filters",
         "One exhaust connection per stack at the roof",
       ],
       benefits="5 fewer full-height risers (2nd floor to roof), fewer roof penetrations and ERV connections, smaller "
                "shafts (floor area may be returned to the apartments).",
       needs="Altera Engineering (riser sizing, ERV exhaust); RKTB (shaft sizes).",
       kw="None",
       imgs=[("m103_units", "M-103.00 Typical 3rd to 5th floor - OA / KX / TX risers at stack 1, ZRT-1 / ZRT-2 regulators"),
             ("m108_ervs", "M-108.00 Roof - ERV-1 and ERV-2")]),
  dict(no="VE-02", title="Apartment supply: constant-airflow regulators in lieu of two-position regulators",
       area="All apartments, floors 2 to 9 (53 ZRT-2 supply regulators)",
       designed=[
         "Each apartment has two two-position regulators: ZRT-1 on kitchen exhaust (35/110 CFM) and ZRT-2 on supply "
         "SG-1 (60/135 CFM), with boost control and wiring; 106 regulators in total",
       ],
       proposed=[
         "Replace the 53 ZRT-2 supply regulators with passive constant-airflow regulators set to 60 CFM: no motor, "
         "no wiring, no controls",
         "Keep ZRT-1 with kitchen boost. During boost the apartment runs slightly exhaust-heavy for the boost period",
       ],
       benefits="53 fewer motorized regulators with their control wiring and boost interlocks; simpler balancing; "
                "nothing to maintain on the supply side.",
       needs="Altera Engineering; energy / Passive House consultant if the project is certified (ventilation balance "
             "during boost).",
       kw="Deletes 53 regulator power / control connections",
       imgs=[("m103_shafts", "M-103.00 Typical floor - SG-1 supply on ZRT-2 (60/135) and KG-1 kitchen exhaust on "
                             "ZRT-1 (35/110) in each apartment")]),
  dict(no="VE-03", title="1st floor VRF: heat pump system in lieu of heat recovery",
       area="1st floor common areas (ACCU-1.1, ACCU-1.2, HRU-1, AC-1.1 to AC-1.5)",
       designed=[
         "VRF heat recovery system: outdoor units ACCU-1.1 / ACCU-1.2 with heat recovery unit HRU-1 and 3-pipe "
         "refrigerant piping to the ducted indoor units AC-1.1 to AC-1.5",
       ],
       proposed=[
         "VRF heat pump system (2-pipe), no heat recovery unit; same indoor units, ductwork and air outlets",
         "The areas served are open, connected common spaces that do not need heating and cooling at the same time",
       ],
       benefits="Deletes HRU-1, the third refrigerant pipe with its insulation and the heat recovery controls; "
                "simpler service.",
       needs="Altera Engineering (zoning and load check); owner.",
       kw="None",
       imgs=[("m101_vrf", "M-101.00 1st floor - ACCU-1.1 / ACCU-1.2, HRU-1 and ducted indoor units")]),
  dict(no="VE-04", title="Linear slot diffusers: standard ceiling diffusers",
       area="1st and 2nd floor common areas (LDS / LDR)",
       designed=[
         "Linear slot supply diffusers 4'-0\" and 5'-0\" LDS (about 16), 6'-0\" LDR returns (5) and a 12'-0\" return "
         "linear diffuser, with plenums",
       ],
       proposed=[
         "Standard louvered ceiling diffusers and return grilles at the same airflows; sidewall grilles where the "
         "architect prefers",
       ],
       benefits="Lower-cost air outlets, no plenums, faster installation and balancing.",
       needs="RKTB (ceiling design); Altera Engineering (throw at the glazing).",
       kw="None",
       imgs=[("m101_lds", "M-101.00 1st floor - 5'-0\" LDS along the storefront on AC-1.5")]),
  dict(no="VE-05", title="PTHP condensate drains: delete heat tracing; plastic drain piping where permitted",
       area="Apartment PTHP-1 / PTHP-2, floors 2 to 9; 2nd floor exposed drain drops",
       designed=[
         "1-1/4\" condensate drain at each PTHP; at the 2nd floor the drain drops run in an exposed location with "
         "electric heat tracing",
       ],
       proposed=[
         "Route the 2nd floor drain drops inside the heated building envelope: no heat tracing",
         "PVC / CPVC condensate piping where permitted by the NYC Mechanical Code and the specification, if copper "
         "is specified",
       ],
       benefits="Deletes the heat tracing with its circuits and controls (electrical scope); lower material cost.",
       needs="Altera Engineering; RKTB (chase locations).",
       kw="Deletes the heat tracing circuits",
       imgs=[("m102_tracing", "M-102.00 2nd floor - 1-1/4\" CD drops with electric heat tracing")]),
  dict(no="VE-06", title="Laundry: ventless heat-pump dryers (owner option)",
       area="Laundry room; (4) 4\" dryer exhaust ducts to the roof",
       designed=["Four separate 4\" dryer exhaust ducts from the laundry room, terminated 2 ft above the roof"],
       proposed=[
         "Owner-furnished ventless heat-pump dryers: delete the four dryer exhaust ducts, roof penetrations and "
         "terminations",
       ],
       benefits="No dryer duct cleaning or lint build-up in the risers; fewer roof penetrations; no conditioned air "
                "exhausted by the dryers.",
       needs="Owner (laundry equipment); RKTB; condensate drain by plumbing.",
       kw="Dryer circuits per the selected dryers (EE)",
       imgs=[("m108_ervs", "M-108.00 Roof - (4) 4\" dryer exhaust terminations next to ERV-1 / ERV-2")]),
  dict(no="VE-07", title="Cellar service rooms: ventilation in lieu of split AC where the load allows",
       area="Cellar - AC-COMP and AC-EMR rooms (AC-TEL kept)",
       designed=["Ductless split AC units AC-COMP, AC-EMR and AC-TEL in the cellar service rooms"],
       proposed=[
         "AC-COMP: if the room is the compactor / trash room, delete the AC; the room is exhausted",
         "AC-EMR: thermostat-controlled exhaust with transfer / make-up air if the electrical heat load allows",
         "Telecom room AC-TEL kept as designed",
       ],
       benefits="Up to 2 fewer split systems with their refrigerant piping and condensate drains.",
       needs="Altera Engineering (room use and heat loads); EE.",
       kw="Smaller connected load",
       imgs=[("m100_rooms", "M-100.00 Cellar - ERV-C, AC-C.1 / AC-C.2, AC-COMP and AC-EMR")]),
  dict(no="VE-08", title="Cellar and 1st floor ventilation: one ERV in lieu of two",
       area="ERV-C (cellar) and ERV-CF (1st floor)",
       designed=[
         "ERV-C in the cellar, ducted up through the slab ((2) 10x10 with 3-hour FD/AD) to the 1st floor louvers "
         "beside ERV-CF",
         "ERV-CF on the 1st floor with its own 36\"x18\" outdoor air and exhaust louvers",
       ],
       proposed=[
         "One ERV on the 1st floor sized for both floors, with branch ducts down to the cellar; one set of louvers "
         "and dampers. The 3-hour FD/AD at the slab stay",
       ],
       benefits="One ERV fewer, with its controls, power connection and duct connections.",
       needs="Altera Engineering (airflow, fire separation); owner, if the cellar and 1st floor are separate tenants.",
       kw="One unit fewer",
       imgs=[("m101_ervcf", "M-101.00 1st floor - ERV-CF and the (2) 10x10 ducts down to ERV-C"),
             ("m100_rooms", "M-100.00 Cellar - ERV-C with (2) 3-hour FD/AD at the slab")]),
]

GAPS = [
  "The pricing set has floor plans only (M-100 to M-109): no equipment schedules, details, riser diagrams or "
  "specification. Quote 3838 used allowance equipment per Procida's direction of 8/28/2026.",
  "Tag ERV-2 is used for two units (M-102 2nd floor and M-108 roof); tag ACCU-1.2 appears twice on M-101.",
  "Use of the room served by AC-COMP.",
  "Fire dampers at the apartment branches into the OA / KX / TX shafts are not shown on the typical floors. "
  "For the exhaust shafts we propose steel subducts extending 22\" up the shaft with continuous exhaust "
  "(NYC Mechanical Code 607.5.5 exception) in lieu of fire dampers; supply shaft per the engineer.",
  "Is the project Passive House / NYSERDA certified? This affects VE-01 and VE-02.",
]

NOTES = [
  "Deduct amounts will be provided for the VE items selected by Procida and the owner.",
  "Cut sheets will be provided with the pricing for the items that change equipment.",
  "VE items require the approval of the engineer of record; redesign, revised drawings and any DOB amendment by others.",
  "Site 2, 150-05 88th Avenue (Quote 3839), uses the same systems; the same items are expected to apply there. "
  "A separate review will follow on receipt of the Site 2 drawings.",
]

pB = ParagraphStyle("b", fontName="Arial", fontSize=9.5, leading=12)
pS = ParagraphStyle("s", fontName="Arial", fontSize=8.5, leading=10.5)
pBul = ParagraphStyle("bul", parent=pS, leftIndent=10, bulletIndent=0)
pCap = ParagraphStyle("cap", fontName="Arial-Italic", fontSize=7.5, leading=9, textColor=colors.HexColor("#555555"))
pH = ParagraphStyle("h", fontName="Arial-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=6, spaceAfter=4)
pT = ParagraphStyle("t", fontName="Arial-Bold", fontSize=11, leading=14, textColor=BLUE)
pL = ParagraphStyle("l", fontName="Arial-Bold", fontSize=8.5, leading=10.5, spaceBefore=4)


def first_page(c, doc):
    img = ImageReader(LOGO); w = 113; h = w * 1303 / 2367
    c.drawImage(img, 45, PH - 32 - h, width=w, height=h, mask="auto")
    c.setFont("Arial", 9)
    c.drawRightString(PW - 45, PH - 40, "Ref. Quote: %s / Date: %s / %s" % (QUOTE, DATE, REV))
    y = PH - 118
    for line in ["Northern Wolves AC", "55 9th St, 55-A2", "Brooklyn, NY", "11215, US", "(347) 463-9248", "",
                 "Prepared By:", "Alikhan Ilyas", "(347) 463-9248", "alikhan@northernwolvesac.com"]:
        c.drawString(45, y, line); y -= 10.5
    c.setFont("Arial", 8); c.setFillColor(GREY); c.drawRightString(PW - 45, PH - 118, "Customer")
    c.setFont("Arial", 9); c.setFillColor(colors.black)
    c.drawRightString(PW - 45, PH - 128, "Procida Construction Corp.")
    c.drawRightString(PW - 45, PH - 138.5, "Attn: Richard Jinks")
    footer(c, doc)


def later_pages(c, doc):
    c.setFont("Arial", 8); c.setFillColor(GREY)
    c.drawString(45, PH - 30, "India Home Site 1 - Mechanical Value Engineering Proposals %s - %s" % (REV, DATE))
    c.setFillColor(colors.black)
    footer(c, doc)


def footer(c, doc):
    c.setFont("Arial", 7.5); c.setFillColor(GREY)
    c.drawRightString(PW - 45, 25, "Page %d" % doc.page)
    c.drawString(45, 25, "Screenshots: Altera Engineering mechanical pricing set dated 07.31.2026. Deduct pricing to follow.")
    c.setFillColor(colors.black)


def pic(name, cap, maxw=PW - 90, maxh=235):
    ir = ImageReader(IMG + name + ".png"); iw, ih = ir.getSize()
    sc = min(maxw / iw, maxh / ih)
    im = Image(IMG + name + ".png", width=iw * sc, height=ih * sc)
    t = Table([[im], [Paragraph(cap, pCap)]], colWidths=[maxw])
    t.setStyle(TableStyle([("BOX", (0, 0), (0, 0), 0.5, LINE), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                           ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    return t


def bullets(items):
    return [Paragraph(t, pBul, bulletText="▪") for t in items]


doc = BaseDocTemplate(OUT, pagesize=letter, leftMargin=45, rightMargin=45, topMargin=45, bottomMargin=40,
                      title="India Home Site 1 - Mechanical VE Proposals", author="Northern Wolves AC")
doc.addPageTemplates([
    PageTemplate("first", [Frame(45, 40, PW - 90, PH - 278, id="f1")], onPage=first_page, autoNextPageTemplate="later"),
    PageTemplate("later", [Frame(45, 40, PW - 90, PH - 85, id="f2")], onPage=later_pages)])

st = [Paragraph('Project: <b>India Home Senior Housing - Site 1</b>', pB), Spacer(1, 3),
      Paragraph('Address: <b>170-11 89th Avenue, Jamaica, Queens, NY</b>', pB), Spacer(1, 3),
      Paragraph('<b>Mechanical drawings dated: 07.31.2026 (pricing set, M-100.00 to M-109.00)</b>', pB),
      Paragraph("Mechanical Value Engineering Proposals", pH),
      Paragraph("At the owner's request, Northern Wolves reviewed the mechanical pricing set and proposes the value "
                "engineering items below. The apartments are designed with through-wall PTHPs and central roof ERVs "
                "with shaft risers and two-position airflow regulators in every apartment; the common areas use VRF "
                "and split systems with separate ERVs. The largest savings are in the apartment ventilation, which "
                "repeats on every floor (VE-01 and VE-02). Each item can be accepted on its own. Deduct pricing will "
                "follow once Procida and the owner select the items to pursue.", pS), Spacer(1, 6)]

rows = [["VE", "Item", "Area", "Approvals"]]
for v in VE:
    rows.append([v["no"], Paragraph(v["title"], pS), Paragraph(v["area"], pS), Paragraph(v["needs"], pS)])
t = Table(rows, colWidths=[38, 190, 160, 134], repeatRows=1)
t.setStyle(TableStyle([("FONT", (0, 0), (-1, 0), "Arial-Bold", 8.5), ("FONT", (0, 1), (0, -1), "Arial-Bold", 8.5),
                       ("BACKGROUND", (0, 0), (-1, 0), LIGHT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                       ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                       ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
st += [t, Spacer(1, 6), Paragraph("Notes", pL)] + bullets(NOTES)

for v in VE:
    st.append(CondPageBreak(260))
    head = [Spacer(1, 10), Paragraph("%s  %s" % (v["no"], v["title"]), pT),
            Paragraph("<b>Area:</b> %s" % v["area"], pS),
            Paragraph("As designed", pL)] + bullets(v["designed"]) + [Paragraph("Proposed", pL)] + bullets(v["proposed"])
    st.append(KeepTogether(head))
    st += [Paragraph("<b>Benefits:</b> " + v["benefits"], pS),
           Paragraph("<b>Electrical impact:</b> " + v["kw"], pS),
           Paragraph("<b>Approvals / coordination:</b> " + v["needs"], pS), Spacer(1, 4)]
    for name, cap in v["imgs"]:
        st += [pic(name, cap), Spacer(1, 6)]

st.append(CondPageBreak(170))
st.append(Paragraph("Coordination items found during the review (RFI to follow)", pH))
st += bullets(GAPS)

doc.build(st)
print(OUT)
